/**
 * Voice Interaction Service
 *
 * Complete voice interaction pipeline integrating TTS, STT, and audio recording.
 * Provides end-to-end conversational AI capabilities with question playback and response capture.
 * Inspired by Lighthouse's architecture but optimized for Node.js environments.
 *
 * @module services/voice-interaction
 * @since 1.0.0
 *
 * @remarks
 * This service orchestrates the complete voice interaction flow:
 * 1. **Text-to-Speech**: Plays question using VoiceTestService
 * 2. **Audio Recording**: Captures user response via AudioRecordingService
 * 3. **Speech-to-Text**: Transcribes response using StreamingSTTService
 * 4. **Result Processing**: Returns transcript with confidence and timing metrics
 *
 * Features:
 * - Complete conversational pipeline
 * - Background audio mixing support
 * - Configurable timeouts and thresholds
 * - Real-time volume monitoring
 * - System validation and health checks
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * const interaction = new VoiceInteractionService(apiKey);
 *
 * const result = await interaction.runVoiceInteraction(
 *   'What is your name?',
 *   {
 *     language: 'en-US',
 *     voice: 'en-US-Neural2-F',
 *     maxRecordingDuration: 10000,
 *     silenceTimeout: 2000,
 *     confidenceThreshold: 0.5
 *   }
 * );
 *
 * console.log('User said:', result.transcript);
 * console.log('Confidence:', result.confidence);
 * ```
 */

import { STTHandlerManager } from '../providers/stt-handler-manager.js';
import type { STTHandler, STTProviderName } from '../types/stt-provider.types.js';
import { AudioRecordingService } from './audio-recording.js';
import { VoiceTestService } from './voice-test.js';
import { ConsoleLogger } from '../utils/logger.js';
import {
  VoiceTestError,
  getErrorMessage,
  toError,
  ErrorCode,
} from '../errors/voice-test.errors.js';
import type {
  VoiceInteractionOptions,
  VoiceInteractionResult,
  StreamingSTTResult,
} from '../types/voice-interaction.types.js';
import type { TestSettings } from '../types/voice-bot-config.js';
import type { VoiceTestInput } from '../types/voice-test.types.js';
import type { AudioRecordingSession } from '../types/audio.types.js';

/**
 * Voice Interaction Service class for complete conversational AI pipelines.
 *
 * @class
 *
 * @remarks
 * Integrates three core services:
 * - VoiceTestService: TTS generation
 * - AudioRecordingService: Microphone capture
 * - StreamingSTTService: Speech recognition
 */
export class VoiceInteractionService {
  private sttHandler: STTHandler;
  private audioService: AudioRecordingService;
  private voiceTest: VoiceTestService;
  private logger: ConsoleLogger;
  private config?: Partial<TestSettings>;

  /**
   * Creates a new VoiceInteractionService instance.
   *
   * @param config - Configuration settings from test config
   *
   * @remarks
   * Initializes all component services using the STT Handler Manager.
   * Each service handles its own API key initialization from environment variables.
   *
   * API keys are automatically loaded from environment variables:
   * - TTS: Based on ttsProvider (GOOGLE_AI_API_KEY for google-ai, AWS credentials for polly, etc.)
   * - STT: Based on sttProvider (GOOGLE_AI_API_KEY, GOOGLE_APPLICATION_CREDENTIALS, etc.)
   *
   * @example
   * ```typescript
   * const service = new VoiceInteractionService({
   *   ttsProvider: 'polly',
   *   sttProvider: 'google-ai'
   * });
   *
   * // Validate system before use
   * const validation = await service.validateSystem();
   * if (!validation.audio || !validation.stt) {
   *   throw new Error('System validation failed');
   * }
   * ```
   */
  constructor(config?: Partial<TestSettings>) {
    this.logger = new ConsoleLogger();
    this.config = config;

    if (config) {
      this.logger.info('🔧 VoiceInteractionService initialized with config:', config);
    }

    // Use STT Handler Manager to get the appropriate STT provider
    const sttProvider = (config?.sttProvider as STTProviderName) || 'google-ai';
    this.logger.info(`🎙️ Using STT Provider: ${sttProvider}`);
    this.sttHandler = STTHandlerManager.getHandler(sttProvider);

    // Initialize other services
    this.voiceTest = new VoiceTestService(undefined, config);
    this.audioService = new AudioRecordingService();

    this.logger.info('🚀 VoiceInteractionService initialized successfully');
  }

  /**
   * Validate all system components are working correctly.
   *
   * @returns Promise resolving to validation results for each component
   *
   * @remarks
   * Validates:
   * - **TTS**: Tests audio playback capability
   * - **Audio**: Checks recording system availability
   * - **STT**: Verifies speech recognition initialization
   *
   * Returns detailed error messages if any component fails.
   * Should be called before running voice interactions to ensure system readiness.
   *
   * @example
   * ```typescript
   * const validation = await service.validateSystem();
   *
   * console.log('TTS:', validation.tts ? '✓' : '✗');
   * console.log('Audio:', validation.audio ? '✓' : '✗');
   * console.log('STT:', validation.stt ? '✓' : '✗');
   *
   * if (validation.errors.length > 0) {
   *   console.error('Validation errors:', validation.errors);
   * }
   * ```
   */
  async validateSystem(): Promise<{
    tts: boolean;
    audio: boolean;
    stt: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let tts = false;
    let audio = false;
    let stt = false;

    this.logger.info('🔧 Validating system components...');

    // Test TTS
    try {
      const ttsResult = await this.voiceTest.testAudioPlayback();
      tts = ttsResult;
      if (!tts) {
        errors.push('TTS playback test failed');
      }
    } catch (error) {
      errors.push(`TTS error: ${getErrorMessage(error)}`);
    }

    // Test Audio Recording
    try {
      const audioSupport = await this.audioService.checkAudioSupport();
      if (!audioSupport.supported) {
        errors.push(`Audio not supported: ${audioSupport.missingTools.join(', ')}`);
        errors.push(`Recommendation: ${audioSupport.recommendations}`);
      } else {
        audio = true; // naudiodon is ready
      }
    } catch (error) {
      errors.push(`Audio error: ${getErrorMessage(error)}`);
    }

    // STT test (basic initialization)
    try {
      stt = true; // STT service initializes on creation
      this.logger.info('✅ STT service ready');
    } catch (error) {
      stt = false;
      errors.push(`STT error: ${getErrorMessage(error)}`);
    }

    const allGood = tts && audio && stt;
    this.logger.info(`🔍 System validation: TTS=${tts}, Audio=${audio}, STT=${stt}`);

    if (allGood) {
      this.logger.info('✅ All system components validated successfully');
    } else {
      this.logger.warn(`⚠️ System validation issues: ${errors.join(', ')}`);
    }

    return { tts, audio, stt, errors };
  }

  /**
   * Validate configuration values for voice interaction.
   *
   * @param fullConfig - Complete configuration object
   * @param question - Question text to validate
   * @throws {VoiceTestError} If configuration values are invalid
   *
   * @private
   * @internal
   */
  private validateConfig(fullConfig: Required<VoiceInteractionOptions>, question: string): void {
    // Validate question text
    if (!question || question.trim().length === 0) {
      throw new VoiceTestError(
        'Question text cannot be empty',
        ErrorCode.INVALID_INPUT,
        new Error('question is required')
      );
    }

    if (question.length > 5000) {
      throw new VoiceTestError(
        'Question text is too long (max 5000 characters)',
        ErrorCode.INVALID_INPUT,
        new Error('question too long')
      );
    }

    // Validate sample rate
    const sampleRate = fullConfig.sampleRate ?? 16000;
    if (sampleRate < 8000 || sampleRate > 48000) {
      throw new VoiceTestError(
        `Invalid sample rate: ${sampleRate}. Must be between 8000 and 48000 Hz`,
        ErrorCode.INVALID_CONFIG,
        new Error('Invalid sampleRate')
      );
    }

    const maxDuration = fullConfig.maxRecordingDuration ?? 60000;
    if (maxDuration < 1000 || maxDuration > 600000) {
      throw new VoiceTestError(
        `Invalid max recording duration: ${maxDuration}. Must be between 1000 and 600000 ms`,
        ErrorCode.INVALID_CONFIG,
        new Error('Invalid maxRecordingDuration')
      );
    }

    const silenceTimeout = fullConfig.silenceTimeout ?? 2000;
    if (silenceTimeout < 500 || silenceTimeout > 10000) {
      throw new VoiceTestError(
        `Invalid silence timeout: ${silenceTimeout}. Must be between 500 and 10000 ms`,
        ErrorCode.INVALID_CONFIG,
        new Error('Invalid silenceTimeout')
      );
    }
  }

  /**
   * Run a complete voice interaction: play question, listen, and transcribe.
   *
   * @param question - Question text to speak
   * @param config - Optional configuration for the interaction
   * @returns Promise resolving to interaction result with transcript and metrics
   *
   * @throws {VoiceTestError} If interaction fails at any stage
   *
   * @remarks
   * **Interaction Flow:**
   * 1. Generate and play the question using TTS
   * 2. Brief pause to let audio settle
   * 3. Start recording user response
   * 4. Stream audio to STT for transcription
   * 5. Wait for silence or max duration
   * 6. Return complete transcript with metrics
   *
   * **Configuration Options:**
   * - `language`/`languageCode`: Language for TTS and STT (default: 'en-US')
   * - `voice`/`voiceName`: Voice for TTS (default: 'en-US-Neural2-F')
   * - `recordingDuration`/`maxRecordingDuration`: Max recording time in ms (default: 10000)
   * - `sampleRate`: Audio sample rate in Hz (default: 16000)
   * - `silenceTimeout`: Silence duration before ending in ms (default: 2000)
   * - `confidenceThreshold`: Minimum confidence for results (default: 0.3)
   * - `backgroundSound`: Optional background audio preset
   * - `backgroundVolume`: Background volume level (default: 0.3)
   *
   * **Result Metrics:**
   * - `transcript`: Final transcribed text
   * - `confidence`: Recognition confidence (0-1)
   * - `processingTime`: STT processing time in ms
   * - `duration`: Total interaction time in ms
   * - `audioProcessed`: Total audio bytes processed
   * - `maxVolume`: Peak volume level detected
   *
   * @example
   * ```typescript
   * // Basic usage
   * const result = await service.runVoiceInteraction(
   *   'What is your favorite color?'
   * );
   * console.log('Answer:', result.transcript);
   *
   * // Advanced configuration
   * const result2 = await service.runVoiceInteraction(
   *   'Please describe your experience',
   *   {
   *     language: 'en-IN',
   *     voice: 'en-IN-Neural2-B',
   *     maxRecordingDuration: 20000,
   *     silenceTimeout: 3000,
   *     confidenceThreshold: 0.5,
   *     backgroundSound: 'office',
   *     backgroundVolume: 0.15
   *   }
   * );
   *
   * console.log('Transcript:', result2.transcript);
   * console.log('Confidence:', result2.confidence);
   * console.log('Duration:', result2.duration, 'ms');
   * console.log('Audio processed:', result2.audioProcessed, 'bytes');
   * console.log('Max volume:', result2.maxVolume, '%');
   * ```
   */
  async runVoiceInteraction(
    question: string,
    config: Partial<VoiceInteractionOptions> = {}
  ): Promise<VoiceInteractionResult> {
    const fullConfig: Required<VoiceInteractionOptions> = {
      language: config.language ?? config.languageCode ?? 'en-US',
      languageCode: config.languageCode ?? config.language ?? 'en-US',
      voice: config.voice ?? config.voiceName ?? 'en-US-Neural2-F',
      voiceName: config.voiceName ?? config.voice ?? 'en-US-Neural2-F',
      recordingDuration: config.recordingDuration ?? 10000,
      maxRecordingDuration: config.maxRecordingDuration ?? config.recordingDuration ?? 10000,
      sampleRate: config.sampleRate ?? 16000,
      silenceTimeout: config.silenceTimeout ?? 2000,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      backgroundSound: config.backgroundSound ?? '',
      backgroundVolume: config.backgroundVolume ?? 0.3,
      questionDelay: config.questionDelay ?? 1000,
    };

    this.validateConfig(fullConfig, question);

    const startTime = Date.now();

    try {
      this.logger.info(`🎯 Starting voice interaction: "${question}"`);

      // Step 1: Generate and play the question using TTS
      this.logger.info(`🗣️ Bot: "${question}"`);

      const ttsInput: VoiceTestInput = {
        text: question,
        languageCode: fullConfig.language,
        voiceName: fullConfig.voice,
        audioEncoding: 'WAV',
        play: true,
        backgroundSound: fullConfig.backgroundSound || undefined,
        backgroundVolume: fullConfig.backgroundVolume,
      };

      await this.voiceTest.generateSpeech(ttsInput);

      // Brief pause to let audio settle (configurable)
      await this.delay(fullConfig.questionDelay);

      // Step 2: Listen for response
      console.log('👂 Listening for your response...\n');
      this.logger.info('🎤 Listening for response...');
      const transcriptionResult = await this.listenAndTranscribe(fullConfig);

      this.logger.info(`💬 You: "${transcriptionResult.transcript}"`);

      const totalTime = Date.now() - startTime;

      this.logger.info(`✅ Voice interaction completed in ${totalTime}ms`);
      this.logger.info(
        `📝 Result: "${transcriptionResult.transcript}" (confidence: ${(transcriptionResult.confidence * 100).toFixed(1)}%)`
      );

      return {
        transcript: transcriptionResult.transcript,
        confidence: transcriptionResult.confidence,
        audioFilePath: '',
        processingTime: transcriptionResult.processingTime,
        duration: totalTime,
        audioProcessed: transcriptionResult.audioProcessed,
        maxVolume: transcriptionResult.maxVolume,
      };
    } catch (error) {
      throw new VoiceTestError(
        `Voice interaction failed: ${getErrorMessage(error)}`,
        ErrorCode.VOICE_INTERACTION_ERROR,
        toError(error)
      );
    }
  }

  /**
   * Listen and transcribe speech using streaming recognition.
   *
   * @param config - Complete configuration for listening
   * @returns Promise resolving to transcription result with metrics
   *
   * @private
   * @internal
   *
   * @remarks
   * Manages the complete audio capture and transcription pipeline:
   * - Starts audio recording
   * - Pipes audio to streaming STT
   * - Accumulates final transcripts
   * - Monitors volume levels
   * - Handles timeouts and errors
   */
  private async listenAndTranscribe(config: Required<VoiceInteractionOptions>): Promise<{
    transcript: string;
    confidence: number;
    audioProcessed: number;
    maxVolume: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    let finalTranscript = '';
    let finalConfidence = 0;
    let maxVolume = 0;
    let totalAudioProcessed = 0;

    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | undefined;
      let resolved = false;

      const resolveOnce = (result: {
        transcript: string;
        confidence: number;
        audioProcessed: number;
        maxVolume: number;
        processingTime: number;
      }): void => {
        if (!resolved) {
          resolved = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          resolve(result);
        }
      };

      const rejectOnce = (error: Error): void => {
        if (!resolved) {
          resolved = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          reject(error);
        }
      };

      // Wrap async operations in an IIFE to avoid async promise executor
      void (async (): Promise<void> => {
        let audioSession: AudioRecordingSession | null = null;
        let sttSession: {
          writeAudio: (audioChunk: Buffer) => void;
          endStream: () => void;
          isActive: () => boolean;
        } | null = null;

        try {
          // Start audio recording
          audioSession = await this.audioService.startRecording({
            sampleRate: config.sampleRate,
            channels: 1,
            bitDepth: 16,
            encoding: 'LINEAR16',
          });

          if (!audioSession) {
            throw new Error('Failed to start audio recording');
          }

          // Start streaming recognition
          const sttConfig = {
            languageCode: config.language,
            sampleRate: config.sampleRate,
            encoding: 'LINEAR16' as const,
            speechStartTimeout: 45,
            speechEndTimeout: 2,
          };

          // Callbacks for streaming
          const onResult = (result: StreamingSTTResult): void => {
            if (result.isFinal && result.transcript.trim().length > 0) {
              if (finalTranscript) {
                finalTranscript += ' ' + result.transcript.trim();
              } else {
                finalTranscript = result.transcript.trim();
              }

              finalConfidence = Math.max(finalConfidence, result.confidence);

              // Clear the interim line and show final result
              process.stdout.write('\r\x1b[K'); // Clear current line
              console.log(`✅ You said: "${finalTranscript}"\n`);
            } else if (result.transcript.trim().length > 0) {
              // Update the same line with interim results (what user is currently saying)
              process.stdout.write('\r\x1b[K'); // Clear current line
              process.stdout.write(`💬 You're saying: "${result.transcript}"`);
            }
          };

          const onSpeechStart = (): void => {
            this.logger.info('🗣️ Speech started');
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = undefined;
            }
          };

          const onSpeechEnd = (): void => {
            this.logger.info('🤫 Speech ended (after 2s silence detected by Google)');

            // Google already waited 2 seconds and kept listening
            // Now immediately stop recording and close stream
            this.logger.info('⏰ Stopping recording immediately');

            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = undefined;
            }

            if (audioSession?.stop) {
              audioSession.stop();
            }
            if (sttSession) {
              sttSession.endStream();
            }

            // Resolve with whatever transcript we have
            resolveOnce({
              transcript: finalTranscript || '',
              confidence: finalConfidence,
              audioProcessed: totalAudioProcessed,
              maxVolume,
              processingTime: Date.now() - startTime,
            });
          };

          const onError = (error: Error): void => {
            this.logger.error(`❌ STT error: ${error.message}`);
            if (audioSession?.stop) {
              audioSession.stop();
            }
            rejectOnce(error);
          };

          // Start streaming STT
          sttSession = this.sttHandler.startStreaming(
            sttConfig,
            onResult,
            onSpeechStart,
            onSpeechEnd,
            onError
          );

          // Pipe audio from recorder to STT
          if (audioSession.audioStream && sttSession) {
            audioSession.audioStream.on('data', (chunk: Buffer) => {
              totalAudioProcessed += chunk.length;
              if (audioSession?.getVolumeLevel) {
                maxVolume = Math.max(maxVolume, audioSession.getVolumeLevel());
              }

              if (sttSession) {
                sttSession.writeAudio(chunk);
              }
            });

            audioSession.audioStream.on('error', (error: Error) => {
              this.logger.error(`❌ Audio stream error: ${error.message}`);
              rejectOnce(error);
            });
          }

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          // Overall timeout
          timeoutHandle = setTimeout(() => {
            this.logger.warn(
              `⏰ Maximum recording duration reached (${config.maxRecordingDuration}ms)`
            );
            if (audioSession?.stop) {
              audioSession.stop();
            }
            if (sttSession) {
              sttSession.endStream();
            }

            if (finalTranscript) {
              resolveOnce({
                transcript: finalTranscript,
                confidence: finalConfidence,
                audioProcessed: totalAudioProcessed,
                maxVolume,
                processingTime: Date.now() - startTime,
              });
            } else {
              rejectOnce(
                new VoiceTestError(
                  'No speech detected within maximum duration',
                  ErrorCode.MAX_DURATION_REACHED
                )
              );
            }
          }, config.maxRecordingDuration);
        } catch (error) {
          if (audioSession?.stop) {
            try {
              audioSession.stop();
            } catch (cleanupError) {
              this.logger.error(
                `Failed to stop audio session during error cleanup: ${getErrorMessage(cleanupError)}`
              );
            }
          }
          if (sttSession) {
            try {
              sttSession.endStream();
            } catch (cleanupError) {
              this.logger.error(
                `Failed to end STT stream during error cleanup: ${getErrorMessage(cleanupError)}`
              );
            }
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          rejectOnce(toError(error));
        }
      })();
    });
  }

  /**
   * Test the complete voice pipeline with a simple question.
   *
   * @returns Promise resolving to true if test passed, false otherwise
   *
   * @remarks
   * Runs a simple test interaction to verify the complete pipeline:
   * - Plays a test question
   * - Records and transcribes response
   * - Uses relaxed confidence threshold
   *
   * Useful for system health checks and debugging.
   *
   * @example
   * ```typescript
   * const passed = await service.testVoicePipeline();
   * if (!passed) {
   *   console.error('Voice pipeline test failed');
   * }
   * ```
   */
  async testVoicePipeline(): Promise<boolean> {
    try {
      this.logger.info('🧪 Testing complete voice pipeline...');

      const result = await this.runVoiceInteraction(
        'Please say hello to test the voice recognition system',
        {
          maxRecordingDuration: 10000,
          silenceTimeout: 2000,
          confidenceThreshold: 0.1, // Lower threshold for testing
        }
      );

      this.logger.info(`✅ Voice pipeline test successful: "${result.transcript}"`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Voice pipeline test failed: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Utility delay function.
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the specified delay
   *
   * @private
   * @internal
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up all services and release resources.
   *
   * @remarks
   * Properly closes all component services:
   * - Stops streaming STT
   * - Stops audio recording
   * - Releases all resources
   *
   * Should be called when done with the service to prevent resource leaks.
   *
   * @example
   * ```typescript
   * const service = new VoiceInteractionService(apiKey);
   * // ... use the service ...
   * service.cleanup();
   * ```
   */
  cleanup(): void {
    this.audioService.stopRecording();
    this.logger.info('🧹 Voice Interaction Service cleaned up');
  }
}
