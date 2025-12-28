/**
 * Error Classes for Voice Test Application
 * Proper error hierarchy following best practices for error handling
 */

/**
 * Error codes enumeration for better error identification
 */
export enum ErrorCode {
  // Configuration errors
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',
  CONFIG_LOAD_FAILED = 'CONFIG_LOAD_FAILED',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',

  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  INVALID_FILE_PATH = 'INVALID_FILE_PATH',

  // Audio errors
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  UNSUPPORTED_AUDIO_FORMAT = 'UNSUPPORTED_AUDIO_FORMAT',
  AUDIO_GENERATION_FAILED = 'AUDIO_GENERATION_FAILED',
  AUDIO_MIXING_FAILED = 'AUDIO_MIXING_FAILED',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',
  INVALID_AUDIO_DATA = 'INVALID_AUDIO_DATA',
  MIXING_FAILED = 'MIXING_FAILED',
  BACKGROUND_NOT_FOUND = 'BACKGROUND_NOT_FOUND',
  NO_AUDIO_RESPONSE = 'NO_AUDIO_RESPONSE',
  GENERATION_FAILED = 'GENERATION_FAILED',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',

  // STT errors
  STT_API_ERROR = 'STT_API_ERROR',
  STT_TRANSCRIPTION_FAILED = 'STT_TRANSCRIPTION_FAILED',
  STT_NO_SPEECH_DETECTED = 'STT_NO_SPEECH_DETECTED',
  STT_NOT_CONFIGURED = 'STT_NOT_CONFIGURED',
  STT_INITIALIZATION_FAILED = 'STT_INITIALIZATION_FAILED',
  NO_SPEECH_DETECTED = 'NO_SPEECH_DETECTED',
  NO_SPEECH_TIMEOUT = 'NO_SPEECH_TIMEOUT',
  STT_VALIDATION_FAILED = 'STT_VALIDATION_FAILED',

  // Recording errors
  RECORDING_ERROR = 'RECORDING_ERROR',
  RECORDING_FAILED = 'RECORDING_FAILED',
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
  AUDIO_TOOLS_MISSING = 'AUDIO_TOOLS_MISSING',
  AUDIO_VALIDATION_FAILED = 'AUDIO_VALIDATION_FAILED',

  // API errors
  API_ERROR = 'API_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Test execution errors
  TEST_SUITE_FAILED = 'TEST_SUITE_FAILED',
  VOICE_INTERACTION_ERROR = 'VOICE_INTERACTION_ERROR',
  MAX_DURATION_REACHED = 'MAX_DURATION_REACHED',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  BUTTON_NOT_FOUND = 'BUTTON_NOT_FOUND',

  // AI Comparison errors
  AI_COMPARISON_FAILED = 'AI_COMPARISON_FAILED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
}

/**
 * Base error class for all Voice Test errors
 * Extends native Error with additional context
 */
export class VoiceTestError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    public readonly originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VoiceTestError';
    this.code = code;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Include original error stack if available
    if (originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      originalError: this.originalError?.message,
      stack: this.stack,
    };
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return `${this.message} (Error Code: ${this.code})`;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends VoiceTestError {
  constructor(
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCode.INVALID_CONFIG, originalError, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends VoiceTestError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FILE_NOT_FOUND,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'FileSystemError';
  }
}

/**
 * Audio processing errors
 */
export class AudioProcessingError extends VoiceTestError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AUDIO_GENERATION_FAILED,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'AudioProcessingError';
  }
}

/**
 * Speech-to-Text errors
 */
export class STTError extends VoiceTestError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.STT_TRANSCRIPTION_FAILED,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'STTError';
  }
}

/**
 * Recording/Microphone errors
 */
export class RecordingError extends VoiceTestError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.RECORDING_FAILED,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'RecordingError';
  }
}

/**
 * API communication errors
 */
export class APIError extends VoiceTestError {
  public readonly statusCode?: number;
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.API_ERROR,
    originalError?: Error,
    context?: Record<string, unknown>,
    statusCode?: number,
    responseBody?: unknown
  ) {
    super(message, code, originalError, context);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  /**
   * Override toJSON to include API-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      responseBody: this.responseBody,
    };
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends VoiceTestError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    originalError?: Error
  ) {
    super(
      message,
      ErrorCode.VALIDATION_FAILED,
      originalError,
      field ? { field, value } : undefined
    );
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Helper function to create appropriate error based on context
 */
export function createError(
  message: string,
  code: ErrorCode,
  originalError?: Error,
  context?: Record<string, unknown>
): VoiceTestError {
  switch (code) {
    case ErrorCode.MISSING_API_KEY:
    case ErrorCode.INVALID_CONFIG:
      return new ConfigurationError(message, originalError, context);

    case ErrorCode.FILE_NOT_FOUND:
    case ErrorCode.FILE_READ_ERROR:
    case ErrorCode.FILE_WRITE_ERROR:
      return new FileSystemError(message, code, originalError, context);

    case ErrorCode.INVALID_AUDIO_FORMAT:
    case ErrorCode.AUDIO_GENERATION_FAILED:
    case ErrorCode.AUDIO_MIXING_FAILED:
      return new AudioProcessingError(message, code, originalError, context);

    case ErrorCode.STT_API_ERROR:
    case ErrorCode.STT_TRANSCRIPTION_FAILED:
    case ErrorCode.STT_NO_SPEECH_DETECTED:
      return new STTError(message, code, originalError, context);

    case ErrorCode.RECORDING_ERROR:
    case ErrorCode.MICROPHONE_ACCESS_DENIED:
    case ErrorCode.AUDIO_TOOLS_MISSING:
      return new RecordingError(message, code, originalError, context);

    case ErrorCode.API_ERROR:
    case ErrorCode.API_RATE_LIMIT:
    case ErrorCode.API_TIMEOUT:
      return new APIError(message, code, originalError, context);

    case ErrorCode.INVALID_INPUT:
    case ErrorCode.INVALID_PARAMETER:
    case ErrorCode.VALIDATION_FAILED:
      return new ValidationError(message);

    default:
      return new VoiceTestError(message, code, originalError, context);
  }
}

/**
 * Type guard to check if an error is a VoiceTestError
 */
export function isVoiceTestError(error: unknown): error is VoiceTestError {
  return error instanceof VoiceTestError;
}

/**
 * Type guard to check specific error types
 */
export function isConfigurationError(
  error: unknown
): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

export function isFileSystemError(error: unknown): error is FileSystemError {
  return error instanceof FileSystemError;
}

export function isAudioProcessingError(
  error: unknown
): error is AudioProcessingError {
  return error instanceof AudioProcessingError;
}

export function isSTTError(error: unknown): error is STTError {
  return error instanceof STTError;
}

export function isRecordingError(error: unknown): error is RecordingError {
  return error instanceof RecordingError;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Safely convert unknown error to Error instance
 * This is the safe way to handle caught errors instead of using `as Error`
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object') {
    const errorObj = error as { message?: string; toString?: () => string };
    if (errorObj.message) {
      return new Error(errorObj.message);
    }
    if (errorObj.toString) {
      return new Error(errorObj.toString());
    }
  }

  return new Error(String(error));
}

/**
 * Get error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  return toError(error).message;
}
