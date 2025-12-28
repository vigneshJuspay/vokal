/**
 * TTS Provider Types
 *
 * Provider-agnostic interface for Text-to-Speech services.
 * Allows registration of different TTS providers (Google, Azure, AWS, ElevenLabs, etc.)
 *
 * @module types/tts-provider
 * @since 2.0.0
 */

/**
 * Supported TTS provider names
 */
export type TTSProviderName = string;

/**
 * TTS generation request configuration
 */
export interface TTSRequest {
  /** Text to convert to speech */
  text: string;
  /** Voice identifier (provider-specific) */
  voice: string;
  /** Language code (e.g., 'en-US', 'es-ES') */
  languageCode?: string;
  /** Audio format (mp3, wav, ogg, opus) */
  format?: 'mp3' | 'wav' | 'ogg' | 'opus';
  /** Speaking rate (0.25 to 4.0) */
  speed?: number;
  /** Voice pitch (-20.0 to 20.0 semitones) */
  pitch?: number;
  /** Audio sample rate in Hz */
  sampleRate?: number;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
}

/**
 * TTS generation response
 */
export interface TTSResponse {
  /** Audio data as Buffer */
  buffer: Buffer;
  /** Audio format */
  format: string;
  /** Audio size in bytes */
  size: number;
  /** Duration in seconds (optional) */
  duration?: number;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Voice information
 */
export interface VoiceInfo {
  /** Unique voice identifier */
  id: string;
  /** Human-readable voice name */
  name: string;
  /** Language code */
  languageCode: string;
  /** Gender (male, female, neutral) */
  gender?: 'male' | 'female' | 'neutral';
  /** Voice type (neural, standard, wavenet, etc.) */
  type?: string;
  /** Description of the voice */
  description?: string;
}

/**
 * TTS Provider interface
 *
 * All TTS providers must implement this interface
 */
export interface TTSProvider {
  /** Provider name */
  readonly name: TTSProviderName;

  /**
   * Initialize the provider with configuration
   * @param config - Provider-specific configuration
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Generate speech from text
   * @param request - TTS generation request
   * @returns Audio response
   */
  generate(request: TTSRequest): Promise<TTSResponse>;

  /**
   * Get available voices
   * @param languageCode - Optional language filter
   * @returns List of available voices
   */
  getVoices(languageCode?: string): Promise<VoiceInfo[]>;

  /**
   * Check if provider is ready
   * @returns True if provider is initialized and ready
   */
  isReady(): boolean;

  /**
   * Clean up provider resources
   */
  cleanup?(): Promise<void>;
}

/**
 * TTS Provider factory function type
 */
export type TTSProviderFactory = (
  config: Record<string, unknown>
) => TTSProvider;

/**
 * TTS Provider registry entry
 */
export interface TTSProviderRegistryEntry {
  /** Provider factory function */
  factory: TTSProviderFactory;
  /** Default configuration */
  defaultConfig?: Record<string, unknown>;
}
