/**
 * STT Provider Types
 *
 * Provider-agnostic interface for Speech-to-Text services.
 * Following Neurolink's handler-based architecture pattern.
 *
 * @module types/stt-provider
 * @since 2.0.0
 */

/**
 * Supported STT provider names
 */
export type STTProviderName = string;

/**
 * STT transcription request configuration
 */
export interface STTRequest {
  /** Audio data as Buffer */
  audio: Buffer;
  /** Audio encoding format */
  encoding: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'WEBM_OPUS';
  /** Audio sample rate in Hz */
  sampleRate: number;
  /** Language code (e.g., 'en-US', 'es-ES') */
  languageCode: string;
  /** Recognition model to use */
  model?: string;
  /** Enable automatic punctuation */
  enableAutomaticPunctuation?: boolean;
  /** Speech contexts for better recognition */
  speechContexts?: Array<{ phrases: string[]; boost?: number }>;
  /** Maximum number of alternatives to return */
  maxAlternatives?: number;
}

/**
 * STT transcription response
 */
export interface STTResponse {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Alternative transcriptions */
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  /** Word-level timing information */
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  /** Provider name */
  provider: string;
  /** Latency in milliseconds */
  latency?: number;
}

/**
 * Streaming STT configuration
 */
export interface StreamingSTTConfig {
  /** Audio encoding format */
  encoding: string;
  /** Audio sample rate in Hz */
  sampleRate: number;
  /** Language code */
  languageCode: string;
  /** Enable interim results */
  interimResults?: boolean;
  /** Speech start timeout in seconds */
  speechStartTimeout?: number;
  /** Speech end timeout in seconds */
  speechEndTimeout?: number;
  /** Recognition model */
  model?: string;
  /** Speech contexts */
  speechContexts?: Array<{ phrases: string[]; boost?: number }>;
  /** Enable voice activity events */
  enableVoiceActivityEvents?: boolean;
}

/**
 * Streaming STT result
 */
export interface StreamingSTTResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score */
  confidence: number;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Stability score for interim results */
  stability?: number;
}

/**
 * Streaming session control interface
 */
export interface StreamingSession {
  /** Write audio chunk to the stream */
  writeAudio(chunk: Buffer): void;
  /** End the streaming session */
  endStream(): void;
  /** Check if stream is active */
  isActive(): boolean;
}

/**
 * STT Handler interface
 *
 * All STT provider handlers must implement this interface.
 * Based on Neurolink's handler pattern.
 */
export interface STTHandler {
  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can transcribe audio
   */
  isConfigured(): boolean;

  /**
   * Transcribe audio using provider-specific STT API
   *
   * @param request - STT transcription request
   * @returns Transcription response with metadata
   */
  transcribe(request: STTRequest): Promise<STTResponse>;

  /**
   * Start streaming transcription session
   *
   * @param config - Streaming configuration
   * @param onResult - Callback for transcription results
   * @param onSpeechStart - Callback when speech starts
   * @param onSpeechEnd - Callback when speech ends
   * @param onError - Callback for errors
   * @returns Streaming session control interface
   */
  startStreaming(
    config: StreamingSTTConfig,
    onResult: (result: StreamingSTTResult) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void,
    onError?: (error: Error) => void
  ): StreamingSession;
}
