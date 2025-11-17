/**
 * STT Optimizer - Industry Best Practices for >90% Confidence
 * Based on Google Cloud Speech-to-Text production guidelines
 */

import { createComponentLogger } from './logger.js';

const logger = createComponentLogger('STTOptimizer');

/**
 * TTS-optimized STT configuration
 * These are the settings that actually matter for reliability
 */
export interface STTConfig {
  // Audio format (critical)
  encoding: 'LINEAR16';
  sampleRate: number;

  // Model selection (critical)
  model: 'latest_short' | 'latest_long' | 'phone_call';

  // Speech adaptation (20-30% accuracy boost)
  phraseHints?: string[];
  phraseBoost?: number; // 15-20 recommended

  // API settings
  enableAutomaticPunctuation: boolean;
  maxAlternatives: number;
}

/**
 * Get optimal STT config for TTS provider
 * This is based on actual TTS output characteristics
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
    phraseHints: expectedPhrases,
    phraseBoost: expectedPhrases && expectedPhrases.length > 0 ? 20 : undefined,
    enableAutomaticPunctuation: true,
    maxAlternatives: 5, // Get top 5 to choose highest confidence
  };
}

/**
 * Simple audio quality check
 * Only validates the essentials: volume and duration
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
 * Normalize audio volume to optimal level (60-70%)
 * This is the single most important preprocessing step
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
 * Build speech contexts for phrase boosting
 * 20-30% accuracy improvement for expected phrases
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
 * Analyze transcription confidence
 */
export function analyzeConfidence(confidence: number): {
  isReliable: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
} {
  if (confidence >= 0.95) {
    return { isReliable: true, level: 'excellent', recommendation: 'Perfect transcription' };
  } else if (confidence >= 0.9) {
    return { isReliable: true, level: 'good', recommendation: 'Meets reliability target' };
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
