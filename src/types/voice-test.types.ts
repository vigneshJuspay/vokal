/**
 * Voice Test Service Types
 * TTS and voice generation-related type definitions
 */

/**
 * Audio format types
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'opus';

/**
 * Audio encoding types - matches the main VoiceTestInput definition
 */
export type AudioEncoding = 'MP3' | 'WAV' | 'OGG';

/**
 * Voice Test Input for TTS generation
 * Note: This should match the VoiceTestInput in index.ts
 */
export type VoiceTestInput = {
  text: string;
  languageCode: string;
  voiceName: string;
  audioEncoding?: AudioEncoding;
  play?: boolean;
  backgroundSound?: string;
  backgroundVolume?: number;
  outputPath?: string;
  speakingRate?: number;
  pitch?: number;
  output?: string;
};

/**
 * TTS Options (from Neurolink, not exported)
 */
export type TTSOptions = {
  enabled?: boolean;
  useAiResponse?: boolean;
  voice?: string;
  format?: AudioFormat;
  speed?: number;
  pitch?: number;
  volumeGainDb?: number;
  quality?: 'standard' | 'hd';
  output?: string;
  play?: boolean;
};

/**
 * TTS Result (from Neurolink, not exported)
 */
export type TTSResult = {
  buffer: Buffer;
  format: AudioFormat;
  size: number;
  duration?: number;
  voice?: string;
  sampleRate?: number;
  metadata?: {
    latency: number;
    provider?: string;
    [key: string]: unknown;
  };
};

/**
 * Google Voice type (from Neurolink, not exported)
 */
export type GoogleVoice = {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
};
