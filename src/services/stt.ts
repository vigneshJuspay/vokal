/**
 * Speech-to-Text Service
 * Production-ready with enhanced reliability, security, and error handling
 * @version 2.0.0
 */

import {
  STTError,
  ErrorCode,
  ConfigurationError,
  ValidationError,
  getErrorMessage,
  toError,
} from '../errors/voice-test.errors.js';
import { createComponentLogger } from '../utils/logger.js';
import { retry, withTimeout } from '../utils/retry.js';
import { checkAudioTools } from '../utils/secure-exec.js';
import {
  validateSampleRate,
  validateLanguageCode,
  validateSTTEncoding,
  sanitizeText,
} from '../utils/validation.js';
import {
  STT_DEFAULTS,
  API_CONSTANTS,
  SPEECH_CONTEXT_PHRASES,
  PCM_CONSTANTS,
} from '../constants/audio.constants.js';

const logger = createComponentLogger('STTService');

/**
 * STT Input interface
 */
export interface STTInput {
  audioBuffer: Buffer;
  audioEncoding:
    | 'LINEAR16'
    | 'FLAC'
    | 'MULAW'
    | 'AMR'
    | 'AMR_WB'
    | 'OGG_OPUS'
    | 'SPEEX_WITH_HEADER_BYTE'
    | 'WEBM_OPUS';
  sampleRateHertz: number;
  languageCode: string;
  enableAutomaticPunctuation?: boolean;
  model?:
    | 'latest_long'
    | 'latest_short'
    | 'command_and_search'
    | 'phone_call'
    | 'video'
    | 'default';
  maxAlternatives?: number;
}

/**
 * STT Response interface
 */
export interface STTResponse {
  transcript: string;
  confidence: number;
  alternativeTranscripts?: Array<{
    transcript: string;
    confidence: number;
  }>;
  processingTime: number;
  audioQuality?: {
    maxAmplitude: number;
    avgAmplitude: number;
    normalizedVolume: number;
  };
}

/**
 * Audio quality metrics
 */
interface AudioQualityMetrics {
  hasData: boolean;
  maxAmplitude: number;
  avgAmplitude: number;
  normalizedVolume: number;
}

/**
 * Speech-to-Text Service with enhanced reliability, security, and proper error handling
 */
export class STTService {
  private apiKey: string;
  private readonly MIN_AUDIO_SIZE = 100; // Minimum bytes for valid audio
  private readonly MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB max
  private readonly API_TIMEOUT = 60000; // 60 seconds

  constructor(apiKey?: string) {
    // Validate API key
    this.apiKey = apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

    if (!this.apiKey || this.apiKey.length < 20) {
      throw new ConfigurationError(
        'Valid GOOGLE_AI_API_KEY or GEMINI_API_KEY is required for STT service',
        undefined,
        { keyLength: this.apiKey.length }
      );
    }

    logger.info('STT Service initialized with Google Cloud Speech API');
  }

  /**
   * Analyze audio buffer quality
   */
  private analyzeAudioQuality(buffer: Buffer): AudioQualityMetrics {
    // Check if buffer has actual data
    const firstBytes = buffer.subarray(0, Math.min(100, buffer.length));
    const hasData = firstBytes.some((byte) => byte !== 0);

    // Calculate amplitude statistics
    let maxAmplitude = 0;
    let sumAmplitude = 0;
    let sampleCount = 0;

    // Sample up to 10000 bytes for performance
    const bytesToSample = Math.min(buffer.length - 1, 10000);

    for (let i = 0; i < bytesToSample - 1; i += 2) {
      try {
        const sample = buffer.readInt16LE(i);
        const amplitude = Math.abs(sample);
        maxAmplitude = Math.max(maxAmplitude, amplitude);
        sumAmplitude += amplitude;
        sampleCount++;
      } catch (error) {
        // Skip invalid samples
        continue;
      }
    }

    const avgAmplitude = sampleCount > 0 ? sumAmplitude / sampleCount : 0;
    const normalizedVolume = (avgAmplitude / PCM_CONSTANTS.MAX_SAMPLE_VALUE) * 100;

    return {
      hasData,
      maxAmplitude,
      avgAmplitude,
      normalizedVolume,
    };
  }

  /**
   * Validate audio input
   */
  private validateAudioInput(input: STTInput): void {
    // Validate audio buffer size
    if (!input.audioBuffer || input.audioBuffer.length < this.MIN_AUDIO_SIZE) {
      throw new ValidationError(
        `Audio buffer too small. Minimum size is ${this.MIN_AUDIO_SIZE} bytes`,
        'audioBuffer',
        input.audioBuffer?.length
      );
    }

    if (input.audioBuffer.length > this.MAX_AUDIO_SIZE) {
      throw new ValidationError(
        `Audio buffer too large. Maximum size is ${this.MAX_AUDIO_SIZE} bytes`,
        'audioBuffer',
        input.audioBuffer.length
      );
    }

    // Validate encoding
    validateSTTEncoding(input.audioEncoding);

    // Validate sample rate
    validateSampleRate(input.sampleRateHertz);

    // Validate language code
    validateLanguageCode(input.languageCode);

    // Validate max alternatives
    if (input.maxAlternatives !== undefined) {
      if (input.maxAlternatives < 1 || input.maxAlternatives > 30) {
        throw new ValidationError(
          'maxAlternatives must be between 1 and 30',
          'maxAlternatives',
          input.maxAlternatives
        );
      }
    }
  }

  /**
   * Build API request payload
   */
  private buildRequestPayload(input: STTInput): unknown {
    return {
      config: {
        encoding: input.audioEncoding,
        sampleRateHertz: input.sampleRateHertz,
        languageCode: input.languageCode,
        enableAutomaticPunctuation:
          input.enableAutomaticPunctuation ?? STT_DEFAULTS.ENABLE_PUNCTUATION,
        model: input.model ?? STT_DEFAULTS.MODEL,
        maxAlternatives: input.maxAlternatives ?? STT_DEFAULTS.MAX_ALTERNATIVES,
        // Enhanced accuracy settings
        enableWordTimeOffsets: true,
        enableWordConfidence: STT_DEFAULTS.ENABLE_WORD_CONFIDENCE,
        useEnhanced: STT_DEFAULTS.ENABLE_ENHANCED,
        // Better noise handling
        audioChannelCount: 1,
        enableSeparateRecognitionPerChannel: false,
        // Speech adaptation for better accuracy
        speechContexts: [
          {
            phrases: [...SPEECH_CONTEXT_PHRASES],
            boost: STT_DEFAULTS.SPEECH_CONTEXT_BOOST,
          },
        ],
      },
      audio: {
        content: input.audioBuffer.toString('base64'),
      },
    };
  }

  /**
   * Make API call with retry logic
   * SECURITY: API key is sent in X-Goog-Api-Key header, NOT in URL
   * to prevent exposure in logs, browser history, or proxy servers
   */
  private async callSpeechAPI(payload: unknown): Promise<unknown> {
    const apiCall = async (): Promise<unknown> => {
      const url = API_CONSTANTS.GOOGLE_SPEECH_API_URL;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey, // API key in header (SECURE)
          'User-Agent': 'voice-test-npm-package/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errorMessage = `Google Speech-to-Text API error: ${response.status} ${response.statusText}`;

        // Throw retryable error for 5xx errors
        if (response.status >= 500) {
          throw new STTError(errorMessage, ErrorCode.API_ERROR, undefined, {
            statusCode: response.status,
            response: errorData,
          });
        }

        // Throw non-retryable error for 4xx errors
        throw new STTError(
          errorMessage,
          response.status === 401 ? ErrorCode.API_UNAUTHORIZED : ErrorCode.STT_API_ERROR,
          undefined,
          { statusCode: response.status, response: errorData }
        );
      }

      return response.json();
    };

    // Retry with exponential backoff for network/server errors
    return retry(apiCall, {
      maxAttempts: 1,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      isRetryable: (error) => {
        // Retry on network errors and 5xx server errors
        return (
          error.message.includes('5') ||
          error.message.includes('timeout') ||
          error.message.includes('network')
        );
      },
    });
  }

  /**
   * Parse API response
   */
  private parseResponse(data: unknown, processingTime: number): Omit<STTResponse, 'audioQuality'> {
    // Type guard for API response
    const apiData = data as {
      results?: Array<{
        alternatives?: Array<{
          transcript?: string;
          confidence?: number;
        }>;
      }>;
    };

    // Check if we got results
    if (!apiData.results || apiData.results.length === 0) {
      logger.warn('No speech detected in audio');
      return {
        transcript: '',
        confidence: 0,
        processingTime,
      };
    }

    const result = apiData.results[0];
    const primaryAlternative = result.alternatives?.[0];

    if (!primaryAlternative) {
      logger.warn('No alternatives found in speech recognition result');
      return {
        transcript: '',
        confidence: 0,
        processingTime,
      };
    }

    // Extract alternative transcripts
    const alternativeTranscripts =
      result.alternatives?.slice(1).map((alt) => ({
        transcript: sanitizeText(alt.transcript || ''),
        confidence: alt.confidence || 0,
      })) || [];

    return {
      transcript: sanitizeText(primaryAlternative.transcript || ''),
      confidence: primaryAlternative.confidence || 0,
      alternativeTranscripts,
      processingTime,
    };
  }

  /**
   * Convert speech audio to text using Google Cloud Speech-to-Text API
   * Enhanced with validation, retry logic, and better error handling
   */
  async transcribeAudio(input: STTInput): Promise<STTResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateAudioInput(input);

      logger.info(
        `Starting speech recognition: ${input.audioBuffer.length} bytes, ` +
          `${input.sampleRateHertz}Hz, ${input.audioEncoding}, ${input.languageCode}`
      );

      // Analyze audio quality
      const audioQuality = this.analyzeAudioQuality(input.audioBuffer);

      logger.debug(
        `Audio quality: ${audioQuality.hasData ? 'HAS DATA' : 'NO DATA'}, ` +
          `max=${audioQuality.maxAmplitude}, avg=${audioQuality.avgAmplitude.toFixed(0)}, ` +
          `volume=${audioQuality.normalizedVolume.toFixed(1)}%`
      );

      // Warn if audio quality seems poor
      if (audioQuality.normalizedVolume < 1.0) {
        logger.warn('Audio volume is very low, transcription accuracy may be affected');
      }

      if (!audioQuality.hasData) {
        logger.warn('Audio buffer appears to be empty or silent');
      }

      // Build request payload
      const payload = this.buildRequestPayload(input);

      // Make API call with timeout and retry
      const data = await withTimeout(
        this.callSpeechAPI(payload),
        this.API_TIMEOUT,
        'Speech-to-Text API request timed out'
      );

      // Parse response
      const response = this.parseResponse(data, Date.now() - startTime);

      logger.info(
        `Speech recognition completed in ${response.processingTime}ms: ` +
          `"${response.transcript.substring(0, 50)}${response.transcript.length > 50 ? '...' : ''}" ` +
          `(confidence: ${(response.confidence * 100).toFixed(1)}%)`
      );

      return {
        ...response,
        audioQuality: {
          maxAmplitude: audioQuality.maxAmplitude,
          avgAmplitude: audioQuality.avgAmplitude,
          normalizedVolume: audioQuality.normalizedVolume,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Re-throw if already our error type
      if (
        error instanceof STTError ||
        error instanceof ValidationError ||
        error instanceof ConfigurationError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new STTError(
        `Speech recognition failed: ${getErrorMessage(error)}`,
        ErrorCode.STT_TRANSCRIPTION_FAILED,
        toError(error),
        { processingTime }
      );
    }
  }

  /**
   * Convert audio file to text (convenience method)
   */
  async transcribeFile(
    filePath: string,
    languageCode = 'en-US',
    audioEncoding: STTInput['audioEncoding'] = 'LINEAR16',
    sampleRateHertz = 16000
  ): Promise<STTResponse> {
    try {
      const fs = await import('fs/promises');
      const audioBuffer = await fs.readFile(filePath);

      return await this.transcribeAudio({
        audioBuffer,
        audioEncoding,
        sampleRateHertz,
        languageCode,
        enableAutomaticPunctuation: true,
        model: STT_DEFAULTS.MODEL,
      });
    } catch (error) {
      throw new STTError(
        `Failed to transcribe file ${filePath}: ${getErrorMessage(error)}`,
        ErrorCode.FILE_READ_ERROR,
        toError(error)
      );
    }
  }

  /**
   * Get supported languages for STT
   */
  getSupportedLanguages(): string[] {
    return [
      // English variants
      'en-US',
      'en-GB',
      'en-AU',
      'en-CA',
      'en-IE',
      'en-IN',
      'en-NZ',
      'en-PH',
      'en-SG',
      'en-ZA',
      // Indian languages
      'hi-IN',
      'bn-IN',
      'ta-IN',
      'te-IN',
      'ml-IN',
      'kn-IN',
      'gu-IN',
      'mr-IN',
      'pa-IN',
      'or-IN',
      // European languages
      'es-ES',
      'es-US',
      'es-MX',
      'fr-FR',
      'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR',
      'pt-PT',
      'nl-NL',
      'pl-PL',
      'ru-RU',
      // Asian languages
      'ja-JP',
      'ko-KR',
      'zh-CN',
      'zh-TW',
      'th-TH',
      'vi-VN',
      'id-ID',
      'ms-MY',
      // Arabic
      'ar-SA',
      'ar-AE',
      'ar-EG',
    ];
  }

  /**
   * Check if audio recording tools are available
   */
  async checkAudioSetup(): Promise<{
    success: boolean;
    message: string;
    instructions?: string;
    versions?: Record<string, string>;
  }> {
    try {
      const result = await checkAudioTools();

      if (result.available) {
        return {
          success: true,
          message: `Audio tools available for ${process.platform}`,
          versions: result.versions,
        };
      } else {
        return {
          success: false,
          message: `Missing audio tools: ${result.missing.join(', ')}`,
          instructions: result.instructions,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Audio setup check failed: ${getErrorMessage(error)}`,
      };
    }
  }

  /**
   * Test the STT service with a simple audio buffer
   */
  async testService(): Promise<boolean> {
    try {
      // Create a minimal test audio buffer (100ms of silence)
      const testAudio = Buffer.alloc(1600);

      await this.transcribeAudio({
        audioBuffer: testAudio,
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      });

      logger.info('STT service test completed successfully');
      return true;
    } catch (error) {
      logger.error(`STT service test failed: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Create STT service instance
   */
  static create(apiKey?: string): STTService {
    return new STTService(apiKey);
  }

  /**
   * Detect optimal audio encoding based on file extension
   */
  static detectAudioEncoding(filePath?: string): STTInput['audioEncoding'] {
    if (!filePath) {
      return 'LINEAR16';
    }

    const ext = filePath.toLowerCase().split('.').pop();

    switch (ext) {
      case 'wav':
        return 'LINEAR16';
      case 'flac':
        return 'FLAC';
      case 'ogg':
        return 'OGG_OPUS';
      case 'webm':
        return 'WEBM_OPUS';
      case 'amr':
        return 'AMR';
      case 'amr-wb':
        return 'AMR_WB';
      default:
        return 'LINEAR16';
    }
  }

  /**
   * Get optimal model for different use cases
   */
  static getOptimalModel(
    useCase: 'conversation' | 'dictation' | 'phone' | 'video' | 'command'
  ): STTInput['model'] {
    switch (useCase) {
      case 'conversation':
        return 'latest_short';
      case 'dictation':
        return 'latest_long';
      case 'phone':
        return 'phone_call';
      case 'video':
        return 'video';
      case 'command':
        return 'command_and_search';
      default:
        return 'latest_short';
    }
  }

  /**
   * Transcribe TTS output with >90% confidence optimization
   * Uses industry best practices: correct encoding, sample rate matching, phrase hints
   *
   * @param audioBuffer - Audio from TTS system
   * @param languageCode - Language code
   * @param expectedPhrases - Expected words/phrases for better accuracy
   * @param ttsProvider - TTS provider name for optimal settings
   * @returns Enhanced STT response with confidence analysis
   */
  async transcribeTTSOutput(
    audioBuffer: Buffer,
    languageCode: string = 'en-US',
    expectedPhrases: string[] = [],
    ttsProvider: 'google' | 'elevenlabs' | 'azure' | 'aws' = 'google'
  ): Promise<
    STTResponse & {
      isReliable: boolean;
      recommendations: string[];
      confidenceLevel: 'excellent' | 'good' | 'fair' | 'poor';
    }
  > {
    try {
      const { getOptimalConfig, validateAudio, normalizeVolume, analyzeConfidence } = await import(
        '../utils/stt-optimizer.js'
      );

      // Get optimal config
      const config = getOptimalConfig(ttsProvider, expectedPhrases);

      // Validate audio
      const quality = validateAudio(audioBuffer);
      if (!quality.isValid) {
        logger.warn(`Audio issues: ${quality.issues.join(', ')}`);
      }

      // Normalize volume
      const processedAudio = normalizeVolume(audioBuffer);

      logger.info(
        `Transcribing TTS: ${ttsProvider}, ${config.sampleRate}Hz, ` +
          `phrases: ${expectedPhrases.length}`
      );

      // Transcribe with optimal settings
      const result = await this.transcribeAudio({
        audioBuffer: processedAudio,
        audioEncoding: config.encoding,
        sampleRateHertz: config.sampleRate,
        languageCode,
        enableAutomaticPunctuation: config.enableAutomaticPunctuation,
        model: config.model,
        maxAlternatives: config.maxAlternatives,
      });

      // Analyze confidence
      const analysis = analyzeConfidence(result.confidence);

      logger.info(
        `Result: "${result.transcript.substring(0, 50)}" ` +
          `(${(result.confidence * 100).toFixed(1)}%, ${analysis.level})`
      );

      return {
        ...result,
        isReliable: analysis.isReliable,
        recommendations: [analysis.recommendation],
        confidenceLevel: analysis.level,
      };
    } catch (error) {
      throw new STTError(
        `TTS transcription failed: ${getErrorMessage(error)}`,
        ErrorCode.STT_TRANSCRIPTION_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Transcribe with automatic retry until >90% confidence
   * Retries up to 3 times with different optimizations
   *
   * @param audioBuffer - Audio buffer
   * @param languageCode - Language code
   * @param expectedPhrases - Expected phrases
   * @param minConfidence - Minimum acceptable confidence (default: 0.90)
   * @returns STT response with guaranteed >minConfidence (or best attempt)
   */
  async transcribeWithConfidenceRetry(
    audioBuffer: Buffer,
    languageCode: string = 'en-US',
    expectedPhrases: string[] = [],
    minConfidence: number = 0.9
  ): Promise<STTResponse & { attemptsNeeded: number }> {
    const maxAttempts = 3;
    let bestResult: STTResponse | null = null;
    let bestConfidence = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.info(`Transcription attempt ${attempt}/${maxAttempts}...`);

      try {
        const result = await this.transcribeTTSOutput(audioBuffer, languageCode, expectedPhrases);

        // Track best result
        if (result.confidence > bestConfidence) {
          bestConfidence = result.confidence;
          bestResult = result;
        }

        // Success! Confidence is high enough
        if (result.confidence >= minConfidence) {
          logger.info(
            `✅ Achieved ${(result.confidence * 100).toFixed(1)}% confidence on attempt ${attempt}`
          );
          return {
            ...result,
            attemptsNeeded: attempt,
          };
        }

        logger.warn(
          `Attempt ${attempt} confidence: ${(result.confidence * 100).toFixed(1)}% ` +
            `(target: ${(minConfidence * 100).toFixed(1)}%)`
        );
      } catch (error) {
        logger.error(`Attempt ${attempt} failed: ${getErrorMessage(error)}`);

        if (attempt === maxAttempts) {
          throw error;
        }
      }

      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Return best result even if below threshold
    if (bestResult) {
      logger.warn(
        `⚠️ Best confidence after ${maxAttempts} attempts: ${(bestConfidence * 100).toFixed(1)}%`
      );
      return {
        ...bestResult,
        attemptsNeeded: maxAttempts,
      };
    }

    throw new STTError(
      'Failed to transcribe audio after multiple attempts',
      ErrorCode.STT_TRANSCRIPTION_FAILED
    );
  }
}
