/**
 * Audio Configuration Constants
 * Centralized constants following industry best practices for maintainability
 */

export const AUDIO_ENCODING = {
  MP3: 'MP3',
  WAV: 'WAV',
  OGG: 'OGG',
} as const;

export type AudioEncoding =
  (typeof AUDIO_ENCODING)[keyof typeof AUDIO_ENCODING];

export const STT_ENCODING = {
  LINEAR16: 'LINEAR16',
  FLAC: 'FLAC',
  MULAW: 'MULAW',
  AMR: 'AMR',
  AMR_WB: 'AMR_WB',
  OGG_OPUS: 'OGG_OPUS',
  SPEEX_WITH_HEADER_BYTE: 'SPEEX_WITH_HEADER_BYTE',
  WEBM_OPUS: 'WEBM_OPUS',
} as const;

export type STTEncoding = (typeof STT_ENCODING)[keyof typeof STT_ENCODING];

/**
 * Default audio configuration values
 */
export const AUDIO_DEFAULTS = {
  ENCODING: 'MP3' as AudioEncoding,
  SAMPLE_RATE: 16000,
  SPEAKING_RATE: 1.0,
  PITCH: 0.0,
  LANGUAGE_CODE: 'en-US',
  BACKGROUND_VOLUME: 0.15,
} as const;

/**
 * Audio parameter boundaries
 */
export const AUDIO_LIMITS = {
  SPEAKING_RATE: {
    MIN: 0.25,
    MAX: 4.0,
  },
  PITCH: {
    MIN: -20.0,
    MAX: 20.0,
  },
  VOLUME: {
    MIN: 0.0,
    MAX: 1.0,
  },
} as const;

/**
 * Speech-to-Text configuration constants
 */
export const STT_DEFAULTS = {
  MODEL: 'latest_short' as const,
  MAX_ALTERNATIVES: 3,
  SPEECH_CONTEXT_BOOST: 20.0,
  ENABLE_PUNCTUATION: true,
  ENABLE_WORD_CONFIDENCE: true,
  ENABLE_ENHANCED: true,
} as const;

/**
 * Voice Activity Detection (VAD) configuration
 */
export const VAD_CONFIG = {
  SILENCE_THRESHOLD: 0.005,
  SILENCE_DURATION_MS: 1500,
  MAX_DURATION_MS: 30000,
  MIN_SPEECH_DURATION_SEC: 1.0,
  NO_SPEECH_TIMEOUT_MS: 15000,
  SOX_VOLUME_BOOST: 3.0,
} as const;

/**
 * Audio mixing fade configuration
 */
export const FADE_DURATIONS = {
  IN: {
    QUICK: 0.2,
    MEDIUM: 1.0,
    SLOW: 2.0,
  },
  OUT: {
    QUICK: 0.3,
    MEDIUM: 1.5,
    SLOW: 2.5,
  },
} as const;

/**
 * Volume presets for different content types
 */
export const VOLUME_PRESETS = {
  URGENT: 0.05,
  CASUAL: 0.2,
  DEFAULT: 0.12,
} as const;

/**
 * File system constants
 */
export const FILE_CONSTANTS = {
  DEFAULT_OUTPUT_FILENAME: 'vokal-output',
  ASSETS_DIR: 'assets',
  WAV_HEADER_SIZE: 44,
  MIXED_SUFFIX: '_mixed',
} as const;

/**
 * API configuration
 */
export const API_CONSTANTS = {
  GOOGLE_SPEECH_API_URL: 'https://speech.googleapis.com/v1/speech:recognize',
  TTS_PROVIDER: 'gemini',
  REQUEST_TIMEOUT_MS: 60000,
} as const;

/**
 * Common speech context phrases for better STT accuracy
 */
export const SPEECH_CONTEXT_PHRASES = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'hello',
  'hi',
  'name',
  'color',
  'blue',
  'red',
  'green',
  'yellow',
  'breakfast',
  'lunch',
  'dinner',
  'food',
  'weather',
  'sunny',
  'cloudy',
  'rainy',
] as const;

/**
 * PCM audio constants
 */
export const PCM_CONSTANTS = {
  BITS_PER_SAMPLE: 16,
  MAX_SAMPLE_VALUE: 32767,
  MIN_SAMPLE_VALUE: -32768,
  BYTES_PER_SAMPLE: 2,
  CHANNELS_MONO: 1,
  CHANNELS_STEREO: 2,
} as const;
