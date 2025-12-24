/**
 * Voice Test Application Types
 * Centralized type exports from all type files
 */

// Core voice test types
export type VoiceTestInput = {
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
};

export type VoiceTestConfig = {
  /** API Key for Neurolink/Gemini */
  apiKey: string;
  /** Default output directory for audio files */
  defaultOutputDir?: string;
  /** Default audio encoding */
  defaultEncoding?: 'MP3' | 'WAV' | 'OGG';
  /** TTS provider for text-to-speech generation (supports any Neurolink provider) */
  provider?: string;
};

export type VoiceTestResponse = {
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
};

export type BackgroundSoundPreset = {
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
};

export type AudioMixingConfig = {
  /** Volume of background sound (0.0 to 1.0) */
  backgroundVolume: number;
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
  /** Whether to loop background if shorter than speech */
  loop: boolean;
};

export type AudioMixer = {
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
};

export type Logger = {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
};

// ============================================================================
// Re-export all types from dedicated type files
// ============================================================================

// STT Types
export type { STTInput, STTResponse, AudioQualityMetrics, STTConfig } from './stt.types.js';

// STT Provider Types (includes StreamingSTTConfig and StreamingSTTResult)
export type {
  STTHandler,
  STTRequest,
  STTResponse as STTProviderResponse,
  StreamingSTTConfig,
  StreamingSTTResult,
  StreamingSession,
  STTProviderName,
} from './stt-provider.types.js';

// Audio Types
export type { AudioConfig, AudioRecordingSession, AudioDevice, AudioData } from './audio.types.js';

// Voice Interaction Types
export type { VoiceInteractionConfig, VoiceInteractionResult } from './voice-interaction.types.js';

// AI Comparison Types
export type {
  AIProvider,
  ComparisonInput,
  ComparisonResult,
  ParsedAIResponse,
} from './ai-comparison.types.js';

// Voice Test Service Types
export type { AudioFormat, TTSOptions, TTSResult, GoogleVoice } from './voice-test.types.js';

// CLI Types
export type {
  PackageJson,
  GenerateCommandArgs,
  VoicesCommandArgs,
  TestAudioCommandArgs,
  PlayCommandArgs,
  TestCommandArgs,
  Voice,
  BackgroundSound,
} from './cli.types.js';

// Logger Types
export { LogLevel } from './logger.types.js';
export type { LogEntry, LoggerConfig } from './logger.types.js';

// Retry Types
export type { RetryOptions, CircuitBreakerOptions } from './retry.types.js';

// Secure Exec Types
export type { ExecOptions, ExecResult, AudioToolCheck } from './secure-exec.types.js';

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
  QuestionSettings,
  TestExecutionMetadata,
} from './voice-bot-config.js';

export { SAMPLE_TEST_CONFIG, TEST_CONFIG_SCHEMA } from './voice-bot-config.js';

// ============================================================================
// Error Classes - Re-export from errors module
// ============================================================================

export {
  ErrorCode,
  VoiceTestError,
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
// Validation - Re-export from validation utils
// ============================================================================

export { safeJSONParse } from '../utils/validation.js';
