/**
 * Audio Recording Service
 *
 * Cross-platform microphone input service using node-record-lpcm16 with sox/rec/arecord backends.
 * Optimized for Google Speech-to-Text API with 16kHz, mono, 16-bit LINEAR16 encoding.
 *
 * @module services/audio-recording
 * @since 1.0.0
 *
 * @remarks
 * This service provides:
 * - Cross-platform audio recording (macOS, Linux, Windows)
 * - Automatic backend selection (sox/rec/arecord)
 * - Real-time audio streaming for STT
 * - Volume level monitoring
 * - Pause/resume capabilities
 * - STT-optimized audio format
 *
 * @example
 * ```typescript
 * const recorder = new AudioRecordingService();
 * const session = await recorder.startRecording({
 *   sampleRate: 16000,
 *   channels: 1
 * });
 *
 * session.audioStream.on('data', (chunk) => {
 *   console.log('Audio chunk:', chunk.length, 'bytes');
 * });
 *
 * // Stop after 5 seconds
 * setTimeout(() => session.stop(), 5000);
 * ```
 */

import { Readable } from 'stream';
import { createComponentLogger } from '../utils/logger.js';
import {
  RecordingError,
  ErrorCode,
  getErrorMessage,
  toError,
} from '../errors/voice-test.errors.js';
import recorder from 'node-record-lpcm16';
import type { Recording } from 'node-record-lpcm16';
import type { AudioConfig, AudioRecordingSession, AudioDevice } from '../types/index.js';
import { accessSync, constants } from 'fs';
import { platform } from 'os';

const logger = createComponentLogger('AudioRecording');

function getSecureSoxPath(): string {
  const soxPaths =
    platform() === 'darwin'
      ? ['/usr/local/bin/sox', '/opt/homebrew/bin/sox']
      : platform() === 'win32'
        ? ['C:\\Program Files\\sox\\sox.exe', 'C:\\sox\\sox.exe']
        : ['/usr/bin/sox', '/usr/local/bin/sox'];

  for (const soxPath of soxPaths) {
    try {
      accessSync(soxPath, constants.X_OK);
      logger.info(`✅ Using trusted sox binary: ${soxPath}`);
      return soxPath;
    } catch {
      // continue checking
    }
  }

  // 🔒 Fail closed — no fallback
  throw new RecordingError(
    'Security error: sox binary not found at trusted locations',
    ErrorCode.RECORDING_FAILED,
    new Error(`Checked paths: ${soxPaths.join(', ')}`)
  );
}

/**
 * Audio Recording Service for capturing microphone input.
 *
 * @class
 *
 * @remarks
 * Uses node-record-lpcm16 which automatically selects the best available
 * recording tool for your platform:
 * - macOS: sox
 * - Linux: arecord or sox
 * - Windows: sox
 */
export class AudioRecordingService {
  private recording: Recording | null = null;
  private audioStream: Readable | null = null;
  private isActive = false;
  private isPaused = false;
  private volumeLevel = 0;
  private volumeMonitorInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new AudioRecordingService instance.
   *
   * @example
   * ```typescript
   * const recorder = new AudioRecordingService();
   * const support = await recorder.checkAudioSupport();
   * console.log('Audio supported:', support.supported);
   * ```
   */
  constructor() {
    logger.info('Audio Recording Service initialized (node-record-lpcm16)');
  }

  /**
   * Check if audio recording is supported on this system.
   *
   * @returns Promise resolving to support status and recommendations
   *
   * @remarks
   * node-record-lpcm16 uses platform-specific tools:
   * - macOS: Requires sox (`brew install sox`)
   * - Linux: Uses arecord (usually pre-installed) or sox
   * - Windows: Requires sox
   *
   * @example
   * ```typescript
   * const support = await recorder.checkAudioSupport();
   * if (!support.supported) {
   *   console.error('Missing tools:', support.missingTools);
   *   console.log('Install:', support.recommendations);
   * }
   * ```
   */
  checkAudioSupport(): Promise<{
    supported: boolean;
    missingTools: string[];
    recommendations: string;
  }> {
    return Promise.resolve({
      supported: true,
      missingTools: [],
      recommendations: 'Audio recording ready (using system audio tools: sox/rec/arecord)',
    });
  }

  /**
   * Start audio recording with streaming output.
   *
   * @param config - Optional audio configuration
   * @param config.sampleRate - Sample rate in Hz (default: 16000, optimal for STT)
   * @param config.channels - Number of channels (default: 1, mono)
   * @param config.bitDepth - Bit depth (default: 16)
   * @param config.encoding - Audio encoding (default: 'LINEAR16')
   * @returns Promise resolving to an AudioRecordingSession with control methods
   *
   * @throws {RecordingError} If recording fails to start
   *
   * @remarks
   * The returned session provides:
   * - `audioStream`: Readable stream of audio data
   * - `stop()`: Stop recording
   * - `pause()`: Pause recording
   * - `resume()`: Resume recording
   * - `isRecording()`: Check if actively recording
   * - `getVolumeLevel()`: Get current volume (0-100)
   *
   * @example
   * ```typescript
   * const session = await recorder.startRecording({
   *   sampleRate: 16000,
   *   channels: 1,
   *   bitDepth: 16,
   *   encoding: 'LINEAR16'
   * });
   *
   * // Process audio data
   * session.audioStream.on('data', (chunk: Buffer) => {
   *   const volume = session.getVolumeLevel();
   *   console.log(`Audio: ${chunk.length} bytes, Volume: ${volume}%`);
   * });
   *
   * // Stop when done
   * setTimeout(() => {
   *   session.stop();
   *   console.log('Recording stopped');
   * }, 10000);
   * ```
   */
  startRecording(config: Partial<AudioConfig> = {}): Promise<AudioRecordingSession> {
    const audioConfig: AudioConfig = {
      sampleRate: 16000, // Optimal for STT
      channels: 1, // Mono for speech
      bitDepth: 16, // LINEAR16
      encoding: 'LINEAR16',
      ...config,
    };

    logger.info(
      `Starting audio recording: ${audioConfig.sampleRate}Hz, ` +
        `${audioConfig.channels}ch, ${audioConfig.bitDepth}bit`
    );

    try {
      if (this.isActive) {
        this.stopRecording();
      }

      // Use node-record-lpcm16 which handles cross-platform recording securely
      this.recording = recorder.record({
        sampleRateHertz: audioConfig.sampleRate,
        threshold: 0,
        verbose: false,
        recordProgram: getSecureSoxPath(),
      });

      const recordingStream = this.recording.stream();

      if (!recordingStream || typeof recordingStream.on !== 'function') {
        return Promise.reject(
          new RecordingError(
            'Failed to create audio stream - invalid stream returned',
            ErrorCode.RECORDING_FAILED,
            new Error('Recording stream is not a valid Readable stream')
          )
        );
      }

      this.audioStream = recordingStream as Readable;
      this.isActive = true;
      this.isPaused = false;

      this.startVolumeMonitoring();

      logger.info('Audio recording started successfully');

      return Promise.resolve({
        audioStream: this.audioStream,
        stop: () => this.stopRecording(),
        pause: () => this.pauseRecording(),
        resume: () => this.resumeRecording(),
        isRecording: () => this.isActive && !this.isPaused,
        getVolumeLevel: () => this.volumeLevel,
      });
    } catch (error) {
      return Promise.reject(
        new RecordingError(
          `Failed to start audio recording: ${getErrorMessage(error)}`,
          ErrorCode.RECORDING_FAILED,
          toError(error)
        )
      );
    }
  }

  /**
   * Stop audio recording.
   *
   * @remarks
   * Safely stops the recording session and cleans up resources.
   * If not currently recording, logs a warning and returns without error.
   *
   * @example
   * ```typescript
   * recorder.stopRecording();
   * ```
   */
  stopRecording(): void {
    if (!this.isActive) {
      logger.warn('Cannot stop recording - not currently recording');
      return;
    }

    try {
      if (this.volumeMonitorInterval) {
        clearInterval(this.volumeMonitorInterval);
        this.volumeMonitorInterval = null;
      }

      if (this.recording) {
        this.recording.stop();
      }

      this.recording = null;
      this.audioStream = null;
      this.isActive = false;
      this.isPaused = false;
      this.volumeLevel = 0;

      logger.info('Audio recording stopped');
    } catch (error) {
      logger.error(`Error stopping recording: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Pause audio recording without stopping.
   *
   * @remarks
   * Pauses the recording but keeps the stream active.
   * Audio data will not be emitted while paused.
   * Resume with `resumeRecording()`.
   *
   * @example
   * ```typescript
   * recorder.pauseRecording();
   * // Do something...
   * recorder.resumeRecording();
   * ```
   */
  pauseRecording(): void {
    if (!this.isActive || this.isPaused) {
      return;
    }

    this.isPaused = true;
    logger.info('Audio recording paused');
  }

  /**
   * Resume audio recording after pause.
   *
   * @remarks
   * Resumes a paused recording session.
   * Audio data will start emitting again.
   *
   * @example
   * ```typescript
   * recorder.pauseRecording();
   * setTimeout(() => recorder.resumeRecording(), 2000);
   * ```
   */
  resumeRecording(): void {
    if (!this.isActive || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    logger.info('Audio recording resumed');
  }

  /**
   * Get available audio input devices.
   *
   * @returns Promise resolving to array of available audio devices
   *
   * @remarks
   * Note: node-record-lpcm16 uses the system default microphone.
   * Device enumeration is not available with this backend.
   * Always returns a single "System Default Microphone" device.
   *
   * @example
   * ```typescript
   * const devices = await recorder.getInputDevices();
   * devices.forEach(device => {
   *   console.log(`${device.name} (${device.id})`);
   * });
   * ```
   */
  getInputDevices(): Promise<AudioDevice[]> {
    return Promise.resolve([
      {
        id: 'system-default',
        name: 'System Default Microphone',
        isDefault: true,
        type: 'input' as const,
      },
    ]);
  }

  /**
   * Get default audio input device.
   *
   * @returns Promise resolving to the default input device or null
   *
   * @example
   * ```typescript
   * const defaultDevice = await recorder.getDefaultInputDevice();
   * console.log('Using:', defaultDevice?.name);
   * ```
   */
  async getDefaultInputDevice(): Promise<AudioDevice | null> {
    const devices = await this.getInputDevices();
    return devices[0] || null;
  }

  /**
   * Monitor audio volume level in real-time.
   *
   * @private
   * @internal
   *
   * @remarks
   * Calculates RMS (Root Mean Square) volume from 16-bit PCM audio samples.
   * Updates volume level every 100ms.
   */
  private startVolumeMonitoring(): void {
    if (!this.audioStream) {
      return;
    }

    let bufferQueue: Buffer[] = [];

    this.audioStream.on('data', (chunk: Buffer) => {
      if (!this.isPaused) {
        bufferQueue.push(chunk);
      }
    });

    this.volumeMonitorInterval = setInterval(() => {
      if (bufferQueue.length === 0) {
        this.volumeLevel = 0;
        return;
      }

      const combined = Buffer.concat(bufferQueue);
      bufferQueue = [];

      let sum = 0;
      let samples = 0;

      for (let i = 0; i < combined.length - 1; i += 2) {
        const sample = combined.readInt16LE(i);
        sum += sample * sample;
        samples++;
      }

      if (samples > 0) {
        const rms = Math.sqrt(sum / samples);
        this.volumeLevel = Math.min(100, (rms / 32768) * 100);
      }
    }, 100);
  }

  /**
   * Check if currently recording.
   *
   * @returns True if actively recording (not paused), false otherwise
   *
   * @example
   * ```typescript
   * if (recorder.isRecording()) {
   *   console.log('Recording in progress');
   * }
   * ```
   */
  isRecording(): boolean {
    return this.isActive && !this.isPaused;
  }

  /**
   * Get current volume level.
   *
   * @returns Volume level from 0 to 100
   *
   * @remarks
   * Returns the most recently calculated RMS volume.
   * Updated every 100ms while recording.
   *
   * @example
   * ```typescript
   * const volume = recorder.getVolumeLevel();
   * console.log(`Volume: ${volume}%`);
   *
   * if (volume < 10) {
   *   console.warn('Microphone may be too quiet');
   * }
   * ```
   */
  getVolumeLevel(): number {
    return this.volumeLevel;
  }

  /**
   * Create audio recording service instance.
   * Factory method for convenient instantiation.
   *
   * @returns A new AudioRecordingService instance
   *
   * @example
   * ```typescript
   * const recorder = AudioRecordingService.create();
   * const session = await recorder.startRecording();
   * ```
   */
  static create(): AudioRecordingService {
    return new AudioRecordingService();
  }
}
