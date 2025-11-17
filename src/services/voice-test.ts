/**
 * Voice Test Service - Simple TTS with background audio mixing
 * Uses Neurolink TTS SDK and adds background sound mixing capabilities
 */

import { createTTSService } from '@juspay/neurolink';
import type { TTSInput, TTSResponse } from '@juspay/neurolink';

// Google Voice type (from neurolink/src/lib/types/tts.ts but not exported)
interface GoogleVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}
import { AudioMixerService } from './audio-mixer.js';
import { STTService, STTInput, STTResponse } from './stt.js';
import {
  VoiceTestConfig,
  VoiceTestInput,
  VoiceTestResponse,
  VoiceTestError,
  BackgroundSoundPreset,
  getErrorMessage,
  toError,
} from '../types/index.js';
import { ConsoleLogger } from '../utils/logger.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Neurolink TTS Service Interface
 * Defines the contract for TTS operations
 */
interface NeurolinkTTSService {
  generateAudio(input: TTSInput): Promise<TTSResponse>;
  playAudio(filePath: string): Promise<void>;
  // Actual return type from neurolink - returns unknown array
  getAvailableVoices(languageFilter?: string): Promise<unknown[]>;
  testAudioPlayback(): Promise<boolean>;
}

export class VoiceTestService {
  private neurolinkTTS: NeurolinkTTSService;
  public sttService: STTService; // Make public for orchestrator access
  private audioMixer: AudioMixerService;
  private config: VoiceTestConfig;
  private logger: ConsoleLogger;

  constructor(config?: Partial<VoiceTestConfig>) {
    this.logger = new ConsoleLogger();

    // Get API key from environment if not provided
    const apiKey =
      config?.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      throw new VoiceTestError(
        'GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required',
        'MISSING_API_KEY'
      );
    }

    this.config = {
      apiKey,
      defaultOutputDir: config?.defaultOutputDir || process.cwd(),
      defaultEncoding: config?.defaultEncoding || 'MP3',
    };

    // Initialize Neurolink TTS and Google Cloud STT services
    this.neurolinkTTS = createTTSService(apiKey);
    this.sttService = STTService.create(apiKey);
    this.audioMixer = new AudioMixerService();

    this.logger.info('Voice Test Service initialized with Neurolink TTS + Google Cloud STT');
  }

  /**
   * Generate speech from text with optional background noise mixing
   */
  async generateSpeech(input: VoiceTestInput): Promise<string> {
    try {
      this.logger.info(`🎯 Starting TTS generation for: "${input.text.substring(0, 50)}..."`);

      // Convert to Neurolink TTS format
      const neurolinkInput: TTSInput = {
        text: input.text,
        provider: 'gemini',
        languageCode: input.languageCode,
        voiceName: input.voiceName,
        audioEncoding: input.audioEncoding || 'MP3',
        speakingRate: input.speakingRate || 1.0,
        pitch: input.pitch || 0.0,
        play: false, // We handle playback after mixing
      };

      // Generate speech using Neurolink TTS - returns TTSResponse with audioBuffer
      const response: TTSResponse = await this.neurolinkTTS.generateAudio(neurolinkInput);
      this.logger.info(`🎤 Speech generated: ${response.audioSize} bytes`);

      // Save the audio buffer to a constant file (reuse same location)
      const constantFileName = `voice-test-output.${response.encoding.toLowerCase()}`;
      const tempPath = join(this.config.defaultOutputDir!, constantFileName);
      writeFileSync(tempPath, response.audioBuffer);

      // Apply background sound mixing if requested
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

      // Save to custom output path if specified
      if (input.output) {
        const fs = await import('fs/promises');
        await fs.copyFile(finalAudioPath, input.output);
        finalAudioPath = input.output;
      }

      // Play audio if requested using Neurolink's audio player
      if (input.play) {
        try {
          await this.neurolinkTTS.playAudio(finalAudioPath);
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
        'GENERATION_FAILED',
        toError(error)
      );
    }
  }

  /**
   * Generate speech and return detailed response with mixing info
   */
  async generateSpeechDetailed(input: VoiceTestInput): Promise<VoiceTestResponse> {
    const startTime = Date.now();

    try {
      const neurolinkInput: TTSInput = {
        text: input.text,
        provider: 'gemini',
        languageCode: input.languageCode,
        voiceName: input.voiceName,
        audioEncoding: input.audioEncoding || 'MP3',
        speakingRate: input.speakingRate || 1.0,
        pitch: input.pitch || 0.0,
        play: false,
      };

      // Generate using Neurolink TTS
      const response: TTSResponse = await this.neurolinkTTS.generateAudio(neurolinkInput);
      let mixedAudio = false;
      let finalPath = '';

      // Save audio buffer to constant file (reuse same location)
      const constantFileName = `voice-test-output.${response.encoding.toLowerCase()}`;
      const tempPath = join(this.config.defaultOutputDir!, constantFileName);
      writeFileSync(tempPath, response.audioBuffer);
      finalPath = tempPath;

      // Apply background sound mixing if requested
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

      // Handle custom output path
      if (input.output) {
        const fs = await import('fs/promises');
        await fs.copyFile(finalPath, input.output);
        finalPath = input.output;
      }

      // Play audio if requested
      let wasPlayed = false;
      if (input.play) {
        try {
          await this.neurolinkTTS.playAudio(finalPath);
          wasPlayed = true;
          this.logger.info(`🔊 Audio played successfully`);
        } catch (playError) {
          this.logger.warn(`Failed to play audio: ${getErrorMessage(playError)}`);
        }
      }

      return {
        filePath: finalPath,
        fileSize: response.audioSize,
        generationTime: Date.now() - startTime,
        wasPlayed,
        mixedAudio,
        metadata: {
          originalAudioSize: response.audioSize,
          encoding: response.encoding,
          backgroundSound: input.backgroundSound,
          neurolinkGenerationTime: response.generationTime,
        },
      };
    } catch (error) {
      throw new VoiceTestError(
        `Voice generation failed: ${getErrorMessage(error)}`,
        'GENERATION_FAILED',
        toError(error)
      );
    }
  }

  /**
   * Get available voices from Neurolink
   */
  async getAvailableVoices(languageCode?: string): Promise<GoogleVoice[]> {
    if (!this.neurolinkTTS) {
      return [];
    }
    const voices = await this.neurolinkTTS.getAvailableVoices(languageCode);
    // Cast to GoogleVoice[] - neurolink returns untyped array
    return voices as GoogleVoice[];
  }

  /**
   * Get available background sound presets
   */
  getAvailableBackgroundSounds(): BackgroundSoundPreset[] {
    return this.audioMixer.getAvailablePresets();
  }

  /**
   * Play an audio file using Neurolink's audio player
   */
  async playAudio(filePath: string): Promise<void> {
    await this.neurolinkTTS.playAudio(filePath);
  }

  /**
   * Test audio playback capability
   */
  async testAudioPlayback(): Promise<boolean> {
    return this.neurolinkTTS.testAudioPlayback();
  }

  // ============================================================================
  // STT (Speech-to-Text) Methods
  // ============================================================================

  /**
   * Convert speech audio to text using Google Cloud STT
   */
  async transcribeAudio(input: STTInput): Promise<STTResponse> {
    return this.sttService.transcribeAudio(input);
  }

  /**
   * Convert audio file to text (convenience method)
   */
  async transcribeFile(
    filePath: string,
    languageCode: string = 'en-US',
    audioEncoding: STTInput['audioEncoding'] = 'LINEAR16',
    sampleRateHertz: number = 16000
  ): Promise<STTResponse> {
    return this.sttService.transcribeFile(filePath, languageCode, audioEncoding, sampleRateHertz);
  }

  /**
   * Get supported languages for STT
   */
  getSTTSupportedLanguages(): string[] {
    return this.sttService.getSupportedLanguages();
  }

  /**
   * Test STT service
   */
  async testSTTService(): Promise<boolean> {
    return this.sttService.testService();
  }

  /**
   * Get system information
   */
  getSystemInfo(): Record<string, unknown> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      backgroundSounds: this.audioMixer.getAvailablePresets().map((p) => p.name),
      mixer: 'AudioMixerService',
      ttsProvider: 'Neurolink TTS SDK',
      sttProvider: 'Google Cloud Speech-to-Text',
      supportedLanguages: {
        tts: 'Multiple (see getAvailableVoices)',
        stt: this.getSTTSupportedLanguages(),
      },
      voiceTestVersion: '2.0.0',
    };
  }

  /**
   * Create a Voice Test instance with minimal configuration
   */
  static create(apiKey?: string): VoiceTestService {
    return new VoiceTestService({ apiKey });
  }
}
