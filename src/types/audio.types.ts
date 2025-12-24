/**
 * Audio Recording and Mixing Types
 * All audio-related type definitions
 */

/**
 * Audio Recording Configuration
 */
export type AudioConfig = {
  sampleRate?: number;
  channels?: number;
  encoding?: string;
  bitDepth?: number;
  silenceThreshold?: number;
  silenceDuration?: number;
  vadSettings?: {
    silenceThreshold?: number;
    silenceDuration?: number;
  };
};

/**
 * Audio Recording Session
 */
export type AudioRecordingSession = {
  filePath?: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  encoding?: string;
  fileSize?: number;
  audioStream?: NodeJS.ReadableStream;
  stop?: () => void;
  pause?: () => void;
  resume?: () => void;
  isRecording?: () => boolean;
  getVolumeLevel?: () => number;
};

/**
 * Audio Device
 */
export type AudioDevice = {
  id: string;
  name: string;
  isDefault: boolean;
  type: 'input' | 'output';
};

/**
 * Audio Data for mixing
 */
export type AudioData = {
  samples: number[];
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};
