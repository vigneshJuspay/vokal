/**
 * Voice Test Service
 *
 * Main service for text-to-speech generation with background audio mixing capabilities.
 * Uses Neurolink's generate() API with proper Google AI integration for high-quality speech synthesis.
 *
 * @module services/voice-test
 * @since 1.0.0
 *
 * @remarks
 * This service provides the core TTS functionality with the following features:
 * - High-quality neural voice generation using Google AI
 * - Optional background audio mixing with various sound presets
 * - Multiple audio format support (MP3, WAV, OGG)
 * - Adjustable speech parameters (rate, pitch)
 * - Audio playback capabilities
 * - Cross-platform audio support
 *
 * @example
 * ```typescript
 * const service = VoiceTestService.create(apiKey);
 * const result = await service.generateSpeechDetailed({
 *   text: 'Hello, world!',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   backgroundSound: 'cafe',
 *   play: true
 * });
 * ```
 */

import { NeuroLink } from '@juspay/neurolink';
import type { GenerateResult } from '@juspay/neurolink';
import { ConsoleLogger } from '../utils/logger.js';
import { playAudio } from '../utils/audio-player.js';
import { AudioMixerService } from './audio-mixer.js';
import {
  VoiceTestError,
  getErrorMessage,
  toError,
  ErrorCode,
} from '../errors/voice-test.errors.js';
import { writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import type {
  VoiceTestInput,
  VoiceTestConfig,
  VoiceTestResponse,
  TTSOptions,
  TTSResult,
  GoogleVoice,
  AudioFormat,
  BackgroundSoundPreset,
} from '../types/index.js';
import type { TestSettings } from '../types/voice-bot-config.js';

/**
 * Type guard to safely check if audio response is a valid TTSResult.
 * Validates the presence of required fields: buffer, format, and size.
 *
 * @param value - The value to check
 * @returns True if the value is a valid TTSResult, false otherwise
 *
 * @internal
 */
function isTTSResult(value: unknown): value is TTSResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'buffer' in value &&
    'format' in value &&
    'size' in value &&
    Buffer.isBuffer(value.buffer) &&
    typeof value.format === 'string' &&
    typeof value.size === 'number'
  );
}

/**
 * Decoder function to safely extract and validate TTSResult from unknown value.
 *
 * @param value - The unknown value to decode
 * @returns A validated TTSResult object
 * @throws {Error} If the value doesn't conform to TTSResult interface
 *
 * @internal
 */
function decodeTTSResult(value: unknown): TTSResult {
  if (!isTTSResult(value)) {
    throw new Error('Invalid TTSResult: missing required fields (buffer, format, size)');
  }
  return value;
}

/**
 * Voice Test Service class for text-to-speech generation with audio mixing.
 *
 * @class
 *
 * @example
 * ```typescript
 * // Initialize with API key
 * const service = new VoiceTestService({ apiKey: 'your-api-key' });
 *
 * // Generate speech with background
 * const audioPath = await service.generateSpeech({
 *   text: 'Welcome to our service',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   backgroundSound: 'office',
 *   backgroundVolume: 0.15
 * });
 * ```
 */
export class VoiceTestService {
  private audioMixer: AudioMixerService;
  private config: VoiceTestConfig;
  private logger: ConsoleLogger;
  private neurolink: NeuroLink;

  /**
   * Creates a new VoiceTestService instance.
   *
   * @param apiKey - Optional Google AI API key
   * @param settings - Optional test settings from config (will extract provider, etc.)
   *
   * @throws {VoiceTestError} If API key is not provided and not found in environment variables
   *
   * @example
   * ```typescript
   * const service = new VoiceTestService(
   *   process.env.GOOGLE_AI_API_KEY,
   *   config.settings
   * );
   * ```
   */
  constructor(apiKey?: string, settings?: Partial<TestSettings>) {
    this.logger = new ConsoleLogger();
    this.neurolink = new NeuroLink();

    // Priority order for authentication:
    // 1. Service account credentials (GOOGLE_APPLICATION_CREDENTIALS)
    // 2. Passed apiKey parameter
    // 3. Environment variables (GOOGLE_AI_API_KEY, GEMINI_API_KEY)
    const resolvedApiKey =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      apiKey ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';

    if (!resolvedApiKey) {
      throw new VoiceTestError(
        'GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required',
        ErrorCode.MISSING_API_KEY
      );
    }

    // Extract provider from settings if available, default to 'google-ai'
    const provider = settings?.ttsProvider || 'google-ai';

    this.config = {
      apiKey: resolvedApiKey,
      defaultOutputDir: process.cwd(),
      defaultEncoding: 'MP3',
      provider: provider,
    };

    this.logger.info(`🔧 VoiceTestService initialized with TTS provider: ${provider}`);
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.logger.info(`🔑 Using service account authentication for TTS`);
    }

    this.audioMixer = new AudioMixerService();

    this.logger.info('Voice Test Service initialized with Neurolink TTS');
  }

  /**
   * Generate speech from text with optional background noise mixing.
   * Returns the file path to the generated audio.
   *
   * @param input - Input configuration for speech generation
   * @returns Promise resolving to the file path of the generated audio
   *
   * @throws {VoiceTestError} If speech generation fails or audio mixing encounters errors
   *
   * @remarks
   * This method:
   * 1. Generates speech using Neurolink TTS API
   * 2. Optionally mixes with background audio
   * 3. Saves to specified output path or default location
   * 4. Optionally plays the audio after generation
   *
   * @example
   * ```typescript
   * const audioPath = await service.generateSpeech({
   *   text: 'Hello, world!',
   *   languageCode: 'en-US',
   *   voiceName: 'en-US-Neural2-F',
   *   audioEncoding: 'MP3',
   *   speakingRate: 1.0,
   *   pitch: 0.0,
   *   backgroundSound: 'cafe',
   *   backgroundVolume: 0.2,
   *   play: true,
   *   output: './custom-output.mp3'
   * });
   * console.log('Audio saved to:', audioPath);
   * ```
   */
  async generateSpeech(input: VoiceTestInput): Promise<string> {
    try {
      this.logger.info(`🎯 Starting TTS generation for: "${input.text.substring(0, 50)}..."`);

      const ttsOptions: TTSOptions = {
        enabled: true,
        voice: input.voiceName,
        format: (input.audioEncoding?.toLowerCase() as AudioFormat) || 'mp3',
        speed: input.speakingRate || 1.0,
        pitch: input.pitch || 0.0,
      };

      const response: GenerateResult = await this.neurolink.generate({
        input: {
          text: input.text,
        },
        provider: this.config.provider,
        tts: ttsOptions,
      });

      if (response.audio === undefined) {
        throw new VoiceTestError(
          'No audio response from TTS generation',
          ErrorCode.NO_AUDIO_RESPONSE
        );
      }

      const audio = decodeTTSResult(response.audio);

      this.logger.info(`🎤 Speech generated: ${audio.size} bytes`);

      const constantFileName = `vokal-output.${audio.format}`;
      const tempPath = join(this.config.defaultOutputDir!, constantFileName);
      writeFileSync(tempPath, audio.buffer);

      let finalAudioPath = tempPath;
      if (input.backgroundSound) {
        try {
          this.logger.info(`🎵 Mixing with background sound: ${input.backgroundSound}`);
          finalAudioPath = await this.audioMixer.mixAudio(
            tempPath,
            input.backgroundSound,
            input.backgroundVolume
          );
          this.logger.info(`🎼 Mixed audio created: ${finalAudioPath}`);
        } catch (mixError) {
          this.logger.warn(`⚠️ Background mixing failed: ${getErrorMessage(mixError)}`);
          this.logger.info(`🔄 Continuing with original speech without background`);
        }
      }

      if (input.output) {
        const fs = await import('fs/promises');
        await fs.copyFile(finalAudioPath, input.output);
        finalAudioPath = input.output;
      }

      if (input.play) {
        try {
          await playAudio(finalAudioPath);
          this.logger.info(`🔊 Audio played successfully`);
        } catch (playError) {
          this.logger.warn(`⚠️ Failed to play audio: ${getErrorMessage(playError)}`);
        }
      }

      this.logger.info(`✅ Voice Test process completed successfully`);
      this.logger.info(`📁 Final audio file: ${finalAudioPath}`);

      return finalAudioPath;
    } catch (error) {
      if (error instanceof VoiceTestError) {
        this.logger.error(`❌ Voice Test Error [${error.code}]: ${error.message}`);
        throw error;
      }

      this.logger.error(`❌ Unexpected error during voice generation: ${getErrorMessage(error)}`);
      throw new VoiceTestError(
        `Voice generation failed: ${getErrorMessage(error)}`,
        ErrorCode.GENERATION_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Generate speech and return detailed response with timing and mixing information.
   *
   * @param input - Input configuration for speech generation
   * @returns Promise resolving to detailed response with metadata
   *
   * @throws {VoiceTestError} If speech generation fails
   *
   * @remarks
   * Use this method when you need detailed information about the generation process,
   * including timing metrics, file sizes, and whether background mixing was successful.
   *
   * @example
   * ```typescript
   * const result = await service.generateSpeechDetailed({
   *   text: 'Welcome to our application',
   *   languageCode: 'en-IN',
   *   voiceName: 'en-IN-Neural2-B',
   *   backgroundSound: 'office'
   * });
   *
   * console.log('File:', result.filePath);
   * console.log('Size:', result.fileSize, 'bytes');
   * console.log('Generation time:', result.generationTime, 'ms');
   * console.log('Mixed audio:', result.mixedAudio);
   * console.log('Was played:', result.wasPlayed);
   * ```
   */
  async generateSpeechDetailed(input: VoiceTestInput): Promise<VoiceTestResponse> {
    const startTime = Date.now();

    try {
      const ttsOptions: TTSOptions = {
        enabled: true,
        voice: input.voiceName,
        format: (input.audioEncoding?.toLowerCase() as 'mp3' | 'wav' | 'ogg' | 'opus') || 'mp3',
        speed: input.speakingRate || 1.0,
        pitch: input.pitch || 0.0,
      };

      const response: GenerateResult = await this.neurolink.generate({
        input: {
          text: input.text,
        },
        provider: this.config.provider,
        tts: ttsOptions,
      });

      if (response.audio === undefined) {
        throw new VoiceTestError(
          'No audio response from TTS generation',
          ErrorCode.NO_AUDIO_RESPONSE
        );
      }

      const audio = decodeTTSResult(response.audio);

      let mixedAudio = false;
      let finalPath = '';

      const constantFileName = `vokal-output.${audio.format}`;
      const tempPath = join(this.config.defaultOutputDir!, constantFileName);
      writeFileSync(tempPath, audio.buffer);
      finalPath = tempPath;

      if (input.backgroundSound) {
        try {
          const mixedPath = await this.audioMixer.mixAudio(
            tempPath,
            input.backgroundSound,
            input.backgroundVolume
          );
          finalPath = mixedPath;
          mixedAudio = true;
        } catch (mixError) {
          this.logger.warn(`Background mixing failed: ${getErrorMessage(mixError)}`);
        }
      }

      if (input.output) {
        const fs = await import('fs/promises');
        await fs.copyFile(finalPath, input.output);
        finalPath = input.output;
      }

      let wasPlayed = false;
      if (input.play) {
        try {
          await playAudio(finalPath);
          wasPlayed = true;
          this.logger.info(`🔊 Audio played successfully`);
        } catch (playError) {
          this.logger.warn(`Failed to play audio: ${getErrorMessage(playError)}`);
        }
      }

      return {
        filePath: finalPath,
        fileSize: audio.size,
        generationTime: Date.now() - startTime,
        wasPlayed,
        mixedAudio,
        metadata: {
          originalAudioSize: audio.size,
          encoding: audio.format,
          backgroundSound: input.backgroundSound,
          neurolinkGenerationTime: response.responseTime || 0,
        },
      };
    } catch (error) {
      throw new VoiceTestError(
        `Voice generation failed: ${getErrorMessage(error)}`,
        ErrorCode.GENERATION_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Get available voices for text-to-speech generation.
   *
   * @param _languageCode - Optional language code to filter voices
   * @returns Array of available voice configurations
   *
   * @remarks
   * Note: This method may need updates for the new Neurolink API.
   * Currently returns an empty array as the API doesn't provide voice listing.
   *
   * @todo Update this method when Neurolink provides voice listing in new API
   *
   * @example
   * ```typescript
   * const voices = service.getAvailableVoices('en-US');
   * voices.forEach(voice => {
   *   console.log(`${voice.name}: ${voice.gender} ${voice.type}`);
   * });
   * ```
   */
  getAvailableVoices(_languageCode?: string): GoogleVoice[] {
    this.logger.warn('getAvailableVoices may need updates for new Neurolink API');
    return [];
  }

  /**
   * Get available background sound presets.
   *
   * @returns Array of background sound presets with details
   *
   * @remarks
   * Returns all available background sound presets including:
   * - office: Office ambience with typing and quiet chatter
   * - cafe: Coffee shop atmosphere
   * - nature: Outdoor setting with birds
   * - rain: Gentle rainfall
   * - phone: Phone line static
   * - crowd: Distant crowd noise
   *
   * @example
   * ```typescript
   * const backgrounds = service.getAvailableBackgroundSounds();
   * backgrounds.forEach(bg => {
   *   console.log(`${bg.name}: ${bg.description}`);
   *   console.log(`  Default volume: ${bg.defaultVolume}`);
   *   console.log(`  Loops: ${bg.loop}`);
   * });
   * ```
   */
  getAvailableBackgroundSounds(): BackgroundSoundPreset[] {
    return this.audioMixer.getAvailablePresets();
  }

  /**
   * Play an audio file using the system's default audio player.
   *
   * @param filePath - Path to the audio file to play
   * @returns Promise that resolves when playback completes
   *
   * @throws {VoiceTestError} If playback fails or file doesn't exist
   *
   * @remarks
   * Uses platform-specific audio players:
   * - macOS: afplay
   * - Linux: aplay
   * - Windows: PowerShell Media.SoundPlayer
   *
   * @example
   * ```typescript
   * await service.playAudio('./output.wav');
   * console.log('Playback completed');
   * ```
   */
  async playAudio(filePath: string): Promise<void> {
    try {
      // Validate file path to prevent injection
      const resolvedPath = resolve(filePath);
      if (!existsSync(resolvedPath)) {
        throw new VoiceTestError(`Audio file not found: ${filePath}`, ErrorCode.FILE_NOT_FOUND);
      }

      // Use spawn with array arguments to prevent command injection
      const { spawn } = await import('child_process');

      let command: string;
      let args: string[];

      if (process.platform === 'darwin') {
        command = 'afplay';
        args = [resolvedPath];
      } else if (process.platform === 'linux') {
        command = 'aplay';
        args = [resolvedPath];
      } else {
        // Windows - use PowerShell with proper argument escaping
        command = 'powershell';
        args = [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `(New-Object Media.SoundPlayer '${resolvedPath.replace(/'/g, "''")}').PlaySync()`,
        ];
      }

      return new Promise((resolve, reject) => {
        const player = spawn(command, args, {
          stdio: 'ignore',
          shell: false, // IMPORTANT: Never use shell: true with user input
        });

        player.on('error', (error: Error) => {
          reject(
            new VoiceTestError(
              `Failed to start audio player: ${error.message}`,
              ErrorCode.AUDIO_PLAYBACK_FAILED,
              error
            )
          );
        });

        player.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new VoiceTestError(
                `Audio player exited with code ${code}`,
                ErrorCode.AUDIO_PLAYBACK_FAILED
              )
            );
          }
        });
      });
    } catch (error) {
      throw new VoiceTestError(
        `Failed to play audio: ${getErrorMessage(error)}`,
        ErrorCode.PLAYBACK_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Test audio playback capability on the current system.
   *
   * @returns Promise resolving to true if audio playback is supported, false otherwise
   *
   * @remarks
   * This method generates a short test audio and attempts to play it.
   * Useful for validating system audio setup before running tests.
   *
   * @example
   * ```typescript
   * const isSupported = await service.testAudioPlayback();
   * if (!isSupported) {
   *   console.error('Audio playback not supported on this system');
   * }
   * ```
   */
  async testAudioPlayback(): Promise<boolean> {
    try {
      const testPath = join(this.config.defaultOutputDir!, 'test-playback.mp3');

      const response: GenerateResult = await this.neurolink.generate({
        input: {
          text: 'Test',
        },
        provider: this.config.provider,
        tts: {
          enabled: true,
          format: 'mp3',
        },
      });

      if (response.audio === undefined) {
        throw new VoiceTestError(
          'No audio response from TTS generation',
          ErrorCode.NO_AUDIO_RESPONSE
        );
      }

      const audio = decodeTTSResult(response.audio);

      writeFileSync(testPath, audio.buffer);

      await this.playAudio(testPath);

      const fs = await import('fs/promises');
      await fs.unlink(testPath);

      return true;
    } catch (error) {
      this.logger.error(`Audio playback test failed: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Get system information including platform, versions, and capabilities.
   *
   * @returns Object containing system information and available features
   *
   * @example
   * ```typescript
   * const info = service.getSystemInfo();
   * console.log('Platform:', info.platform);
   * console.log('Node version:', info.nodeVersion);
   * console.log('TTS provider:', info.ttsProvider);
   * console.log('Available backgrounds:', info.backgroundSounds);
   * ```
   */
  getSystemInfo(): Record<string, unknown> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      backgroundSounds: this.audioMixer.getAvailablePresets().map((p) => p.name),
      mixer: 'AudioMixerService',
      ttsProvider: 'Neurolink TTS SDK',
      sttProvider: 'Google Cloud Speech-to-Text (via StreamingSTTService)',
      voiceTestVersion: '2.0.0',
    };
  }

  /**
   * Create a Voice Test instance with minimal configuration.
   * Factory method for convenient service instantiation.
   *
   * @param apiKey - Optional Google AI API key
   * @returns A new VoiceTestService instance
   *
   * @example
   * ```typescript
   * const service = VoiceTestService.create(process.env.GOOGLE_AI_API_KEY);
   * await service.generateSpeech({
   *   text: 'Hello!',
   *   languageCode: 'en-US',
   *   voiceName: 'en-US-Neural2-F'
   * });
   * ```
   */
  static create(apiKey?: string): VoiceTestService {
    return new VoiceTestService(apiKey);
  }
}
