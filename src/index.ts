/**
 * Vokal SDK - Voice Test Application
 *
 * Comprehensive text-to-speech and speech-to-text SDK with advanced audio processing capabilities.
 * Built on top of Neurolink SDK for speech generation with additional background audio mixing,
 * real-time voice interaction, and AI-powered voice bot testing features.
 *
 * @module vokal
 * @since 1.0.0
 *
 * @remarks
 * This package provides a complete voice testing and interaction framework including:
 * - **Text-to-Speech (TTS)**: High-quality speech generation using Google AI
 * - **Speech-to-Text (STT)**: Streaming speech recognition with voice activity detection
 * - **Audio Processing**: Background audio mixing, recording, and playback
 * - **Voice Interaction**: Complete conversational AI pipelines
 * - **Voice Bot Testing**: Comprehensive test suites with AI-powered evaluation
 * - **Error Handling**: Type-safe error system with detailed error codes
 * - **Utilities**: Retry logic, circuit breakers, logging, and validation
 *
 * @example
 * ```typescript
 * // Basic TTS with background audio
 * import { createVoiceTest } from 'vokal';
 *
 * const voiceTest = createVoiceTest(process.env.GOOGLE_AI_API_KEY);
 * await voiceTest.generateSpeech({
 *   text: 'Hello, world!',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   backgroundSound: 'cafe',
 *   play: true
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Voice interaction with STT
 * import { VoiceInteractionService } from 'vokal';
 *
 * const interaction = new VoiceInteractionService(apiKey);
 * const result = await interaction.runVoiceInteraction(
 *   'What is your name?',
 *   { language: 'en-US', voice: 'en-US-Neural2-D' }
 * );
 * console.log('User said:', result.transcript);
 * ```
 *
 * @example
 * ```typescript
 * // Run voice bot test suite
 * import { VoiceBotTestService } from 'vokal';
 *
 * const testService = VoiceBotTestService.create('./config.json', apiKey);
 * const results = await testService.runTestSuite();
 * console.log('Test passed:', results.summary.testPassed);
 * ```
 */

import { VoiceTestService } from './services/voice-test.js';

// Audio services
export { AudioMixerService } from './services/audio-mixer.js';
export { AudioRecordingService } from './services/audio-recording.js';

// Voice Interaction Service
export { VoiceInteractionService } from './services/voice-interaction.js';

// AI Comparison Service
export { AIComparisonService } from './services/ai-comparison.js';

// Voice Bot Test Service
export { VoiceBotTestService } from './services/voice-bot-test.js';

// STT Provider Management
export { STTHandlerManager } from './providers/stt-handler-manager.js';
export { GoogleAISTTHandler } from './providers/google-ai-stt.handler.js';

// Types
export type {
  VoiceTestInput,
  VoiceTestResponse,
  VoiceTestConfig,
  BackgroundSoundPreset,
  AudioMixingConfig,
  AudioMixer,
  Logger,
  STTInput,
  STTResponse,
  AudioConfig,
  AudioRecordingSession,
  AudioDevice,
  VoiceInteractionConfig,
  VoiceInteractionResult,
  StreamingSTTConfig,
  StreamingSTTResult,
  VoiceBotConfig,
  TestQuestion,
  TestResult,
  QuestionResult,
  TestSummary,
  RetryOptions,
  CircuitBreakerOptions,
  // STT Provider Types
  STTHandler,
  STTRequest,
  STTProviderResponse,
  StreamingSession,
  STTProviderName,
} from './types/index.js';

// Error classes and utilities
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
} from './types/index.js';

// Validation utilities
export { safeJSONParse } from './types/index.js';

// Logger
export { LogLevel, ConsoleLogger, SilentLogger, createComponentLogger } from './utils/logger.js';
export type { LogEntry, LoggerConfig } from './types/index.js';

// STT Optimization utilities
export { getOptimalConfig, validateAudio, normalizeVolume } from './utils/stt-optimizer.js';

// Retry utilities
export { retry, withTimeout, CircuitBreaker, createResilientFunction } from './utils/retry.js';

// Secure execution utilities
export { safeExec, commandExists, checkAudioTools } from './utils/secure-exec.js';
export type { ExecOptions, ExecResult, AudioToolCheck } from './types/index.js';

/**
 * Convenience factory function for creating VoiceTestService instances.
 *
 * @param apiKey - Optional Google AI API key. If not provided, uses environment variables.
 * @returns A configured VoiceTestService instance ready for TTS generation
 *
 * @example
 * ```typescript
 * const voiceTest = createVoiceTest(process.env.GOOGLE_AI_API_KEY);
 * const audioPath = await voiceTest.generateSpeech({
 *   text: 'Hello, world!',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F'
 * });
 * ```
 */
export const createVoiceTest = (apiKey?: string): VoiceTestService => {
  return VoiceTestService.create(apiKey);
};

// Default export
export { VoiceTestService as default } from './services/voice-test.js';
