/**
 * Voice Interaction Types
 * All voice interaction-related type definitions
 */

/**
 * Voice Interaction Configuration
 */
export type VoiceInteractionConfig = {
  /** Language code for speech recognition */
  languageCode?: string;
  /** Alternative: language */
  language?: string;

  /** Voice for TTS responses */
  voiceName?: string;
  /** Alternative: voice */
  voice?: string;

  /** Recording duration in milliseconds */
  recordingDuration?: number;
  /** Maximum recording duration */
  maxRecordingDuration?: number;

  /** Sample rate for audio */
  sampleRate?: number;

  /** Silence timeout */
  silenceTimeout?: number;

  /** Confidence threshold */
  confidenceThreshold?: number;

  /** Background sound for questions */
  backgroundSound?: string;
  /** Background volume */
  backgroundVolume?: number;

  /** Delay after TTS playback before starting recording (milliseconds) */
  questionDelay?: number;
};

/**
 * Voice Interaction Options (alias for config)
 */
export type VoiceInteractionOptions = VoiceInteractionConfig;

/**
 * Voice Interaction Result
 */
export type VoiceInteractionResult = {
  /** Transcribed text */
  transcript: string;

  /** Confidence of transcription */
  confidence: number;

  /** Audio file path */
  audioFilePath: string;

  /** Processing time */
  processingTime: number;

  /** Duration of interaction */
  duration: number;

  /** Audio processed in bytes */
  audioProcessed: number;

  /** Maximum volume level */
  maxVolume: number;
};

/**
 * Streaming STT Result
 */
export type StreamingSTTResult = {
  /** Transcribed text */
  transcript: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence: number;
};

/**
 * STT Session interface
 */
export type STTSession = {
  writeAudio: (audioChunk: Buffer) => void;
  endStream: () => void;
  isActive: () => boolean;
};

/**
 * System Validation interface
 */
export type SystemValidation = {
  tts: boolean;
  audio: boolean;
  stt: boolean;
  errors: string[];
};
