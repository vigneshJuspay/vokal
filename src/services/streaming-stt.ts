/**
 * Streaming Speech-to-Text Service
 * Uses Google Cloud Speech-to-Text streaming API with proper voice activity detection
 */

import speech from '@google-cloud/speech';
import type { protos } from '@google-cloud/speech';
import { ConsoleLogger } from '../utils/logger.js';
import { VoiceTestError, getErrorMessage, toError } from '../types/index.js';

// Type aliases for cleaner code
type IStreamingRecognitionConfig = protos.google.cloud.speech.v1.IStreamingRecognitionConfig;
type IStreamingRecognizeResponse = protos.google.cloud.speech.v1.IStreamingRecognizeResponse;
type AudioEncoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

export interface StreamingSTTConfig {
  languageCode: string;
  sampleRateHertz: number;
  encoding: 'LINEAR16' | 'WEBM_OPUS' | 'MP3';
  speechStartTimeout?: number; // seconds to wait for speech to start (default: 10)
  speechEndTimeout?: number; // seconds of silence to end speech (default: 4)
}

export interface StreamingSTTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  stability?: number;
  speechEventType?:
    | 'SPEECH_EVENT_UNSPECIFIED'
    | 'END_OF_SINGLE_UTTERANCE'
    | 'SPEECH_ACTIVITY_BEGIN'
    | 'SPEECH_ACTIVITY_END';
}

export class StreamingSTTService {
  private client: InstanceType<typeof speech.SpeechClient>;
  private logger: ConsoleLogger;
  private isActive = false;
  private config: StreamingSTTConfig;
  private audioChunksReceived = 0;
  private totalBytesReceived = 0;

  constructor(apiKey?: string) {
    this.logger = new ConsoleLogger();

    // Check for service account credentials first (preferred)
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Try to use service account, fall back to API key
    if (serviceAccountPath) {
      try {
        // Initialize with service account (supports full features including voiceActivityTimeout)
        this.client = new speech.SpeechClient({
          keyFilename: serviceAccountPath,
        });
        this.logger.info(
          '🔑 Using service account authentication (full feature support including VAD timeouts)'
        );
      } catch (error) {
        this.logger.warn(
          `⚠️ Service account init failed, trying API key: ${getErrorMessage(error)}`
        );
        // Fall back to API key
        const key = apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (!key) {
          throw new VoiceTestError(
            'GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_AI_API_KEY required for STT',
            'MISSING_CREDENTIALS'
          );
        }
        this.client = new speech.SpeechClient({
          apiKey: key,
        });
        this.logger.info('🔑 Using API key authentication (limited feature support)');
      }
    } else {
      // API key only
      const key = apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (!key) {
        throw new VoiceTestError(
          'GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required for STT',
          'MISSING_API_KEY'
        );
      }
      this.client = new speech.SpeechClient({
        apiKey: key,
      });
      this.logger.info('🔑 Using API key authentication (limited feature support)');
    }

    // Default configuration optimized for voice bot interaction
    this.config = {
      languageCode: 'en-US',
      sampleRateHertz: 16000,
      encoding: 'LINEAR16',
      speechStartTimeout: 45, // 45 seconds to start speaking (initial wait)
      speechEndTimeout: 2, // 2 seconds safety buffer after speech ends
    };

    this.logger.info('🎤 Streaming STT Service initialized with Voice Activity Detection');
  }

  /**
   * Start streaming recognition with hybrid VAD (Google events + manual timers)
   * Google tells us when speech starts/stops, we control the timeout durations
   */
  startStreaming(
    config: Partial<StreamingSTTConfig> = {},
    onResult: (result: StreamingSTTResult) => void,
    onSpeechStart: () => void = (): void => {},
    onSpeechEnd: () => void = (): void => {},
    onError: (error: Error) => void = (err): void => {
      throw err;
    }
  ): {
    writeAudio: (audioChunk: Buffer) => void;
    endStream: () => void;
    isActive: () => boolean;
  } {
    // Merge configuration
    this.config = { ...this.config, ...config };

    this.logger.info('🚀 Starting streaming speech recognition with Hybrid VAD...');
    this.logger.info(
      `📊 Config: ${this.config.languageCode}, ${this.config.sampleRateHertz}Hz, ${this.config.encoding}`
    );
    this.logger.info(
      `⏱️ Manual Timeouts: Initial Wait=${this.config.speechStartTimeout}s, Silence After Speech=${this.config.speechEndTimeout}s`
    );

    this.isActive = true;
    this.audioChunksReceived = 0;
    this.totalBytesReceived = 0;

    // ✅ Hybrid VAD: Manual timer management
    let silenceTimer: NodeJS.Timeout | null = null;
    let initialWaitTimer: NodeJS.Timeout | null = null;
    let speechHasStarted = false;
    let speechHasEnded = false; // Track if SPEECH_ACTIVITY_END has fired

    const SPEECH_START_WAIT_MS = (this.config.speechStartTimeout || 45) * 1000; // Default 45s
    const SPEECH_END_WAIT_MS = (this.config.speechEndTimeout || 2) * 1000; // Default 2s safety buffer

    // Helper to clear silence timer
    const resetSilenceTimer = (): void => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    // Helper to clear initial wait timer
    const resetInitialWaitTimer = (): void => {
      if (initialWaitTimer) {
        clearTimeout(initialWaitTimer);
        initialWaitTimer = null;
      }
    };

    // Helper to cleanup all timers
    const cleanupTimers = (): void => {
      resetSilenceTimer();
      resetInitialWaitTimer();
    };

    // Map string encoding to AudioEncoding enum
    let audioEncoding: AudioEncoding;
    switch (this.config.encoding) {
      case 'LINEAR16':
        audioEncoding = 1; // LINEAR16
        break;
      case 'WEBM_OPUS':
        audioEncoding = 9; // WEBM_OPUS
        break;
      case 'MP3':
        audioEncoding = 8; // MP3
        break;
      default:
        audioEncoding = 1; // Default to LINEAR16
    }

    // ✅ HYBRID VAD CONFIG: We get Google's events, but NO server-side timeout
    // This prevents the 300ms crash while keeping accurate speech detection
    const request: IStreamingRecognitionConfig = {
      config: {
        encoding: audioEncoding,
        sampleRateHertz: this.config.sampleRateHertz,
        languageCode: this.config.languageCode,
        model: 'video',
        useEnhanced: true,
        enableAutomaticPunctuation: true,
      },
      interimResults: true,

      // ✅ KEEP: Google tells us when speech starts/stops (accurate AI detection)
      enableVoiceActivityEvents: true,
    };

    this.logger.info(
      `🔧 Hybrid VAD enabled: Google detects speech, we control ${SPEECH_START_WAIT_MS / 1000}s/${SPEECH_END_WAIT_MS / 1000}s timeouts`
    );

    // Use the high-level streamingRecognize method (NOT _streamingRecognize)
    // This method handles the config wrapping automatically
    // Google Cloud SDK streams have known TypeScript typing limitations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const recognizeStream = this.client.streamingRecognize(request);

    // ✅ Start initial wait timer: If no speech starts in 45s, timeout
    initialWaitTimer = setTimeout(() => {
      if (!speechHasStarted) {
        this.logger.warn(
          `⏰ Initial wait timeout: No speech detected in ${SPEECH_START_WAIT_MS / 1000}s`
        );
        cleanupTimers();
        this.isActive = false;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        recognizeStream.end();
        onError(new Error('NO_SPEECH_DETECTED_IN_INITIAL_WAIT'));
      }
    }, SPEECH_START_WAIT_MS);

    this.logger.info(
      `⏱️ Initial wait timer started: ${SPEECH_START_WAIT_MS / 1000}s to start speaking`
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    recognizeStream.on('error', (error: Error) => {
      this.logger.error(`❌ Streaming error: ${getErrorMessage(error)}`);
      cleanupTimers();
      this.isActive = false;
      onError(toError(error));
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    recognizeStream.on('data', (data: IStreamingRecognizeResponse) => {
      // Handle voice activity events
      if (data.speechEventType) {
        this.logger.info(`🎯 Speech Event: ${String(data.speechEventType)}`);

        // ✅ 1. User STARTED speaking -> Just log it (don't cancel timer yet)
        // Timer will be cancelled when we get actual transcripts
        if (data.speechEventType === 'SPEECH_ACTIVITY_BEGIN') {
          this.logger.info('🗣️ Audio activity detected (waiting for transcripts...)');
          resetSilenceTimer(); // Cancel any silence timer
          onSpeechStart();
        } else if (
          // ✅ 2. User STOPPED speaking -> Start 2s "silence" timer
          data.speechEventType === 'SPEECH_ACTIVITY_END' ||
          data.speechEventType === 'END_OF_SINGLE_UTTERANCE'
        ) {
          this.logger.info(
            `🛑 User stopped speaking. Starting ${SPEECH_END_WAIT_MS / 1000}s silence timer...`
          );

          speechHasEnded = true; // Mark that speech has ended
          resetSilenceTimer(); // Clear any existing timer
          silenceTimer = setTimeout(() => {
            this.logger.info(`⏳ ${SPEECH_END_WAIT_MS / 1000}s of silence passed. Closing stream.`);
            cleanupTimers();
            this.isActive = false;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            recognizeStream.end();
            onSpeechEnd();
          }, SPEECH_END_WAIT_MS);
        } else if (data.speechEventType === 'SPEECH_ACTIVITY_TIMEOUT') {
          // ✅ 3. Google's timeout event -> Ignore (we manage our own timers)
          this.logger.info(`ℹ️ Google VAD timeout event (ignored - using manual timers instead)`);
          // Don't end the stream - our manual timers are in control
        }
      }

      // ✅ 4. Got a transcript (interim or final)
      // - First transcript: Cancel 45s initial wait timer (proves user is speaking)
      // - Subsequent transcripts: Reset silence timer (user might be pausing)
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        if (!result) {
          return;
        }

        const alternative = result.alternatives?.[0];

        if (alternative && alternative.transcript) {
          const trimmedTranscript = String(alternative.transcript).trim();

          // ✅ First MEANINGFUL transcript received -> Cancel initial wait timer!
          // Only cancel timer if transcript has actual content (at least one word)
          if (!speechHasStarted && trimmedTranscript.length > 0) {
            this.logger.info(
              `✅ First meaningful transcript received: "${trimmedTranscript}" - canceling initial wait timer`
            );
            speechHasStarted = true;
            resetInitialWaitTimer(); // Cancel 45s "waiting for speech" timer
          }

          // Reset silence timer ONLY if speech hasn't ended yet
          // Once SPEECH_ACTIVITY_END fires, don't reset the timer anymore
          if (!speechHasEnded && trimmedTranscript.length > 0) {
            resetSilenceTimer();
          }

          // Convert speechEventType to our expected type
          let speechEventType: StreamingSTTResult['speechEventType'] = undefined;
          if (data.speechEventType) {
            const eventTypeStr = String(data.speechEventType);
            if (
              eventTypeStr === 'SPEECH_EVENT_UNSPECIFIED' ||
              eventTypeStr === 'END_OF_SINGLE_UTTERANCE' ||
              eventTypeStr === 'SPEECH_ACTIVITY_BEGIN' ||
              eventTypeStr === 'SPEECH_ACTIVITY_END'
            ) {
              speechEventType = eventTypeStr;
            }
          }

          const sttResult: StreamingSTTResult = {
            transcript: trimmedTranscript,
            confidence: Number(alternative.confidence) || 0,
            isFinal: Boolean(result.isFinal),
            stability: Number(result.stability) || 0,
            speechEventType,
          };

          // Only process and log non-empty transcripts
          if (trimmedTranscript.length > 0) {
            if (result.isFinal) {
              this.logger.info(
                `📝 FINAL: "${sttResult.transcript}" (confidence: ${(sttResult.confidence * 100).toFixed(1)}%)`
              );
            } else {
              this.logger.info(`💬 Interim: "${sttResult.transcript}"`);
            }

            onResult(sttResult);
          }
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    recognizeStream.on('end', () => {
      this.logger.info('✅ Stream ended');
      cleanupTimers();
      this.isActive = false;
    });

    return {
      writeAudio: (audioChunk: Buffer): void => {
        if (this.isActive) {
          this.audioChunksReceived++;
          this.totalBytesReceived += audioChunk.length;

          // Log every 50 chunks to avoid spam
          if (this.audioChunksReceived % 50 === 1) {
            this.logger.info(
              `🎧 Audio flowing: ${this.audioChunksReceived} chunks, ${this.totalBytesReceived} bytes total`
            );
          }

          // Write raw audio buffer - the helper wraps it in {audioContent} automatically
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          recognizeStream.write(audioChunk);
        }
      },

      endStream: (): void => {
        this.logger.info(
          `🛑 Manually ending stream... (received ${this.audioChunksReceived} chunks, ${this.totalBytesReceived} bytes)`
        );
        cleanupTimers();
        this.isActive = false;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        recognizeStream.end();
      },

      isActive: (): boolean => this.isActive,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.isActive = false;
    this.logger.info('🧹 Streaming STT Service cleaned up');
  }
}
