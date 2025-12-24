/**
 * Speech-to-Text (STT) Types
 * All STT-related type definitions
 */

/**
 * STT Input - Audio transcription request
 */
export type STTInput = {
  /** Audio data as Buffer */
  audioContent?: Buffer;
  /** Audio buffer (alternative to audioContent) */
  audioBuffer?: Buffer;

  /** Audio encoding format */
  audioEncoding:
    | 'LINEAR16'
    | 'MP3'
    | 'OGG_OPUS'
    | 'FLAC'
    | 'MULAW'
    | 'AMR'
    | 'AMR_WB'
    | 'WEBM_OPUS'
    | 'SPEEX_WITH_HEADER_BYTE';

  /** Sample rate in Hz */
  sampleRateHertz: number;

  /** Language code (e.g., 'en-US') */
  languageCode: string;

  /** STT model to use */
  model?: string;

  /** Enable automatic punctuation */
  enableAutomaticPunctuation?: boolean;

  /** Maximum number of alternative transcriptions */
  maxAlternatives?: number;

  /** Speech context phrases for better recognition */
  speechContexts?: Array<{ phrases: string[] }>;

  /** Audio channel count */
  audioChannelCount?: number;
};

/**
 * STT Response - Transcription result
 */
export type STTResponse = {
  /** Transcribed text */
  text?: string;
  /** Transcribed text (alternative name) */
  transcript?: string;

  /** Confidence score (0.0 to 1.0) */
  confidence: number;

  /** Alternative transcriptions */
  alternatives?: Array<{ transcript: string; confidence: number }>;
  /** Alternative transcriptions (alternative name) */
  alternativeTranscripts?: Array<{ transcript: string; confidence: number }>;

  /** Processing time in milliseconds */
  processingTime?: number;

  /** Audio quality metrics */
  audioQuality?: AudioQualityMetrics;
};

/**
 * Audio quality metrics
 */
export type AudioQualityMetrics = {
  hasData: boolean;
  maxAmplitude: number;
  avgAmplitude: number;
  normalizedVolume: number;
};

/**
 * STT Configuration for optimizer
 */
export type STTConfig = {
  encoding: 'LINEAR16' | 'MP3' | 'OGG_OPUS' | 'FLAC';
  sampleRate: number;
  model?: string;
  enableAutomaticPunctuation?: boolean;
  maxAlternatives?: number;
  speechContexts?: Array<{ phrases: string[] }>;
};
