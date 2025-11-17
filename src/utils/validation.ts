/**
 * Input Validation Utilities
 * Centralized validation logic following best practices
 */

import { AUDIO_LIMITS } from '../constants/audio.constants.js';
import { ValidationError } from '../errors/voice-test.errors.js';

/**
 * Validate speaking rate parameter
 */
export function validateSpeakingRate(rate: number): void {
  if (typeof rate !== 'number' || isNaN(rate)) {
    throw new ValidationError('Speaking rate must be a valid number', 'speakingRate', rate);
  }

  if (rate < AUDIO_LIMITS.SPEAKING_RATE.MIN || rate > AUDIO_LIMITS.SPEAKING_RATE.MAX) {
    throw new ValidationError(
      `Speaking rate must be between ${AUDIO_LIMITS.SPEAKING_RATE.MIN} and ${AUDIO_LIMITS.SPEAKING_RATE.MAX}`,
      'speakingRate',
      rate
    );
  }
}

/**
 * Validate pitch parameter
 */
export function validatePitch(pitch: number): void {
  if (typeof pitch !== 'number' || isNaN(pitch)) {
    throw new ValidationError('Pitch must be a valid number', 'pitch', pitch);
  }

  if (pitch < AUDIO_LIMITS.PITCH.MIN || pitch > AUDIO_LIMITS.PITCH.MAX) {
    throw new ValidationError(
      `Pitch must be between ${AUDIO_LIMITS.PITCH.MIN} and ${AUDIO_LIMITS.PITCH.MAX}`,
      'pitch',
      pitch
    );
  }
}

/**
 * Validate volume parameter
 */
export function validateVolume(volume: number, fieldName: string = 'volume'): void {
  if (typeof volume !== 'number' || isNaN(volume)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, volume);
  }

  if (volume < AUDIO_LIMITS.VOLUME.MIN || volume > AUDIO_LIMITS.VOLUME.MAX) {
    throw new ValidationError(
      `${fieldName} must be between ${AUDIO_LIMITS.VOLUME.MIN} and ${AUDIO_LIMITS.VOLUME.MAX}`,
      fieldName,
      volume
    );
  }
}

/**
 * Validate text input (not empty, reasonable length)
 */
export function validateText(text: string, maxLength: number = 5000): void {
  if (typeof text !== 'string') {
    throw new ValidationError('Text must be a string', 'text', text);
  }

  if (text.trim().length === 0) {
    throw new ValidationError('Text cannot be empty', 'text', text);
  }

  if (text.length > maxLength) {
    throw new ValidationError(`Text length cannot exceed ${maxLength} characters`, 'text', text);
  }
}

/**
 * Validate language code format
 */
export function validateLanguageCode(languageCode: string): void {
  if (typeof languageCode !== 'string') {
    throw new ValidationError('Language code must be a string', 'languageCode', languageCode);
  }

  // Language code format: xx-XX (e.g., en-US, es-ES)
  const languageCodePattern = /^[a-z]{2}-[A-Z]{2}$/;

  if (!languageCodePattern.test(languageCode)) {
    throw new ValidationError(
      'Language code must be in format: xx-XX (e.g., en-US, es-ES)',
      'languageCode',
      languageCode
    );
  }
}

/**
 * Validate voice name format
 */
export function validateVoiceName(voiceName: string): void {
  if (typeof voiceName !== 'string') {
    throw new ValidationError('Voice name must be a string', 'voiceName', voiceName);
  }

  if (voiceName.trim().length === 0) {
    throw new ValidationError('Voice name cannot be empty', 'voiceName', voiceName);
  }
}

/**
 * Validate audio encoding
 */
export function validateAudioEncoding(encoding: string): void {
  const validEncodings = ['MP3', 'WAV', 'OGG'];

  if (!validEncodings.includes(encoding)) {
    throw new ValidationError(
      `Audio encoding must be one of: ${validEncodings.join(', ')}`,
      'audioEncoding',
      encoding
    );
  }
}

/**
 * Validate STT encoding
 */
export function validateSTTEncoding(encoding: string): void {
  const validEncodings = [
    'LINEAR16',
    'FLAC',
    'MULAW',
    'AMR',
    'AMR_WB',
    'OGG_OPUS',
    'SPEEX_WITH_HEADER_BYTE',
    'WEBM_OPUS',
  ];

  if (!validEncodings.includes(encoding)) {
    throw new ValidationError(
      `STT encoding must be one of: ${validEncodings.join(', ')}`,
      'audioEncoding',
      encoding
    );
  }
}

/**
 * Validate sample rate
 */
export function validateSampleRate(sampleRate: number): void {
  if (typeof sampleRate !== 'number' || isNaN(sampleRate)) {
    throw new ValidationError('Sample rate must be a valid number', 'sampleRate', sampleRate);
  }

  const validSampleRates = [8000, 16000, 24000, 32000, 44100, 48000];

  if (!validSampleRates.includes(sampleRate)) {
    throw new ValidationError(
      `Sample rate must be one of: ${validSampleRates.join(', ')} Hz`,
      'sampleRate',
      sampleRate
    );
  }
}

/**
 * Validate file path
 */
export function validateFilePath(filePath: string): void {
  if (typeof filePath !== 'string') {
    throw new ValidationError('File path must be a string', 'filePath', filePath);
  }

  if (filePath.trim().length === 0) {
    throw new ValidationError('File path cannot be empty', 'filePath', filePath);
  }

  // Check for path traversal attacks
  if (filePath.includes('..')) {
    throw new ValidationError(
      'File path cannot contain ".." (path traversal)',
      'filePath',
      filePath
    );
  }
}

/**
 * Validate API key format
 */
export function validateAPIKey(apiKey: string): void {
  if (typeof apiKey !== 'string') {
    throw new ValidationError('API key must be a string', 'apiKey', typeof apiKey);
  }

  if (apiKey.trim().length === 0) {
    throw new ValidationError('API key cannot be empty', 'apiKey', '<empty>');
  }

  // Basic length check (Google AI keys are typically 39 characters)
  if (apiKey.length < 20) {
    throw new ValidationError(
      'API key appears to be too short. Please check your API key.',
      'apiKey',
      '<redacted>'
    );
  }
}

/**
 * Sanitize text input to prevent injection attacks
 */
export function sanitizeText(text: string): string {
  // Remove or escape potentially dangerous characters
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;
  return text
    .replace(controlCharsRegex, '') // Remove control characters
    .trim();
}

/**
 * Normalize language code to standard format
 */
export function normalizeLanguageCode(languageCode: string): string {
  const parts = languageCode.split('-');

  if (parts.length !== 2) {
    return languageCode;
  }

  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

/**
 * Clamp number to range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Result type for safe JSON parsing
 */
export type ValidationResult<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Safely parse JSON with typed result
 */
export function safeJSONParse<T = unknown>(json: string): ValidationResult<T> {
  try {
    const data = JSON.parse(json) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON parse error',
    };
  }
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate complete VoiceTestInput object
 */
export function validateVoiceTestInput(input: {
  text: string;
  languageCode: string;
  voiceName: string;
  audioEncoding?: string;
  speakingRate?: number;
  pitch?: number;
  backgroundVolume?: number;
}): void {
  validateText(input.text);
  validateLanguageCode(input.languageCode);
  validateVoiceName(input.voiceName);

  if (input.audioEncoding) {
    validateAudioEncoding(input.audioEncoding);
  }

  if (input.speakingRate !== undefined) {
    validateSpeakingRate(input.speakingRate);
  }

  if (input.pitch !== undefined) {
    validatePitch(input.pitch);
  }

  if (input.backgroundVolume !== undefined) {
    validateVolume(input.backgroundVolume, 'backgroundVolume');
  }
}
