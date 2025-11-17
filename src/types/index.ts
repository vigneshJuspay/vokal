/**
 * Voice Test Application Types
 * Simplified types for TTS + audio mixing functionality
 */

export interface VoiceTestInput {
  /** Text to convert to speech */
  text: string;

  /** Language code (e.g., 'en-US', 'en-GB', 'es-ES') */
  languageCode: string;

  /** Voice name */
  voiceName: string;

  /** Audio encoding format */
  audioEncoding?: 'MP3' | 'WAV' | 'OGG';

  /** Speaking rate (0.25 to 4.0, default: 1.0) */
  speakingRate?: number;

  /** Voice pitch (-20.0 to 20.0, default: 0.0) */
  pitch?: number;

  /** Optional output file path */
  output?: string;

  /** Whether to play audio after generating */
  play?: boolean;

  /** Optional background sound (preset name or file path) */
  backgroundSound?: string;

  /** Background sound volume (0.0 to 1.0) */
  backgroundVolume?: number;
}

export interface VoiceTestConfig {
  /** API Key for Neurolink/Gemini */
  apiKey: string;

  /** Default output directory for audio files */
  defaultOutputDir?: string;

  /** Default audio encoding */
  defaultEncoding?: 'MP3' | 'WAV' | 'OGG';
}

export interface VoiceTestResponse {
  /** Generated audio file path */
  filePath: string;

  /** Size of the generated audio file in bytes */
  fileSize: number;

  /** Duration of audio generation in milliseconds */
  generationTime: number;

  /** Whether audio was played */
  wasPlayed: boolean;

  /** Whether background audio was mixed */
  mixedAudio?: boolean;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface BackgroundSoundPreset {
  /** Preset name */
  name: string;
  /** File path to the audio file */
  filePath: string;
  /** Optimal volume for this preset (0.0 to 1.0) */
  defaultVolume: number;
  /** Whether this sound should loop */
  loop: boolean;
  /** Description of the sound */
  description: string;
}

export interface AudioMixingConfig {
  /** Volume of background sound (0.0 to 1.0) */
  backgroundVolume: number;
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
  /** Whether to loop background if shorter than speech */
  loop: boolean;
}

export interface AudioMixer {
  /** Mix TTS audio with background sound */
  mixAudio(speechPath: string, backgroundSound: string, backgroundVolume?: number): Promise<string>;
  /** Get available background sound presets */
  getAvailablePresets(): BackgroundSoundPreset[];
  /** Determine optimal mixing parameters based on text content */
  getOptimalMixingConfig(
    text: string,
    backgroundSound: string,
    backgroundVolume?: number
  ): AudioMixingConfig;
}

/**
 * @deprecated Use the new error classes from '../errors/voice-test.errors.js'
 * Kept for backward compatibility
 */
export class VoiceTestError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VoiceTestError';
  }
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ============================================================================
// STT (Speech-to-Text) Types - Re-export from STT service
// ============================================================================

export type { STTInput, STTResponse } from '../services/stt.js';

// ============================================================================
// Voice Bot Testing Types
// ============================================================================

export type {
  VoiceBotConfig,
  TestResult,
  TestQuestion,
  QuestionResult,
  TestSummary,
  PerformanceMetrics,
  TestMetadata,
  TestSettings,
} from './voice-bot-config.js';

export { SAMPLE_TEST_CONFIG, TEST_CONFIG_SCHEMA } from './voice-bot-config.js';

// ============================================================================
// Error Classes - Enhanced error handling
// ============================================================================

export {
  ErrorCode,
  VoiceTestError as VoiceTestErrorV2,
  ConfigurationError,
  FileSystemError,
  AudioProcessingError,
  STTError,
  RecordingError,
  APIError,
  ValidationError,
  createError,
  isVoiceTestError,
  isConfigurationError,
  isFileSystemError,
  isAudioProcessingError,
  isSTTError,
  isRecordingError,
  isAPIError,
  isValidationError,
  toError,
  getErrorMessage,
} from '../errors/voice-test.errors.js';

// ============================================================================
// Constants - Audio configuration constants
// ============================================================================

export {
  AUDIO_ENCODING,
  STT_ENCODING,
  AUDIO_DEFAULTS,
  AUDIO_LIMITS,
  STT_DEFAULTS,
  VAD_CONFIG,
  FADE_DURATIONS,
  VOLUME_PRESETS,
  FILE_CONSTANTS,
  API_CONSTANTS,
  SPEECH_CONTEXT_PHRASES,
  PCM_CONSTANTS,
  type AudioEncoding,
  type STTEncoding,
} from '../constants/audio.constants.js';

// ============================================================================
// Logger - Enhanced logging utilities
// ============================================================================

export {
  LogLevel,
  ConsoleLogger as ConsoleLoggerV2,
  SilentLogger as SilentLoggerV2,
  getLogger,
  setLogger,
  createLogger,
  createComponentLogger,
  type LogEntry,
  type LoggerConfig,
} from '../utils/logger.js';

// ============================================================================
// Validation - Input validation utilities
// ============================================================================

export {
  validateSpeakingRate,
  validatePitch,
  validateVolume,
  validateText,
  validateLanguageCode,
  validateVoiceName,
  validateAudioEncoding,
  validateSTTEncoding,
  validateSampleRate,
  validateFilePath,
  validateAPIKey,
  validateVoiceTestInput,
  sanitizeText,
  normalizeLanguageCode,
  clamp,
  safeJSONParse,
  isValidNumber,
  isNonEmptyString,
  ValidationResult,
} from '../utils/validation.js';

// ============================================================================
// Retry & Reliability - Retry logic and circuit breaker
// ============================================================================

export {
  retry,
  withTimeout,
  createResilientFunction,
  CircuitBreaker,
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  type RetryOptions,
  type CircuitBreakerOptions,
} from '../utils/retry.js';

// ============================================================================
// Security - Secure subprocess execution
// ============================================================================

export {
  safeExec,
  commandExists,
  getCommandVersion,
  checkAudioTools,
  validateSafePath,
  sanitizeEnv,
  type ExecOptions,
  type ExecResult,
  type AudioToolCheck,
} from '../utils/secure-exec.js';
