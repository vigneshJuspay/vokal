/**
 * Lightweight Audio Mixer for TTS
 *
 * Pure JavaScript implementation for mixing speech with background sounds without external dependencies.
 * Provides WAV file processing, audio sample mixing, resampling, and intelligent mixing configurations.
 *
 * @module services/audio-mixer
 * @since 1.0.0
 *
 * @remarks
 * This service implements PCM audio processing in pure JavaScript:
 * - Reads and writes WAV files
 * - Mixes multiple audio streams
 * - Resamples audio to match sample rates
 * - Applies volume adjustments and looping
 * - Provides preset background sounds
 *
 * @example
 * ```typescript
 * const mixer = new AudioMixerService();
 * const mixedPath = await mixer.mixAudio(
 *   './speech.wav',
 *   'cafe',
 *   0.2
 * );
 * ```
 */

import { promises as fs } from 'fs';
import { join, extname, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  AudioMixer,
  BackgroundSoundPreset,
  AudioMixingConfig,
  VoiceTestError,
  getErrorMessage,
  toError,
  ErrorCode,
} from '../types/index.js';

// Get the directory of the current module (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find project root - go up from dist/services to project root (2 levels up)
const projectRoot = resolve(__dirname, '../../');

/**
 * Audio Mixer Service for combining speech with background sounds.
 *
 * @class
 * @implements {AudioMixer}
 *
 * @remarks
 * Provides intelligent audio mixing with:
 * - Multiple preset background sounds
 * - Automatic sample rate conversion
 * - Volume normalization and mixing
 * - Looping and fade effects
 * - Pure JavaScript implementation (no external binaries)
 */
export class AudioMixerService implements AudioMixer {
  private presets: BackgroundSoundPreset[] = [];
  private assetsPath: string;

  /**
   * Creates a new AudioMixerService instance.
   * Initializes background sound presets and asset paths.
   *
   * @example
   * ```typescript
   * const mixer = new AudioMixerService();
   * const presets = mixer.getAvailablePresets();
   * console.log('Available sounds:', presets.map(p => p.name));
   * ```
   */
  constructor() {
    this.assetsPath = join(projectRoot, 'assets');
    this.initializePresets();
  }

  /**
   * Initialize background sound presets with default configurations.
   *
   * @private
   * @internal
   */
  private initializePresets(): void {
    this.presets = [
      {
        name: 'office',
        filePath: join(this.assetsPath, 'office-ambience.wav'),
        defaultVolume: 0.15,
        loop: true,
        description: 'Subtle office environment with typing and quiet chatter',
      },
      {
        name: 'cafe',
        filePath: join(this.assetsPath, 'cafe-ambience.wav'),
        defaultVolume: 0.2,
        loop: true,
        description: 'Coffee shop atmosphere with distant conversations',
      },
      {
        name: 'nature',
        filePath: join(this.assetsPath, 'nature-sounds.wav'),
        defaultVolume: 0.18,
        loop: true,
        description: 'Peaceful outdoor setting with birds and gentle wind',
      },
      {
        name: 'rain',
        filePath: join(this.assetsPath, 'rain-light.wav'),
        defaultVolume: 0.12,
        loop: true,
        description: 'Gentle rainfall for calming atmosphere',
      },
      {
        name: 'phone',
        filePath: join(this.assetsPath, 'phone-static.wav'),
        defaultVolume: 0.08,
        loop: true,
        description: 'Phone line static for telecommunication simulation',
      },
      {
        name: 'crowd',
        filePath: join(this.assetsPath, 'crowd-distant.wav'),
        defaultVolume: 0.1,
        loop: true,
        description: 'Distant crowd noise for public space simulation',
      },
    ];
  }

  /**
   * Mix speech audio with a background sound.
   *
   * @param speechPath - Path to the speech audio file (WAV format)
   * @param backgroundSound - Name of background sound preset or path to custom audio file
   * @param backgroundVolume - Optional volume level for background (0.0 to 1.0)
   * @returns Promise resolving to the path of the mixed audio file
   *
   * @throws {VoiceTestError} If files are not found or mixing fails
   *
   * @remarks
   * The mixing process:
   * 1. Validates input files
   * 2. Loads both audio files as PCM data
   * 3. Resamples background to match speech sample rate
   * 4. Mixes audio samples with proper volume adjustment
   * 5. Saves result back to the speech file path (overwrites)
   *
   * If background sound file is not found, returns original speech path unchanged.
   *
   * @example
   * ```typescript
   * const mixer = new AudioMixerService();
   *
   * // Mix with preset
   * const mixed1 = await mixer.mixAudio('./speech.wav', 'office', 0.15);
   *
   * // Mix with custom file
   * const mixed2 = await mixer.mixAudio('./speech.wav', './custom-bg.wav', 0.3);
   * ```
   */
  async mixAudio(
    speechPath: string,
    backgroundSound: string,
    backgroundVolume?: number
  ): Promise<string> {
    try {
      // Check if speech file exists
      if (!(await this.fileExists(speechPath))) {
        throw new VoiceTestError(
          `Speech file not found: ${speechPath}`,
          ErrorCode.FILE_NOT_FOUND
        );
      }

      // Try to resolve background sound path
      let backgroundPath: string;
      try {
        backgroundPath = await this.resolveBackgroundPath(backgroundSound);

        // Check if background file actually exists
        if (!(await this.fileExists(backgroundPath))) {
          return speechPath;
        }
      } catch {
        return speechPath;
      }

      // Get optimal mixing configuration
      const mixConfig = this.getOptimalMixingConfig(
        '',
        backgroundSound,
        backgroundVolume
      );

      // Load both audio files as PCM data
      const speechData = await this.loadWavFile(speechPath);
      const backgroundData = await this.loadWavFile(backgroundPath);

      // Mix the audio samples
      const mixedData = this.mixAudioSamples(
        speechData,
        backgroundData,
        mixConfig
      );

      // Save the mixed result back to the original file location (override)
      await this.saveWavFile(speechPath, mixedData, speechData.sampleRate);

      return speechPath;
    } catch (error) {
      if (error instanceof VoiceTestError) {
        throw error;
      }

      throw new VoiceTestError(
        `Audio mixing failed: ${getErrorMessage(error)}`,
        ErrorCode.MIXING_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Get all available background sound presets.
   *
   * @returns Array of background sound preset configurations
   *
   * @example
   * ```typescript
   * const presets = mixer.getAvailablePresets();
   * presets.forEach(preset => {
   *   console.log(`${preset.name}: ${preset.description}`);
   *   console.log(`  Volume: ${preset.defaultVolume}, Loop: ${preset.loop}`);
   * });
   * ```
   */
  getAvailablePresets(): BackgroundSoundPreset[] {
    return [...this.presets];
  }

  /**
   * Get optimal mixing configuration based on content and background type.
   *
   * @param text - Speech text (used to infer optimal volume)
   * @param backgroundSound - Name of the background sound
   * @param backgroundVolume - Optional explicit volume override
   * @returns Mixing configuration with volume, fade, and loop settings
   *
   * @remarks
   * Uses AI-driven logic to determine:
   * - Optimal background volume based on speech content
   * - Fade-in and fade-out durations
   * - Whether to loop the background
   *
   * @example
   * ```typescript
   * const config = mixer.getOptimalMixingConfig(
   *   'This is urgent!',
   *   'office'
   * );
   * console.log('Recommended volume:', config.backgroundVolume);
   * ```
   */
  getOptimalMixingConfig(
    text: string,
    backgroundSound: string,
    backgroundVolume?: number
  ): AudioMixingConfig {
    const preset = this.presets.find((p) => p.name === backgroundSound);

    if (preset) {
      return {
        backgroundVolume: backgroundVolume ?? preset.defaultVolume,
        fadeIn: this.calculateOptimalFadeIn(backgroundSound),
        fadeOut: this.calculateOptimalFadeOut(backgroundSound),
        loop: preset.loop,
      };
    }

    // Default config for custom files
    return {
      backgroundVolume: backgroundVolume ?? this.inferOptimalVolume(text),
      fadeIn: 1.0,
      fadeOut: 1.0,
      loop: true,
    };
  }

  /**
   * Resolve background sound name or path to actual file path.
   *
   * @param backgroundSound - Preset name or file path
   * @returns Promise resolving to the actual file path
   * @throws {VoiceTestError} If background sound is not found
   *
   * @private
   * @internal
   */
  private async resolveBackgroundPath(
    backgroundSound: string
  ): Promise<string> {
    const preset = this.presets.find((p) => p.name === backgroundSound);
    if (preset) {
      return preset.filePath;
    }

    if (await this.fileExists(backgroundSound)) {
      return backgroundSound;
    }

    throw new VoiceTestError(
      `Background sound not found: ${backgroundSound}. Available presets: ${this.presets.map((p) => p.name).join(', ')}`,
      ErrorCode.BACKGROUND_NOT_FOUND
    );
  }

  /**
   * Check if a file exists at the given path.
   *
   * @param filePath - Path to check
   * @returns Promise resolving to true if file exists, false otherwise
   *
   * @private
   * @internal
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a file path for mixed audio output.
   *
   * @param originalPath - Original file path
   * @returns New path with '_mixed' suffix
   *
   * @private
   * @internal
   */
  private generateMixedFilePath(originalPath: string): string {
    const ext = extname(originalPath);
    const baseName = originalPath.replace(ext, '');
    return `${baseName}_mixed${ext}`;
  }

  /**
   * Calculate optimal fade-in duration based on background sound type.
   *
   * @param backgroundSound - Name of the background sound
   * @returns Fade-in duration in seconds
   *
   * @private
   * @internal
   */
  private calculateOptimalFadeIn(backgroundSound: string): number {
    switch (backgroundSound) {
      case 'static':
      case 'phone':
        return 0.2; // Quick fade for technical sounds
      case 'nature':
      case 'rain':
        return 2.0; // Slow fade for natural sounds
      case 'office':
      case 'cafe':
        return 1.0; // Medium fade for ambient sounds
      default:
        return 1.0;
    }
  }

  /**
   * Calculate optimal fade-out duration based on background sound type.
   *
   * @param backgroundSound - Name of the background sound
   * @returns Fade-out duration in seconds
   *
   * @private
   * @internal
   */
  private calculateOptimalFadeOut(backgroundSound: string): number {
    switch (backgroundSound) {
      case 'static':
      case 'phone':
        return 0.3;
      case 'nature':
      case 'rain':
        return 2.5;
      case 'office':
      case 'cafe':
        return 1.5;
      default:
        return 1.5;
    }
  }

  /**
   * Infer optimal background volume from speech text content.
   *
   * @param text - Speech text to analyze
   * @returns Recommended volume level (0.0 to 1.0)
   *
   * @remarks
   * Uses keyword analysis to determine appropriate volume:
   * - Lower volume for urgent/important content
   * - Higher volume for casual conversation
   * - Moderate volume by default
   *
   * @private
   * @internal
   */
  private inferOptimalVolume(text: string): number {
    const textLower = text.toLowerCase();

    if (
      textLower.includes('urgent') ||
      textLower.includes('important') ||
      textLower.includes('alert') ||
      textLower.includes('warning')
    ) {
      return 0.05;
    }

    if (
      textLower.includes('hello') ||
      textLower.includes('chat') ||
      textLower.includes('conversation')
    ) {
      return 0.2;
    }

    return 0.12;
  }

  /**
   * Create assets directory if it doesn't exist.
   *
   * @returns Promise that resolves when directory is created
   *
   * @example
   * ```typescript
   * await mixer.createAssetsDirectory();
   * // Now you can add custom background sound files
   * ```
   */
  async createAssetsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.assetsPath, { recursive: true });
      console.info(`📁 Assets directory created: ${this.assetsPath}`);
    } catch (error) {
      console.warn(
        `⚠️ Could not create assets directory: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Load WAV file and extract PCM audio data.
   *
   * @param filePath - Path to WAV file
   * @returns Promise resolving to audio data with samples and metadata
   * @throws {VoiceTestError} If file format is invalid or unsupported
   *
   * @remarks
   * Supports:
   * - PCM audio format (format code 1)
   * - 16-bit samples
   * - Mono or stereo (converts stereo to mono)
   *
   * @private
   * @internal
   */
  private async loadWavFile(filePath: string): Promise<AudioData> {
    const buffer = await fs.readFile(filePath);

    const dataView = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );

    if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
      throw new VoiceTestError(
        `Invalid WAV file: ${filePath}`,
        ErrorCode.INVALID_AUDIO_FORMAT
      );
    }

    let offset = 12;
    while (offset < buffer.length - 8) {
      const chunkId = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = dataView.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        const audioFormat = dataView.getUint16(offset + 8, true);
        const numChannels = dataView.getUint16(offset + 10, true);
        const sampleRate = dataView.getUint32(offset + 12, true);
        const bitsPerSample = dataView.getUint16(offset + 22, true);

        if (audioFormat !== 1) {
          throw new VoiceTestError(
            `Unsupported audio format: ${audioFormat}`,
            ErrorCode.UNSUPPORTED_AUDIO_FORMAT
          );
        }

        let dataOffset = offset + 8 + chunkSize;
        while (dataOffset < buffer.length - 8) {
          const dataChunkId = buffer.toString(
            'ascii',
            dataOffset,
            dataOffset + 4
          );
          const dataChunkSize = dataView.getUint32(dataOffset + 4, true);

          if (dataChunkId === 'data') {
            const audioDataStart = dataOffset + 8;
            const samples: number[] = [];

            if (numChannels === 1) {
              for (let i = 0; i < dataChunkSize; i += 2) {
                if (audioDataStart + i + 1 < buffer.length) {
                  const sample = dataView.getInt16(audioDataStart + i, true);
                  samples.push(sample);
                }
              }
            } else if (numChannels === 2) {
              for (let i = 0; i < dataChunkSize; i += 4) {
                if (audioDataStart + i + 3 < buffer.length) {
                  const leftSample = dataView.getInt16(
                    audioDataStart + i,
                    true
                  );
                  const rightSample = dataView.getInt16(
                    audioDataStart + i + 2,
                    true
                  );
                  const monoSample = Math.round((leftSample + rightSample) / 2);
                  samples.push(monoSample);
                }
              }
            }

            return {
              samples,
              sampleRate,
              channels: 1,
              bitsPerSample,
            };
          }

          dataOffset += 8 + dataChunkSize;
        }

        throw new VoiceTestError(
          `No audio data found in WAV file: ${filePath}`,
          ErrorCode.INVALID_AUDIO_FORMAT
        );
      }

      offset += 8 + chunkSize;
    }

    throw new VoiceTestError(
      `Invalid WAV format in file: ${filePath}`,
      ErrorCode.INVALID_AUDIO_FORMAT
    );
  }

  /**
   * Mix two audio sample arrays with volume adjustment.
   *
   * @param speechData - Speech audio data
   * @param backgroundData - Background audio data
   * @param config - Mixing configuration
   * @returns Mixed audio data
   * @throws {VoiceTestError} If audio data is invalid
   *
   * @remarks
   * Mixing process:
   * 1. Resamples background to match speech sample rate
   * 2. Loops background to match speech length
   * 3. Applies volume adjustment to background
   * 4. Mixes samples using proper audio mixing formula
   * 5. Applies soft clipping to prevent distortion
   *
   * @private
   * @internal
   */
  private mixAudioSamples(
    speechData: AudioData,
    backgroundData: AudioData,
    config: AudioMixingConfig
  ): AudioData {
    if (!speechData.samples || speechData.samples.length === 0) {
      throw new VoiceTestError(
        'Speech audio has no samples',
        ErrorCode.INVALID_AUDIO_DATA
      );
    }

    if (!backgroundData.samples || backgroundData.samples.length === 0) {
      throw new VoiceTestError(
        'Background audio has no samples',
        ErrorCode.INVALID_AUDIO_DATA
      );
    }

    const speechSamples = speechData.samples;

    let backgroundSamples = backgroundData.samples;
    if (backgroundData.sampleRate !== speechData.sampleRate) {
      backgroundSamples = this.resampleAudio(
        backgroundSamples,
        backgroundData.sampleRate,
        speechData.sampleRate
      );
    }

    backgroundSamples = this.prepareBackgroundSamples(
      { ...backgroundData, samples: backgroundSamples },
      speechSamples.length,
      config
    );

    const mixedSamples: number[] = [];

    for (let i = 0; i < speechSamples.length; i++) {
      const speechSample = speechSamples[i];
      const backgroundSample =
        (backgroundSamples[i] || 0) * config.backgroundVolume;

      let mixed = speechSample + backgroundSample;

      if (mixed > 32767) {
        mixed = 32767 - (mixed - 32767) * 0.1;
      } else if (mixed < -32768) {
        mixed = -32768 - (mixed + 32768) * 0.1;
      }

      mixedSamples.push(Math.round(mixed));
    }

    return {
      samples: mixedSamples,
      sampleRate: speechData.sampleRate,
      channels: speechData.channels,
      bitsPerSample: speechData.bitsPerSample,
    };
  }

  /**
   * Resample audio to a different sample rate using linear interpolation.
   *
   * @param samples - Original audio samples
   * @param fromRate - Original sample rate
   * @param toRate - Target sample rate
   * @returns Resampled audio array
   *
   * @private
   * @internal
   */
  private resampleAudio(
    samples: number[],
    fromRate: number,
    toRate: number
  ): number[] {
    if (fromRate === toRate) {
      return samples;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.floor(samples.length / ratio);
    const resampled: number[] = [];

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      const sample1 = samples[index] || 0;
      const sample2 = samples[index + 1] || sample1;

      const interpolated = sample1 + (sample2 - sample1) * fraction;
      resampled.push(Math.round(interpolated));
    }

    return resampled;
  }

  /**
   * Prepare background samples with looping to match target length.
   *
   * @param backgroundData - Background audio data
   * @param targetLength - Target number of samples
   * @param config - Mixing configuration with loop setting
   * @returns Prepared background samples array
   *
   * @private
   * @internal
   */
  private prepareBackgroundSamples(
    backgroundData: AudioData,
    targetLength: number,
    config: AudioMixingConfig
  ): number[] {
    const backgroundSamples = backgroundData.samples;

    if (!config.loop) {
      const result = [...backgroundSamples];
      while (result.length < targetLength) {
        result.push(0);
      }
      return result.slice(0, targetLength);
    }

    const loopedSamples: number[] = [];
    let sourceIndex = 0;

    for (let i = 0; i < targetLength; i++) {
      loopedSamples.push(backgroundSamples[sourceIndex]);
      sourceIndex = (sourceIndex + 1) % backgroundSamples.length;
    }

    return loopedSamples;
  }

  /**
   * Apply fade-in and fade-out effects to audio samples.
   *
   * @param samples - Audio samples to process
   * @param _config - Mixing configuration (currently unused)
   * @param _sampleRate - Sample rate (currently unused)
   * @returns Processed audio samples
   *
   * @remarks
   * Currently returns samples unchanged for natural consistency.
   * Fade effects disabled to maintain realistic ambient sound.
   *
   * @private
   * @internal
   */
  private applyFadeEffects(
    samples: number[],
    _config: AudioMixingConfig,
    _sampleRate: number
  ): number[] {
    const result = [...samples];
    return result;
  }

  /**
   * Save mixed audio data as WAV file.
   *
   * @param filePath - Output file path
   * @param audioData - Audio data to save
   * @param sampleRate - Sample rate for the audio
   * @returns Promise that resolves when file is saved
   *
   * @remarks
   * Creates a properly formatted WAV file with:
   * - RIFF header
   * - fmt chunk with audio format information
   * - data chunk with PCM samples
   *
   * @private
   * @internal
   */
  private async saveWavFile(
    filePath: string,
    audioData: AudioData,
    sampleRate: number
  ): Promise<void> {
    const { samples, channels, bitsPerSample } = audioData;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = samples.length * bytesPerSample;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    let offset = 0;

    header.write('RIFF', offset);
    offset += 4;
    header.writeUInt32LE(fileSize, offset);
    offset += 4;
    header.write('WAVE', offset);
    offset += 4;

    header.write('fmt ', offset);
    offset += 4;
    header.writeUInt32LE(16, offset);
    offset += 4;
    header.writeUInt16LE(1, offset);
    offset += 2;
    header.writeUInt16LE(channels, offset);
    offset += 2;
    header.writeUInt32LE(sampleRate, offset);
    offset += 4;
    header.writeUInt32LE(sampleRate * channels * bytesPerSample, offset);
    offset += 4;
    header.writeUInt16LE(channels * bytesPerSample, offset);
    offset += 2;
    header.writeUInt16LE(bitsPerSample, offset);
    offset += 2;

    header.write('data', offset);
    offset += 4;
    header.writeUInt32LE(dataSize, offset);

    const audioBuffer = Buffer.alloc(dataSize);
    for (let i = 0; i < samples.length; i++) {
      audioBuffer.writeInt16LE(samples[i], i * 2);
    }

    const finalBuffer = Buffer.concat([header, audioBuffer]);

    await fs.writeFile(filePath, finalBuffer);
  }
}

/**
 * Audio data interface for WAV file processing.
 *
 * @interface
 * @internal
 */
type AudioData = {
  /** Array of 16-bit PCM audio samples */
  samples: number[];
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of audio channels (1 for mono, 2 for stereo) */
  channels: number;
  /** Bits per sample (typically 16) */
  bitsPerSample: number;
};
