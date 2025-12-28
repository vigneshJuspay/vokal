/**
 * STT Optimizer - Industry Best Practices for Speech Recognition
 *
 * Provides optimized configuration and audio preprocessing for achieving high-confidence
 * speech-to-text transcription. Based on Google Cloud Speech-to-Text production guidelines
 * and industry best practices.
 *
 * @module utils/stt-optimizer
 * @since 1.0.0
 *
 * @remarks
 * This module optimizes STT accuracy through:
 * - **Optimal Configuration**: Provider-specific sample rates and models
 * - **Audio Validation**: Quality checks for volume and duration
 * - **Volume Normalization**: Automatic level adjustment to target range
 * - **Phrase Boosting**: Context-aware speech recognition hints
 * - **Confidence Analysis**: Transcription quality assessment
 *
 * Target: >90% confidence for clear, synthesized speech
 *
 * @example
 * ```typescript
 * import { getOptimalConfig, normalizeVolume, validateAudio } from './utils/stt-optimizer.js';
 *
 * // Get optimal config for TTS provider
 * const config = getOptimalConfig('google', ['hello', 'world']);
 *
 * // Validate audio quality
 * const validation = validateAudio(audioBuffer);
 * if (!validation.isValid) {
 *   console.warn('Audio issues:', validation.issues);
 * }
 *
 * // Normalize volume for optimal recognition
 * const normalized = normalizeVolume(audioBuffer);
 * ```
 */

import { createComponentLogger } from './logger.js';
import type { STTConfig } from '../types/index.js';

const logger = createComponentLogger('STTOptimizer');

/**
 * Get optimal STT configuration for TTS provider.
 *
 * @param ttsProvider - TTS provider used to generate the audio
 * @param expectedPhrases - Optional phrases to boost recognition accuracy
 * @returns Optimized STT configuration
 *
 * @remarks
 * **Provider Sample Rates:**
 * - Google TTS: 24kHz (matches output)
 * - ElevenLabs: 44.1kHz (high quality)
 * - Azure: 24kHz
 * - AWS Polly: 24kHz
 *
 * **Optimizations:**
 * - Uses `latest_short` model for synthesized speech
 * - Enables automatic punctuation
 * - Requests 5 alternatives for confidence comparison
 * - Adds phrase boosting if expected phrases provided
 *
 * @example
 * ```typescript
 * // Basic configuration
 * const config = getOptimalConfig('google');
 *
 * // With phrase boosting
 * const configWithPhrases = getOptimalConfig('google', [
 *   'customer service',
 *   'technical support',
 *   'account balance'
 * ]);
 *
 * // Use with STT service
 * const stt = new StreamingSTTService();
 * const result = await stt.transcribe(audioBuffer, config);
 * ```
 */
export function getOptimalConfig(
  ttsProvider: 'google' | 'elevenlabs' | 'azure' | 'aws',
  expectedPhrases?: string[]
): STTConfig {
  const configs = {
    google: { sampleRate: 24000 }, // Google TTS outputs at 24kHz
    elevenlabs: { sampleRate: 44100 }, // ElevenLabs uses 44.1kHz
    azure: { sampleRate: 24000 }, // Azure uses 24kHz
    aws: { sampleRate: 24000 }, // AWS Polly uses 24kHz
  };

  return {
    encoding: 'LINEAR16',
    sampleRate: configs[ttsProvider].sampleRate,
    model: 'latest_short', // Best for clear, synthesized speech
    speechContexts: expectedPhrases
      ? [{ phrases: expectedPhrases }]
      : undefined,
    enableAutomaticPunctuation: true,
    maxAlternatives: 5, // Get top 5 to choose highest confidence
  };
}

/**
 * Validate audio quality for speech recognition.
 *
 * @param buffer - Audio buffer to validate (16-bit PCM)
 * @returns Validation result with issues and metrics
 *
 * @remarks
 * **Validation Checks:**
 * - **Duration**: Must be at least 100ms
 * - **Volume**: Between 5% and 95% to avoid clipping
 * - **Peak Amplitude**: Measured across all samples
 *
 * **Common Issues:**
 * - "Audio too short": Less than 100ms duration
 * - "Volume too low": Peak below 5% (microphone issue)
 * - "Volume too high (clipping)": Peak above 95% (distortion)
 *
 * @example
 * ```typescript
 * const validation = validateAudio(audioBuffer);
 *
 * if (!validation.isValid) {
 *   console.error('Audio validation failed:');
 *   validation.issues.forEach(issue => console.error(`  - ${issue}`));
 *   console.log(`Volume: ${validation.volume.toFixed(1)}%`);
 *   console.log(`Duration: ${validation.duration.toFixed(0)}ms`);
 * } else {
 *   console.log('Audio quality: PASS');
 * }
 * ```
 */
export function validateAudio(buffer: Buffer): {
  isValid: boolean;
  volume: number;
  duration: number;
  issues: string[];
} {
  const issues: string[] = [];

  // Calculate peak volume
  let maxAmplitude = 0;
  for (let i = 0; i < buffer.length - 1; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    maxAmplitude = Math.max(maxAmplitude, sample);
  }

  const volume = (maxAmplitude / 32767) * 100;
  const duration = (buffer.length / 2 / 16000) * 1000; // assuming 16kHz

  // Validate
  if (duration < 100) {
    issues.push('Audio too short');
  }
  if (volume < 5) {
    issues.push('Volume too low');
  }
  if (volume > 95) {
    issues.push('Volume too high (clipping)');
  }

  return {
    isValid: issues.length === 0,
    volume,
    duration,
    issues,
  };
}

/**
 * Normalize audio volume to optimal level for speech recognition.
 *
 * @param buffer - Audio buffer to normalize (16-bit PCM)
 * @param targetVolume - Target volume level (0.0 to 1.0, default: 0.65)
 * @returns Normalized audio buffer
 *
 * @remarks
 * **Most Important Preprocessing Step**
 *
 * Volume normalization significantly improves STT accuracy by:
 * - Ensuring consistent audio levels
 * - Preventing clipping and distortion
 * - Optimizing for speech recognition algorithms
 *
 * **Target Range:** 60-70% (0.6-0.7)
 *
 * **Behavior:**
 * - Only normalizes if volume is <10% or >85%
 * - Maintains dynamic range (no compression)
 * - Prevents clipping at ±32767 (16-bit max)
 * - Returns original buffer if already in acceptable range
 *
 * @example
 * ```typescript
 * // Normalize to default 65% volume
 * const normalized = normalizeVolume(audioBuffer);
 *
 * // Custom target volume
 * const normalized70 = normalizeVolume(audioBuffer, 0.70);
 *
 * // Check if normalization occurred
 * const validation = validateAudio(audioBuffer);
 * if (validation.volume < 10 || validation.volume > 85) {
 *   const normalized = normalizeVolume(audioBuffer);
 *   console.log('Audio normalized for optimal recognition');
 * }
 * ```
 */
export function normalizeVolume(buffer: Buffer, targetVolume = 0.65): Buffer {
  // Find current peak
  let maxAmplitude = 0;
  for (let i = 0; i < buffer.length - 1; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    maxAmplitude = Math.max(maxAmplitude, sample);
  }

  const currentVolume = maxAmplitude / 32767;

  // Only normalize if significantly off target
  if (currentVolume < 0.1 || currentVolume > 0.85) {
    const gain = (targetVolume * 32767) / maxAmplitude;
    const normalized = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length - 1; i += 2) {
      const sample = buffer.readInt16LE(i);
      const adjusted = Math.max(-32768, Math.min(32767, sample * gain));
      normalized.writeInt16LE(adjusted, i);
    }

    logger.debug(
      `Volume normalized: ${(currentVolume * 100).toFixed(1)}% -> ${(targetVolume * 100).toFixed(1)}%`
    );
    return normalized;
  }

  return buffer;
}

/**
 * Build speech contexts for phrase boosting.
 *
 * @param phrases - Array of expected phrases or keywords
 * @returns Speech contexts array with boost values
 *
 * @remarks
 * **Phrase Boosting Benefits:**
 * - 20-30% accuracy improvement for expected phrases
 * - Helps with domain-specific terminology
 * - Improves recognition of names and technical terms
 *
 * **Optimal Boost Value:** 20.0
 * - Higher values may cause over-boosting
 * - Lower values have minimal effect
 *
 * **Best Practices:**
 * - Include common variations of phrases
 * - Add proper nouns and technical terms
 * - Limit to 50-100 most important phrases
 * - Use exact expected wording when possible
 *
 * @example
 * ```typescript
 * // Domain-specific phrases
 * const contexts = buildSpeechContexts([
 *   'account number',
 *   'routing number',
 *   'balance inquiry',
 *   'transfer funds'
 * ]);
 *
 * // Names and locations
 * const nameContexts = buildSpeechContexts([
 *   'John Smith',
 *   'New York',
 *   'Los Angeles'
 * ]);
 *
 * // Use with STT config
 * const config = {
 *   ...getOptimalConfig('google'),
 *   speechContexts: buildSpeechContexts(expectedPhrases)
 * };
 * ```
 */
export function buildSpeechContexts(
  phrases: string[]
): Array<{ phrases: string[]; boost: number }> {
  if (!phrases || phrases.length === 0) {
    return [];
  }

  return [
    {
      phrases: phrases,
      boost: 20.0, // Optimal boost value
    },
  ];
}

/**
 * Analyze transcription confidence level.
 *
 * @param confidence - Confidence score from STT (0.0 to 1.0)
 * @returns Analysis result with reliability assessment and recommendation
 *
 * @remarks
 * **Confidence Levels:**
 * - **Excellent** (≥95%): Perfect transcription, production ready
 * - **Good** (≥90%): Meets reliability target, acceptable for most uses
 * - **Fair** (≥75%): May have minor errors, review recommended
 * - **Poor** (<75%): Likely errors, check audio quality or configuration
 *
 * **Reliability Threshold:** 90%
 * - Above 90%: Considered reliable for production use
 * - Below 90%: Requires human review or re-recording
 *
 * @example
 * ```typescript
 * const analysis = analyzeConfidence(0.92);
 *
 * console.log(`Confidence: ${analysis.level}`);
 * console.log(`Reliable: ${analysis.isReliable}`);
 * console.log(`Recommendation: ${analysis.recommendation}`);
 *
 * if (!analysis.isReliable) {
 *   console.warn('Consider improving audio quality or adding phrase hints');
 * }
 *
 * // Handle different confidence levels
 * if (analysis.level === 'poor') {
 *   // Re-record or check audio configuration
 *   await recordAgain();
 * } else if (analysis.level === 'fair') {
 *   // Add phrase boosting
 *   const contexts = buildSpeechContexts(expectedPhrases);
 * } else {
 *   // Good to go!
 *   await processTranscript(transcript);
 * }
 * ```
 */
export function analyzeConfidence(confidence: number): {
  isReliable: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
} {
  if (confidence >= 0.95) {
    return {
      isReliable: true,
      level: 'excellent',
      recommendation: 'Perfect transcription',
    };
  } else if (confidence >= 0.9) {
    return {
      isReliable: true,
      level: 'good',
      recommendation: 'Meets reliability target',
    };
  } else if (confidence >= 0.75) {
    return {
      isReliable: false,
      level: 'fair',
      recommendation: 'Check audio quality and add phrase hints',
    };
  } else {
    return {
      isReliable: false,
      level: 'poor',
      recommendation: 'Audio quality issue or wrong language/model',
    };
  }
}
