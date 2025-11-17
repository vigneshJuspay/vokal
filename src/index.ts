/**
 * Voice Test Application
 * Simple TTS application that uses Neurolink SDK for speech generation
 * and adds background audio mixing capabilities
 */

// Main Voice Test service
import { VoiceTestService } from './services/voice-test.js';
export { VoiceTestService };

// Audio mixing service
export { AudioMixerService } from './services/audio-mixer.js';

// Types
export type {
  VoiceTestInput,
  VoiceTestResponse,
  VoiceTestConfig,
  BackgroundSoundPreset,
  AudioMixingConfig,
  AudioMixer,
  Logger,
} from './types/index.js';

// Error classes (legacy - for backward compatibility)
export { VoiceTestError } from './types/index.js';

// Enhanced error classes (recommended)
export {
  ErrorCode,
  VoiceTestErrorV2,
  ConfigurationError,
  FileSystemError,
  AudioProcessingError,
  STTError,
  RecordingError,
  APIError,
  ValidationError,
  createError,
  isVoiceTestError,
} from './types/index.js';

// Constants
export {
  AUDIO_ENCODING,
  AUDIO_DEFAULTS,
  AUDIO_LIMITS,
  STT_DEFAULTS,
  VAD_CONFIG,
  FADE_DURATIONS,
  VOLUME_PRESETS,
  FILE_CONSTANTS,
  API_CONSTANTS,
} from './types/index.js';

// Validation utilities
export {
  validateSpeakingRate,
  validatePitch,
  validateVolume,
  validateText,
  validateLanguageCode,
  validateVoiceName,
  validateVoiceTestInput,
  sanitizeText,
  normalizeLanguageCode,
  clamp,
  isValidNumber,
  isNonEmptyString,
} from './types/index.js';

// Logger utilities (legacy - for backward compatibility)
export { ConsoleLogger, SilentLogger } from './utils/logger.js';

// Enhanced logger utilities (recommended)
export {
  LogLevel,
  ConsoleLoggerV2,
  SilentLoggerV2,
  getLogger,
  setLogger,
  createLogger,
  createComponentLogger,
} from './types/index.js';

// STT Optimization utilities (simplified - industry best practices)
export {
  getOptimalConfig,
  validateAudio,
  normalizeVolume,
  buildSpeechContexts,
  analyzeConfidence,
} from './utils/stt-optimizer.js';

export type { STTConfig } from './utils/stt-optimizer.js';

// Retry and reliability utilities
export { retry, withTimeout, CircuitBreaker, createResilientFunction } from './utils/retry.js';

export type { RetryOptions, CircuitBreakerOptions } from './utils/retry.js';

// Secure execution utilities
export {
  safeExec,
  commandExists,
  getCommandVersion,
  checkAudioTools,
  validateSafePath,
  sanitizeEnv,
} from './utils/secure-exec.js';

export type { ExecOptions, ExecResult, AudioToolCheck } from './utils/secure-exec.js';

// STT Service
export { STTService } from './services/stt.js';
export type { STTInput, STTResponse } from './services/stt.js';

// Convenience factory function
export const createVoiceTest = (apiKey?: string): VoiceTestService => {
  return VoiceTestService.create(apiKey);
};

// Default export
export { VoiceTestService as default };
