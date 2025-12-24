/**
 * Streaming Speech-to-Text Types
 * All streaming STT-related type definitions
 */

/**
 * Streaming STT Configuration
 */
export type StreamingSTTConfig = {
  languageCode: string;
  sampleRate: number;
  encoding: string;
  interimResults?: boolean;
  speechStartTimeout?: number;
  speechEndTimeout?: number;
};

/**
 * Streaming STT Result
 */
export type StreamingSTTResult = {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  stability?: number;
};
