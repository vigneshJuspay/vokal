/**
 * CLI Types
 * Command-line interface type definitions
 */

/**
 * Generate Command Arguments
 */
export type GenerateCommandArgs = {
  text: string;
  voice: string;
  lang: string;
  encoding: 'MP3' | 'WAV' | 'OGG';
  rate: number;
  pitch: number;
  output?: string;
  bg?: string;
  bgvol: number;
  play: boolean;
  apiKey?: string;
  quiet: boolean;
  debug: boolean;
};

/**
 * Voices Command Arguments
 */
export type VoicesCommandArgs = {
  language?: string;
  apiKey?: string;
  format: string;
  quiet: boolean;
};

/**
 * Test Audio Command Arguments
 */
export type TestAudioCommandArgs = {
  apiKey?: string;
};

/**
 * Play Command Arguments
 */
export type PlayCommandArgs = {
  file: string;
  apiKey?: string;
};

/**
 * Test Command Arguments
 */
export type TestCommandArgs = {
  config: string;
  saveSample: boolean;
  apiKey?: string;
  provider: string;
  quiet: boolean;
  debug: boolean;
};

/**
 * Voice information
 */
export type Voice = {
  name: string;
  gender: string;
  type: string;
  languageCode: string;
};

/**
 * Background sound information
 */
export type BackgroundSound = {
  name: string;
  description: string;
  defaultVolume: number;
  loop: boolean;
};
