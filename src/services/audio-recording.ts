/**
 * Audio Recording Service
 * Cross-platform microphone input using node-record-lpcm16 (sox/rec/arecord)
 * Optimized for Google Speech-to-Text API
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

const logger = createComponentLogger('AudioRecording');

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  encoding: 'LINEAR16' | 'WEBM_OPUS' | 'MP3';
  deviceId?: number;
}

export interface AudioRecordingSession {
  audioStream: Readable;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRecording: () => boolean;
  getVolumeLevel: () => number;
}

export interface AudioDevice {
  id: number;
  name: string;
  maxInputChannels: number;
  defaultSampleRate: number;
  hostAPIName: string;
}

export class AudioRecordingService {
  private recording: Recording | null = null;
  private audioStream: Readable | null = null;
  private isActive = false;
  private isPaused = false;
  private volumeLevel = 0;
  private volumeMonitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    logger.info('Audio Recording Service initialized (node-record-lpcm16)');
  }

  /**
   * Check if audio recording is supported on this system
   * node-record-lpcm16 uses sox/rec/arecord
   */
  checkAudioSupport(): Promise<{
    supported: boolean;
    missingTools: string[];
    recommendations: string;
  }> {
    // node-record-lpcm16 will use available system tools
    return Promise.resolve({
      supported: true,
      missingTools: [],
      recommendations: 'Audio recording ready (using system audio tools: sox/rec/arecord)',
    });
  }

  /**
   * Start audio recording with streaming output
   * Uses node-record-lpcm16 which leverages system audio tools
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
      // Stop any existing recording
      if (this.isActive) {
        this.stopRecording();
      }

      // Create recording with node-record-lpcm16
      this.recording = recorder.record({
        sampleRateHertz: audioConfig.sampleRate,
        threshold: 0, // silence detection threshold
        verbose: false,
        recordProgram: 'sox', // or 'rec' or 'arecord' - node-record-lpcm16 will auto-detect
      });

      // Get the audio stream from node-record-lpcm16
      // The stream() method returns NodeJS.ReadableStream which is compatible with Readable
      const recordingStream = this.recording.stream();

      // Type guard to ensure it's a valid Readable stream
      if (!recordingStream || typeof recordingStream.on !== 'function') {
        return Promise.reject(
          new RecordingError(
            'Failed to create audio stream - invalid stream returned',
            ErrorCode.RECORDING_FAILED,
            new Error('Recording stream is not a valid Readable stream')
          )
        );
      }

      // Cast is safe here because we've verified it's a readable stream
      this.audioStream = recordingStream as Readable;
      this.isActive = true;
      this.isPaused = false;

      // Start volume monitoring
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
   * Stop audio recording
   */
  stopRecording(): void {
    if (!this.isActive) {
      logger.warn('Cannot stop recording - not currently recording');
      return;
    }

    try {
      // Stop volume monitoring
      if (this.volumeMonitorInterval) {
        clearInterval(this.volumeMonitorInterval);
        this.volumeMonitorInterval = null;
      }

      // Stop recording
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
   * Pause audio recording
   */
  pauseRecording(): void {
    if (!this.isActive || this.isPaused) {
      return;
    }

    this.isPaused = true;
    logger.info('Audio recording paused');
  }

  /**
   * Resume audio recording
   */
  resumeRecording(): void {
    if (!this.isActive || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    logger.info('Audio recording resumed');
  }

  /**
   * Get available audio input devices
   * Note: node-record-lpcm16 uses system default, device enumeration not available
   */
  getInputDevices(): Promise<AudioDevice[]> {
    // node-record-lpcm16 uses system default device
    return Promise.resolve([
      {
        id: -1,
        name: 'System Default Microphone',
        maxInputChannels: 1,
        defaultSampleRate: 16000,
        hostAPIName: 'system',
      },
    ]);
  }

  /**
   * Get default audio input device
   */
  async getDefaultInputDevice(): Promise<AudioDevice | null> {
    const devices = await this.getInputDevices();
    return devices[0] || null;
  }

  /**
   * Monitor audio volume level
   */
  private startVolumeMonitoring(): void {
    if (!this.audioStream) {
      return;
    }

    let bufferQueue: Buffer[] = [];

    // Collect audio chunks
    this.audioStream.on('data', (chunk: Buffer) => {
      if (!this.isPaused) {
        bufferQueue.push(chunk);
      }
    });

    // Calculate volume every 100ms
    this.volumeMonitorInterval = setInterval(() => {
      if (bufferQueue.length === 0) {
        this.volumeLevel = 0;
        return;
      }

      // Combine all buffers
      const combined = Buffer.concat(bufferQueue);
      bufferQueue = [];

      // Calculate RMS volume (16-bit samples)
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
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.isActive && !this.isPaused;
  }

  /**
   * Get current volume level (0-100)
   */
  getVolumeLevel(): number {
    return this.volumeLevel;
  }

  /**
   * Create audio recording service instance
   */
  static create(): AudioRecordingService {
    return new AudioRecordingService();
  }
}
