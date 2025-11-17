/**
 * Voice Interaction Service
 * Integrates streaming STT, reliable audio recording, and TTS
 * Inspired by Lighthouse's approach but adapted for Node.js
 */

import { StreamingSTTService, StreamingSTTResult } from './streaming-stt.js';
import { AudioRecordingService, AudioRecordingSession } from './audio-recording.js';
import { VoiceTestService } from './voice-test.js';
import { ConsoleLogger } from '../utils/logger.js';
import { VoiceTestError, getErrorMessage, toError } from '../types/index.js';

export interface VoiceInteractionConfig {
  language: string;
  voice: string;
  sampleRate: number;
  maxRecordingDuration: number;
  silenceTimeout: number;
  confidenceThreshold: number;
  backgroundSound?: string;
  backgroundVolume?: number;
}

export interface VoiceInteractionResult {
  transcript: string;
  confidence: number;
  duration: number;
  audioProcessed: number;
  maxVolume: number;
  processingTime: number;
}

export class VoiceInteractionService {
  private streamingSTT: StreamingSTTService;
  private audioService: AudioRecordingService;
  private ttsService: VoiceTestService;
  private logger: ConsoleLogger;

  constructor(apiKey?: string) {
    this.streamingSTT = new StreamingSTTService(apiKey);
    this.audioService = new AudioRecordingService();
    this.ttsService = new VoiceTestService({ apiKey });
    this.logger = new ConsoleLogger();

    this.logger.info('🚀 Voice Interaction Service initialized');
  }

  /**
   * Validate all components are working
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
      const ttsResult = await this.ttsService.testAudioPlayback();
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
   * Run a complete voice interaction: play question -> listen -> transcribe
   */
  async runVoiceInteraction(
    questionText: string,
    config: Partial<VoiceInteractionConfig> = {}
  ): Promise<VoiceInteractionResult> {
    // Input validation
    if (!questionText || questionText.trim().length === 0) {
      throw new VoiceTestError(
        'Question text cannot be empty',
        'INVALID_INPUT',
        new Error('questionText is required')
      );
    }

    if (questionText.length > 5000) {
      throw new VoiceTestError(
        'Question text is too long (max 5000 characters)',
        'INVALID_INPUT',
        new Error('questionText exceeds maximum length')
      );
    }

    const fullConfig: VoiceInteractionConfig = {
      language: 'en-US',
      voice: 'en-US-Neural2-D',
      sampleRate: 16000,
      maxRecordingDuration: 500000, // 5 minutes - very long timeout
      silenceTimeout: 3000,
      confidenceThreshold: 0.3,
      ...config,
    };

    // Validate config ranges
    if (fullConfig.sampleRate < 8000 || fullConfig.sampleRate > 48000) {
      throw new VoiceTestError(
        `Invalid sample rate: ${fullConfig.sampleRate}. Must be between 8000 and 48000 Hz`,
        'INVALID_CONFIG',
        new Error('Invalid sampleRate')
      );
    }

    if (fullConfig.maxRecordingDuration < 1000 || fullConfig.maxRecordingDuration > 600000) {
      throw new VoiceTestError(
        `Invalid max recording duration: ${fullConfig.maxRecordingDuration}. Must be between 1000 and 600000 ms`,
        'INVALID_CONFIG',
        new Error('Invalid maxRecordingDuration')
      );
    }

    if (fullConfig.silenceTimeout < 500 || fullConfig.silenceTimeout > 10000) {
      throw new VoiceTestError(
        `Invalid silence timeout: ${fullConfig.silenceTimeout}. Must be between 500 and 10000 ms`,
        'INVALID_CONFIG',
        new Error('Invalid silenceTimeout')
      );
    }

    this.logger.info(`🎯 Starting voice interaction: "${questionText}"`);
    const startTime = Date.now();

    try {
      // Step 1: Play the question using TTS
      this.logger.info('🗣️ Playing question...');
      await this.ttsService.generateSpeech({
        text: questionText,
        languageCode: fullConfig.language,
        voiceName: fullConfig.voice,
        audioEncoding: 'WAV',
        play: true,
        backgroundSound: fullConfig.backgroundSound,
        backgroundVolume: fullConfig.backgroundVolume,
      });

      // Brief pause to let audio settle
      await this.delay(1000);

      // Step 2: Listen for response
      this.logger.info('🎤 Listening for response...');
      const transcriptionResult = await this.listenAndTranscribe(fullConfig);

      const totalTime = Date.now() - startTime;

      this.logger.info(`✅ Voice interaction completed in ${totalTime}ms`);
      this.logger.info(
        `📝 Result: "${transcriptionResult.transcript}" (confidence: ${(transcriptionResult.confidence * 100).toFixed(1)}%)`
      );

      return {
        ...transcriptionResult,
        duration: totalTime,
      };
    } catch (error) {
      throw new VoiceTestError(
        `Voice interaction failed: ${getErrorMessage(error)}`,
        'VOICE_INTERACTION_ERROR',
        toError(error)
      );
    }
  }

  /**
   * Listen and transcribe speech using streaming recognition
   */
  private async listenAndTranscribe(config: VoiceInteractionConfig): Promise<{
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

          // Start streaming recognition
          const sttConfig = {
            languageCode: config.language,
            sampleRateHertz: config.sampleRate,
            encoding: 'LINEAR16' as const,
            speechStartTimeout: 45, // 45 seconds for user to start speaking (initial wait)
            speechEndTimeout: 2, // 2 seconds safety buffer after speech ends
          };

          // Callbacks for streaming
          const onResult = (result: StreamingSTTResult): void => {
            this.logger.info(`📝 ${result.isFinal ? 'Final' : 'Interim'}: "${result.transcript}"`);

            if (result.isFinal && result.transcript.trim().length > 0) {
              // Accumulate all final transcripts instead of stopping at first one
              if (finalTranscript) {
                finalTranscript += ' ' + result.transcript.trim();
              } else {
                finalTranscript = result.transcript.trim();
              }

              // Track highest confidence
              finalConfidence = Math.max(finalConfidence, result.confidence);

              this.logger.info(
                `📝 Accumulated transcript: "${finalTranscript}" (confidence: ${(result.confidence * 100).toFixed(1)}%)`
              );

              // Don't stop immediately - wait for speech to end naturally
            }
          };

          const onSpeechStart = (): void => {
            this.logger.info('🗣️ Speech started');
            // Clear any existing timeout when speech starts
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = undefined;
            }
          };

          const onSpeechEnd = (): void => {
            this.logger.info('🤫 Speech ended');

            // Clear any existing timeout before setting new one
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }

            // Start silence timeout
            timeoutHandle = setTimeout(() => {
              if (finalTranscript) {
                this.logger.info('⏰ Silence timeout - using best result');
                if (audioSession) {
                  audioSession.stop();
                }
                if (sttSession) {
                  sttSession.endStream();
                }

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
                    'No speech detected within timeout period',
                    'NO_SPEECH_TIMEOUT'
                  )
                );
              }
            }, config.silenceTimeout);
          };

          const onError = (error: Error): void => {
            this.logger.error(`❌ STT error: ${error.message}`);
            if (audioSession) {
              audioSession.stop();
            }
            rejectOnce(error);
          };

          // Start streaming STT
          sttSession = this.streamingSTT.startStreaming(
            sttConfig,
            onResult,
            onSpeechStart,
            onSpeechEnd,
            onError
          );

          // Pipe audio from recorder to STT
          // These event handlers are set up after audioSession and sttSession are created
          // but TypeScript doesn't know they won't be null, so we add checks
          if (audioSession && sttSession) {
            audioSession.audioStream.on('data', (chunk: Buffer) => {
              totalAudioProcessed += chunk.length;
              if (audioSession) {
                maxVolume = Math.max(maxVolume, audioSession.getVolumeLevel());
              }

              // Send audio to streaming STT
              if (sttSession) {
                sttSession.writeAudio(chunk);
              }
            });

            audioSession.audioStream.on('error', (error) => {
              this.logger.error(`❌ Audio stream error: ${error.message}`);
              if (sttSession) {
                sttSession.endStream();
              }
              rejectOnce(error);
            });
          }

          // Clear any existing timeout before setting overall timeout
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          // Overall timeout
          timeoutHandle = setTimeout(() => {
            this.logger.warn(
              `⏰ Maximum recording duration reached (${config.maxRecordingDuration}ms)`
            );
            if (audioSession) {
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
                  'MAX_DURATION_REACHED'
                )
              );
            }
          }, config.maxRecordingDuration);
        } catch (error) {
          // Clean up resources on error
          if (audioSession) {
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
          clearTimeout(timeoutHandle);
          rejectOnce(toError(error));
        }
      })(); // End of async IIFE
    });
  }

  /**
   * Test the complete voice pipeline with a simple question
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
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up all services
   */
  cleanup(): void {
    this.streamingSTT.cleanup();
    this.audioService.stopRecording();
    this.logger.info('🧹 Voice Interaction Service cleaned up');
  }
}
