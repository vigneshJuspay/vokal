/**
 * Google AI STT Handler
 *
 * Speech-to-Text handler for Google Cloud Speech-to-Text API.
 * Implements the STTHandler interface following Neurolink's handler pattern.
 *
 * @module providers/google-ai-stt
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * import { GoogleAISTTHandler } from './providers/google-ai-stt.handler.js';
 *
 * const handler = new GoogleAISTTHandler();
 *
 * if (handler.isConfigured()) {
 *   const result = await handler.transcribe({
 *     audio: audioBuffer,
 *     encoding: 'LINEAR16',
 *     sampleRate: 16000,
 *     languageCode: 'en-US'
 *   });
 *   console.log('Transcript:', result.transcript);
 * }
 * ```
 */

import { SpeechClient } from '@google-cloud/speech';
import type { google } from '@google-cloud/speech/build/protos/protos.js';
import type {
  STTHandler,
  STTRequest,
  STTResponse,
  StreamingSTTConfig,
  StreamingSTTResult,
  StreamingSession,
} from '../types/stt-provider.types.js';
import { createComponentLogger } from '../utils/logger.js';
import { VoiceTestError, ErrorCode } from '../errors/voice-test.errors.js';

const logger = createComponentLogger('GoogleAISTT');

/**
 * Stream data interface for Google Cloud Speech API responses
 */
interface StreamData {
  speechEventType?: string;
  results?: Array<{
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
    }>;
    isFinal?: boolean;
    stability?: number;
  }>;
}

/**
 * Map our encoding strings to Google Cloud Speech API encoding types
 */
function mapEncodingToGoogleType(
  encoding: string
): google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  const encodingMap: Record<string, google.cloud.speech.v1.RecognitionConfig.AudioEncoding> = {
    LINEAR16: 1, // LINEAR16
    FLAC: 2, // FLAC
    MULAW: 3, // MULAW
    AMR: 4, // AMR
    AMR_WB: 5, // AMR_WB
    OGG_OPUS: 6, // OGG_OPUS
    SPEEX_WITH_HEADER_BYTE: 7, // SPEEX_WITH_HEADER_BYTE
    MP3: 8, // MP3
    WEBM_OPUS: 9, // WEBM_OPUS
  };

  return encodingMap[encoding] || 1; // Default to LINEAR16
}

/**
 * Google AI STT Handler
 *
 * @implements {STTHandler}
 */
export class GoogleAISTTHandler implements STTHandler {
  private client: SpeechClient | null = null;
  private apiKey: string | null = null;

  /**
   * Create a new Google AI STT handler
   *
   * @param apiKey - Optional Google Cloud API key (not used - service account credentials are used instead)
   */
  constructor() {
    // Google Cloud Speech-to-Text requires service account authentication
    // It does NOT accept simple API keys like Gemini does
    // We check for GOOGLE_APPLICATION_CREDENTIALS environment variable
    this.apiKey = process.env.GOOGLE_APPLICATION_CREDENTIALS || null;

    if (this.isConfigured()) {
      this.initialize();
    }
  }

  /**
   * Initialize the Google Speech client
   *
   * @private
   */
  private initialize(): void {
    try {
      // Always use service account credentials (default authentication)
      // Google Cloud Speech API doesn't accept simple API keys
      this.client = new SpeechClient();

      logger.info('✅ Google AI STT handler initialized with service account');
    } catch (error) {
      logger.error('❌ Failed to initialize Google AI STT:', error);
      throw new VoiceTestError(
        'Failed to initialize Google AI STT client. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.',
        ErrorCode.STT_INITIALIZATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Check if the handler is properly configured
   *
   * @returns True if service account credentials are available
   */
  isConfigured(): boolean {
    return !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text
   *
   * @param request - STT transcription request
   * @returns Transcription response with metadata
   *
   * @throws {VoiceTestError} If handler is not configured or transcription fails
   */
  async transcribe(request: STTRequest): Promise<STTResponse> {
    if (!this.isConfigured()) {
      throw new VoiceTestError(
        'Google AI STT is not configured. Please provide GOOGLE_AI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS',
        ErrorCode.STT_NOT_CONFIGURED
      );
    }

    if (!this.client) {
      this.initialize();
    }

    const startTime = Date.now();

    try {
      logger.debug(`🎤 Transcribing audio: ${request.audio.length} bytes`);

      const [response] = await this.client!.recognize({
        audio: {
          content: request.audio.toString('base64'),
        },
        config: {
          encoding: mapEncodingToGoogleType(request.encoding),
          sampleRateHertz: request.sampleRate,
          languageCode: request.languageCode,
          model: request.model || 'latest_short',
          enableAutomaticPunctuation: request.enableAutomaticPunctuation ?? true,
          maxAlternatives: request.maxAlternatives || 1,
          speechContexts: request.speechContexts?.map((ctx) => ({
            phrases: ctx.phrases,
            boost: ctx.boost,
          })),
        },
      });

      const latency = Date.now() - startTime;

      if (!response.results || response.results.length === 0) {
        logger.warn('⚠️ No transcription results from Google AI');
        return {
          transcript: '',
          confidence: 0,
          provider: 'google-ai',
          latency,
        };
      }

      const result = response.results[0];
      const alternative = result.alternatives?.[0];

      if (!alternative) {
        return {
          transcript: '',
          confidence: 0,
          provider: 'google-ai',
          latency,
        };
      }

      const transcript = alternative.transcript || '';
      const confidence = alternative.confidence || 0;

      // Extract alternatives
      const alternatives = result.alternatives?.slice(1).map((alt) => ({
        transcript: alt.transcript || '',
        confidence: alt.confidence || 0,
      }));

      // Extract word timing information
      const words = alternative.words?.map((word) => {
        const startSeconds = word.startTime?.seconds ? Number(word.startTime.seconds) : 0;
        const startNanos = word.startTime?.nanos || 0;
        const endSeconds = word.endTime?.seconds ? Number(word.endTime.seconds) : 0;
        const endNanos = word.endTime?.nanos || 0;

        return {
          word: word.word || '',
          startTime: startSeconds + startNanos / 1e9,
          endTime: endSeconds + endNanos / 1e9,
          confidence: word.confidence || 0,
        };
      });

      logger.info(
        `✅ Transcription complete: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%, latency: ${latency}ms)`
      );

      return {
        transcript,
        confidence,
        alternatives,
        words,
        provider: 'google-ai',
        latency,
      };
    } catch (error) {
      logger.error('❌ Transcription failed:', error);
      throw new VoiceTestError(
        'Google AI transcription failed',
        ErrorCode.STT_TRANSCRIPTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Start streaming transcription session
   * Implements Hybrid VAD (Google events + manual timers)
   */
  startStreaming(
    config: StreamingSTTConfig,
    onResult: (result: StreamingSTTResult) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void,
    onError?: (error: Error) => void
  ): StreamingSession {
    if (!this.isConfigured()) {
      throw new VoiceTestError('Google AI STT is not configured', ErrorCode.STT_NOT_CONFIGURED);
    }

    if (!this.client) {
      this.initialize();
    }

    let isActive = true;
    let speechStarted = false;
    let audioActivityDetected = false;
    let firstMeaningfulTranscript = false;
    let initialWaitTimer: NodeJS.Timeout | null = null;
    let speechEndTimer: NodeJS.Timeout | null = null;
    let audioChunkCount = 0;
    let totalAudioBytes = 0;

    // Hybrid VAD timeouts
    const initialWaitTimeout = config.speechStartTimeout ? config.speechStartTimeout * 1000 : 45000; // 45s default
    const silenceDuration = config.speechEndTimeout ? config.speechEndTimeout * 1000 : 2000; // 2s default

    logger.info('🚀 Starting streaming speech recognition with Hybrid VAD...');
    logger.info(`📊 Config: ${config.languageCode}, ${config.sampleRate}Hz, ${config.encoding}`);
    logger.info(
      `🔧 Hybrid VAD enabled: Google detects speech, we control ${initialWaitTimeout / 1000}s/${silenceDuration / 1000}s timeouts`
    );

    // Create streaming recognize request
    const recognizeStream = this.client!.streamingRecognize({
      config: {
        encoding: mapEncodingToGoogleType(config.encoding),
        sampleRateHertz: config.sampleRate,
        languageCode: config.languageCode,
        model: config.model || 'latest_short',
        enableAutomaticPunctuation: true,
        // @ts-expect-error - enableVoiceActivityEvents exists in the API but not in TypeScript types
        enableVoiceActivityEvents: true,
        speechContexts: config.speechContexts?.map((ctx) => ({
          phrases: ctx.phrases,
          boost: ctx.boost,
        })),
      },
      interimResults: config.interimResults ?? true,
    });

    // Start initial wait timer
    logger.info(`⏱️ Initial wait timer started: ${initialWaitTimeout / 1000}s to start speaking`);
    initialWaitTimer = setTimeout(() => {
      if (!firstMeaningfulTranscript && isActive) {
        logger.warn('⏰ Initial wait timeout - no speech detected');
        if (onError) {
          onError(new Error('No speech detected within timeout period'));
        }
      }
    }, initialWaitTimeout);

    // Handle streaming results
    recognizeStream.on('data', (data: unknown) => {
      if (!isActive) {
        return;
      }

      const streamData = data as StreamData;

      // Log speech events from Google
      if (streamData.speechEventType) {
        logger.info(`🎯 Speech Event: ${streamData.speechEventType}`);

        if (streamData.speechEventType === 'SPEECH_EVENT_SPEECH_ACTIVITY_BEGIN') {
          if (!audioActivityDetected) {
            audioActivityDetected = true;
            logger.info('🗣️ Audio activity detected (waiting for transcripts...)');
          }
          if (!speechStarted) {
            speechStarted = true;
            if (onSpeechStart) {
              onSpeechStart();
            }
            logger.info('🗣️ Speech started');
          }
          // Clear speech end timer if new speech detected
          if (speechEndTimer) {
            clearTimeout(speechEndTimer);
            speechEndTimer = null;
          }
        } else if (streamData.speechEventType === 'SPEECH_EVENT_SPEECH_ACTIVITY_END') {
          logger.info('🛑 User stopped speaking. Starting 2s silence timer...');
          logger.info(
            `🔍 Current state: speechStarted=${speechStarted}, speechEndTimer=${speechEndTimer ? 'active' : 'null'}`
          );

          // Clear any existing timer
          if (speechEndTimer) {
            clearTimeout(speechEndTimer);
          }
          // Start speech end timer
          speechEndTimer = setTimeout(() => {
            logger.info('⏳ 2s of silence passed. Calling onSpeechEnd callback...');
            if (onSpeechEnd) {
              logger.info('📞 Calling onSpeechEnd callback now!');
              onSpeechEnd();
            } else {
              logger.warn('⚠️ onSpeechEnd callback is undefined!');
            }
          }, silenceDuration);
          logger.info(`⏱️ Silence timer set for ${silenceDuration}ms`);
        } else if (streamData.speechEventType === 'END_OF_SINGLE_UTTERANCE') {
          // Google detected end of utterance - user stopped speaking
          logger.info('🛑 END_OF_SINGLE_UTTERANCE detected. Starting 2s silence timer...');
          logger.info(
            `🔍 Current state: speechStarted=${speechStarted}, speechEndTimer=${speechEndTimer ? 'active' : 'null'}`
          );

          // Clear any existing timer
          if (speechEndTimer) {
            clearTimeout(speechEndTimer);
          }
          // Start speech end timer - keep listening during this time
          speechEndTimer = setTimeout(() => {
            logger.info('⏳ 2s of silence passed. Calling onSpeechEnd callback...');
            if (onSpeechEnd) {
              logger.info('📞 Calling onSpeechEnd callback now!');
              onSpeechEnd();
            } else {
              logger.warn('⚠️ onSpeechEnd callback is undefined!');
            }
          }, silenceDuration);
          logger.info(
            `⏱️ Silence timer set for ${silenceDuration}ms (still listening for new speech)`
          );
        }
      }

      // Handle transcription results
      if (streamData.results && streamData.results.length > 0) {
        const result = streamData.results[0];
        const alternative = result.alternatives?.[0];

        if (alternative && alternative.transcript && alternative.transcript.trim().length > 0) {
          // Cancel initial wait timer on first meaningful transcript
          if (!firstMeaningfulTranscript && initialWaitTimer) {
            firstMeaningfulTranscript = true;
            clearTimeout(initialWaitTimer);
            initialWaitTimer = null;
            logger.info(
              `✅ First meaningful transcript received: "${alternative.transcript}" - canceling initial wait timer`
            );
          }

          // Notify speech start on first transcript (backup if VAD events don't fire)
          if (!speechStarted && onSpeechStart) {
            speechStarted = true;
            onSpeechStart();
            logger.info('🗣️ Speech started (detected via transcript)');
          }

          const streamingResult: StreamingSTTResult = {
            transcript: alternative.transcript || '',
            confidence: alternative.confidence || 0,
            isFinal: result.isFinal || false,
            stability: result.stability || 0,
          };

          // Log interim vs final
          if (result.isFinal) {
            logger.info(
              `📝 FINAL: "${alternative.transcript}" (confidence: ${((alternative.confidence || 0) * 100).toFixed(1)}%)`
            );
          } else {
            logger.info(`💬 Interim: "${alternative.transcript}"`);
          }

          onResult(streamingResult);
        }
      }
    });

    // Handle errors
    recognizeStream.on('error', (error: Error) => {
      if (!isActive) {
        return;
      }

      logger.error('❌ Streaming error:', error);
      if (initialWaitTimer) {
        clearTimeout(initialWaitTimer);
      }
      if (speechEndTimer) {
        clearTimeout(speechEndTimer);
      }
      if (onError) {
        onError(error);
      }
      isActive = false;
    });

    // Handle stream end
    recognizeStream.on('end', () => {
      logger.info('✅ Stream ended');
      if (initialWaitTimer) {
        clearTimeout(initialWaitTimer);
      }
      if (speechEndTimer) {
        clearTimeout(speechEndTimer);
      }
      isActive = false;
    });

    logger.info('🎙️ Started streaming transcription session with Hybrid VAD');

    // Return session control interface
    return {
      writeAudio: (chunk: Buffer): void => {
        if (isActive) {
          audioChunkCount++;
          totalAudioBytes += chunk.length;

          // Log audio flowing periodically
          if (audioChunkCount % 10 === 1) {
            logger.info(
              `🎧 Audio flowing: ${audioChunkCount} chunks, ${totalAudioBytes} bytes total`
            );
          }

          recognizeStream.write(chunk);
        }
      },
      endStream: (): void => {
        if (isActive) {
          if (initialWaitTimer) {
            clearTimeout(initialWaitTimer);
          }
          if (speechEndTimer) {
            clearTimeout(speechEndTimer);
          }
          logger.info(
            `🛑 Manually ending stream... (received ${audioChunkCount} chunks, ${totalAudioBytes} bytes)`
          );
          recognizeStream.end();
          isActive = false;
        }
      },
      isActive: (): boolean => isActive,
    };
  }
}
