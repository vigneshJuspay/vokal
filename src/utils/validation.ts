/**
 * Input Validation Utilities
 *
 * Centralized validation logic following security and data integrity best practices.
 * Provides type-safe validation functions for all user inputs and configuration parameters.
 *
 * @module utils/validation
 * @since 1.0.0
 *
 * @remarks
 * This module provides comprehensive validation for:
 * - **Audio Parameters**: Speaking rate, pitch, volume, sample rate
 * - **Text Inputs**: Content validation, sanitization, length limits
 * - **Identifiers**: Language codes, voice names, encoding formats
 * - **File Paths**: Security validation, traversal prevention
 * - **API Keys**: Format and length validation
 * - **JSON Parsing**: Type-safe parsing with error handling
 *
 * All validation functions throw `ValidationError` with detailed context on failure.
 *
 * @example
 * ```typescript
 * import {
 *   validateText,
 *   validateLanguageCode,
 *   validateSpeakingRate,
 *   safeJSONParse
 * } from './utils/validation.js';
 *
 * // Validate user input
 * validateText('Hello, world!');
 * validateLanguageCode('en-US');
 * validateSpeakingRate(1.0);
 *
 * // Safe JSON parsing
 * const result = safeJSONParse<Config>(jsonString);
 * if (result.success) {
 *   console.log('Config:', result.data);
 * }
 * ```
 */

import { AUDIO_LIMITS } from '../constants/audio.constants.js';
import { ValidationError } from '../errors/voice-test.errors.js';

/**
 * Validate speaking rate parameter.
 *
 * @param rate - Speaking rate to validate (0.25 to 4.0)
 * @throws {ValidationError} If rate is invalid or out of range
 *
 * @remarks
 * **Valid Range:** 0.25 to 4.0
 * - 0.25 = Very slow (25% of normal speed)
 * - 1.0 = Normal speaking speed
 * - 4.0 = Very fast (4x normal speed)
 *
 * @example
 * ```typescript
 * validateSpeakingRate(1.0); // ✓ Valid
 * validateSpeakingRate(0.5); // ✓ Valid (slower)
 * validateSpeakingRate(2.0); // ✓ Valid (faster)
 * validateSpeakingRate(5.0); // ✗ Throws: Out of range
 * validateSpeakingRate(NaN); // ✗ Throws: Not a number
 * ```
 */
export function validateSpeakingRate(rate: number): void {
  if (typeof rate !== 'number' || isNaN(rate)) {
    throw new ValidationError(
      'Speaking rate must be a valid number',
      'speakingRate',
      rate
    );
  }

  if (
    rate < AUDIO_LIMITS.SPEAKING_RATE.MIN ||
    rate > AUDIO_LIMITS.SPEAKING_RATE.MAX
  ) {
    throw new ValidationError(
      `Speaking rate must be between ${AUDIO_LIMITS.SPEAKING_RATE.MIN} and ${AUDIO_LIMITS.SPEAKING_RATE.MAX}`,
      'speakingRate',
      rate
    );
  }
}

/**
 * Validate pitch parameter.
 *
 * @param pitch - Pitch adjustment to validate (-20.0 to 20.0)
 * @throws {ValidationError} If pitch is invalid or out of range
 *
 * @remarks
 * **Valid Range:** -20.0 to 20.0 semitones
 * - Negative values = Lower pitch
 * - 0.0 = No adjustment
 * - Positive values = Higher pitch
 * - ±12 semitones = One octave
 *
 * @example
 * ```typescript
 * validatePitch(0.0);   // ✓ Valid (no change)
 * validatePitch(-5.0);  // ✓ Valid (lower pitch)
 * validatePitch(10.0);  // ✓ Valid (higher pitch)
 * validatePitch(25.0);  // ✗ Throws: Out of range
 * ```
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
 * Validate volume parameter.
 *
 * @param volume - Volume level to validate (0.0 to 1.0)
 * @param fieldName - Name of the field for error messages (default: 'volume')
 * @throws {ValidationError} If volume is invalid or out of range
 *
 * @remarks
 * **Valid Range:** 0.0 to 1.0
 * - 0.0 = Silent
 * - 0.5 = Half volume
 * - 1.0 = Full volume
 *
 * @example
 * ```typescript
 * validateVolume(0.5); // ✓ Valid
 * validateVolume(0.0); // ✓ Valid (silent)
 * validateVolume(1.0); // ✓ Valid (full)
 * validateVolume(1.5); // ✗ Throws: Out of range
 *
 * // Custom field name
 * validateVolume(0.2, 'backgroundVolume');
 * // Error message will reference 'backgroundVolume'
 * ```
 */
export function validateVolume(
  volume: number,
  fieldName: string = 'volume'
): void {
  if (typeof volume !== 'number' || isNaN(volume)) {
    throw new ValidationError(
      `${fieldName} must be a valid number`,
      fieldName,
      volume
    );
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
 * Validate text input (not empty, reasonable length).
 *
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length (default: 5000)
 * @throws {ValidationError} If text is invalid, empty, or too long
 *
 * @remarks
 * **Checks:**
 * - Must be a string
 * - Cannot be empty or whitespace-only
 * - Cannot exceed max length
 *
 * **Use Cases:**
 * - TTS input validation
 * - Question text validation
 * - User message validation
 *
 * @example
 * ```typescript
 * validateText('Hello, world!'); // ✓ Valid
 * validateText(''); // ✗ Throws: Empty
 * validateText('   '); // ✗ Throws: Whitespace only
 * validateText('x'.repeat(6000)); // ✗ Throws: Too long
 *
 * // Custom max length
 * validateText('Short message', 100); // ✓ Valid
 * validateText('Long message...', 10); // ✗ Throws: Exceeds 10 chars
 * ```
 */
export function validateText(text: string, maxLength: number = 5000): void {
  if (typeof text !== 'string') {
    throw new ValidationError('Text must be a string', 'text', text);
  }

  if (text.trim().length === 0) {
    throw new ValidationError('Text cannot be empty', 'text', text);
  }

  if (text.length > maxLength) {
    throw new ValidationError(
      `Text length cannot exceed ${maxLength} characters`,
      'text',
      text
    );
  }
}

/**
 * Validate language code format.
 *
 * @param languageCode - Language code to validate (e.g., 'en-US')
 * @throws {ValidationError} If language code format is invalid
 *
 * @remarks
 * **Format:** `xx-XX` (ISO 639-1 + ISO 3166-1)
 * - xx: Lowercase 2-letter language code
 * - XX: Uppercase 2-letter country code
 *
 * **Examples:**
 * - `en-US`: English (United States)
 * - `en-GB`: English (United Kingdom)
 * - `es-ES`: Spanish (Spain)
 * - `fr-FR`: French (France)
 *
 * @example
 * ```typescript
 * validateLanguageCode('en-US'); // ✓ Valid
 * validateLanguageCode('es-ES'); // ✓ Valid
 * validateLanguageCode('en'); // ✗ Throws: Missing country
 * validateLanguageCode('EN-US'); // ✗ Throws: Wrong case
 * validateLanguageCode('eng-USA'); // ✗ Throws: Wrong format
 * ```
 */
export function validateLanguageCode(languageCode: string): void {
  if (typeof languageCode !== 'string') {
    throw new ValidationError(
      'Language code must be a string',
      'languageCode',
      languageCode
    );
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
 * Validate voice name format.
 *
 * @param voiceName - Voice name to validate
 * @throws {ValidationError} If voice name is invalid or empty
 *
 * @remarks
 * Validates that voice name is a non-empty string.
 * Format depends on TTS provider (e.g., 'en-US-Neural2-F' for Google).
 *
 * @example
 * ```typescript
 * validateVoiceName('en-US-Neural2-F'); // ✓ Valid
 * validateVoiceName('en-US-Wavenet-A'); // ✓ Valid
 * validateVoiceName(''); // ✗ Throws: Empty
 * ```
 */
export function validateVoiceName(voiceName: string): void {
  if (typeof voiceName !== 'string') {
    throw new ValidationError(
      'Voice name must be a string',
      'voiceName',
      voiceName
    );
  }

  if (voiceName.trim().length === 0) {
    throw new ValidationError(
      'Voice name cannot be empty',
      'voiceName',
      voiceName
    );
  }
}

/**
 * Validate audio encoding format.
 *
 * @param encoding - Audio encoding to validate
 * @throws {ValidationError} If encoding is not supported
 *
 * @remarks
 * **Supported Formats:**
 * - MP3: Most common, good compression
 * - WAV: Uncompressed, highest quality
 * - OGG: Open format, good compression
 *
 * @example
 * ```typescript
 * validateAudioEncoding('MP3'); // ✓ Valid
 * validateAudioEncoding('WAV'); // ✓ Valid
 * validateAudioEncoding('OGG'); // ✓ Valid
 * validateAudioEncoding('AAC'); // ✗ Throws: Not supported
 * ```
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
 * Validate STT encoding format.
 *
 * @param encoding - STT encoding to validate
 * @throws {ValidationError} If encoding is not supported
 *
 * @remarks
 * **Supported Formats:**
 * - LINEAR16: 16-bit PCM (most common)
 * - FLAC: Lossless compression
 * - MULAW: 8-bit telephone quality
 * - AMR/AMR_WB: Adaptive multi-rate
 * - OGG_OPUS: Opus codec
 * - SPEEX_WITH_HEADER_BYTE: Speex codec
 * - WEBM_OPUS: WebM container
 *
 * @example
 * ```typescript
 * validateSTTEncoding('LINEAR16'); // ✓ Valid
 * validateSTTEncoding('FLAC'); // ✓ Valid
 * validateSTTEncoding('MP3'); // ✗ Throws: Not supported for STT
 * ```
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
 * Validate sample rate.
 *
 * @param sampleRate - Sample rate in Hz to validate
 * @throws {ValidationError} If sample rate is not supported
 *
 * @remarks
 * **Supported Rates:**
 * - 8000 Hz: Telephone quality
 * - 16000 Hz: Wideband, optimal for STT
 * - 24000 Hz: High quality
 * - 32000 Hz: Very high quality
 * - 44100 Hz: CD quality
 * - 48000 Hz: Professional audio
 *
 * @example
 * ```typescript
 * validateSampleRate(16000); // ✓ Valid
 * validateSampleRate(44100); // ✓ Valid
 * validateSampleRate(22050); // ✗ Throws: Not in supported list
 * ```
 */
export function validateSampleRate(sampleRate: number): void {
  if (typeof sampleRate !== 'number' || isNaN(sampleRate)) {
    throw new ValidationError(
      'Sample rate must be a valid number',
      'sampleRate',
      sampleRate
    );
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
 * Validate file path for security.
 *
 * @param filePath - File path to validate
 * @throws {ValidationError} If path is unsafe
 *
 * @remarks
 * **Security Checks:**
 * - Must be a non-empty string
 * - Cannot contain `..` (directory traversal)
 *
 * **Note:** This is basic validation. Use `validateSafePath` from
 * secure-exec for comprehensive security checks.
 *
 * @example
 * ```typescript
 * validateFilePath('./output.wav'); // ✓ Valid
 * validateFilePath('/tmp/audio.mp3'); // ✓ Valid
 * validateFilePath('../../../etc/passwd'); // ✗ Throws: Traversal
 * validateFilePath(''); // ✗ Throws: Empty
 * ```
 */
export function validateFilePath(filePath: string): void {
  if (typeof filePath !== 'string') {
    throw new ValidationError(
      'File path must be a string',
      'filePath',
      filePath
    );
  }

  if (filePath.trim().length === 0) {
    throw new ValidationError(
      'File path cannot be empty',
      'filePath',
      filePath
    );
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
 * Validate API key format.
 *
 * @param apiKey - API key to validate
 * @throws {ValidationError} If API key is invalid
 *
 * @remarks
 * **Checks:**
 * - Must be a non-empty string
 * - Minimum length of 20 characters
 * - (Google AI keys are typically 39 characters)
 *
 * **Note:** This is format validation only, not authentication.
 *
 * @example
 * ```typescript
 * validateAPIKey('AIzaSyD...38characters...'); // ✓ Valid
 * validateAPIKey('short'); // ✗ Throws: Too short
 * validateAPIKey(''); // ✗ Throws: Empty
 * ```
 */
export function validateAPIKey(apiKey: string): void {
  if (typeof apiKey !== 'string') {
    throw new ValidationError(
      'API key must be a string',
      'apiKey',
      typeof apiKey
    );
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
 * Sanitize text input to prevent injection attacks.
 *
 * @param text - Text to sanitize
 * @returns Sanitized text
 *
 * @remarks
 * **Sanitization:**
 * - Removes control characters (0x00-0x1F, 0x7F)
 * - Trims whitespace
 * - Safe for use in commands and logs
 *
 * @example
 * ```typescript
 * const clean = sanitizeText('Hello\x00World\x1B'); // 'HelloWorld'
 * const trimmed = sanitizeText('  text  '); // 'text'
 * ```
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
 * Normalize language code to standard format.
 *
 * @param languageCode - Language code to normalize
 * @returns Normalized language code (e.g., 'en-US')
 *
 * @remarks
 * Converts to standard format: lowercase language + uppercase country
 *
 * @example
 * ```typescript
 * normalizeLanguageCode('EN-us'); // 'en-US'
 * normalizeLanguageCode('Es-ES'); // 'es-ES'
 * normalizeLanguageCode('invalid'); // 'invalid' (unchanged)
 * ```
 */
export function normalizeLanguageCode(languageCode: string): string {
  const parts = languageCode.split('-');

  if (parts.length !== 2) {
    return languageCode;
  }

  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

/**
 * Clamp number to range.
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 *
 * @example
 * ```typescript
 * clamp(5, 0, 10); // 5
 * clamp(-5, 0, 10); // 0
 * clamp(15, 0, 10); // 10
 *
 * // Ensure volume is in valid range
 * const volume = clamp(userVolume, 0, 1);
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Result type for safe JSON parsing.
 *
 * @template T - Expected type of parsed data
 *
 * @remarks
 * Discriminated union for type-safe result handling:
 * - Success: `{ success: true, data: T }`
 * - Failure: `{ success: false, error: string }`
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
 * Safely parse JSON with typed result.
 *
 * @template T - Expected type of parsed data
 * @param json - JSON string to parse
 * @returns Validation result with success/failure status
 *
 * @remarks
 * Never throws - always returns a result object.
 * Use type guard to check success before accessing data.
 *
 * @example
 * ```typescript
 * const result = safeJSONParse<{ name: string }>('{"name":"John"}');
 *
 * if (result.success) {
 *   console.log('Name:', result.data.name);
 * } else {
 *   console.error('Parse error:', result.error);
 * }
 *
 * // Type-safe handling
 * interface Config {
 *   apiKey: string;
 *   timeout: number;
 * }
 *
 * const configResult = safeJSONParse<Config>(configString);
 * if (configResult.success) {
 *   // TypeScript knows result.data is Config
 *   const config: Config = configResult.data;
 * }
 * ```
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
 * Check if value is a valid number.
 *
 * @param value - Value to check
 * @returns True if value is a valid, finite number
 *
 * @remarks
 * Returns false for:
 * - NaN
 * - Infinity / -Infinity
 * - Non-number types
 *
 * @example
 * ```typescript
 * isValidNumber(42); // true
 * isValidNumber(3.14); // true
 * isValidNumber(NaN); // false
 * isValidNumber(Infinity); // false
 * isValidNumber('42'); // false
 * ```
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a non-empty string.
 *
 * @param value - Value to check
 * @returns True if value is a non-empty string (after trimming)
 *
 * @example
 * ```typescript
 * isNonEmptyString('hello'); // true
 * isNonEmptyString('  text  '); // true
 * isNonEmptyString(''); // false
 * isNonEmptyString('   '); // false (whitespace only)
 * isNonEmptyString(42); // false
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate complete VoiceTestInput object.
 *
 * @param input - Voice test input to validate
 * @throws {ValidationError} If any field is invalid
 *
 * @remarks
 * Validates all fields in one call:
 * - Required: text, languageCode, voiceName
 * - Optional: audioEncoding, speakingRate, pitch, backgroundVolume
 *
 * @example
 * ```typescript
 * const input = {
 *   text: 'Hello, world!',
 *   languageCode: 'en-US',
 *   voiceName: 'en-US-Neural2-F',
 *   speakingRate: 1.0,
 *   pitch: 0.0,
 *   audioEncoding: 'MP3',
 *   backgroundVolume: 0.2
 * };
 *
 * try {
 *   validateVoiceTestInput(input);
 *   // All fields valid, proceed
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 * ```
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
