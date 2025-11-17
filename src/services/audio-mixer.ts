/**
 * Lightweight Audio Mixer for TTS
 * Pure JavaScript implementation for mixing speech with background sounds
 */

import { promises as fs } from 'fs';
import { join, dirname, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  AudioMixer,
  BackgroundSoundPreset,
  AudioMixingConfig,
  VoiceTestError,
  getErrorMessage,
  toError,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find project root - go up from dist/src/services to project root
const projectRoot = resolve(__dirname, '../../../');

export class AudioMixerService implements AudioMixer {
  private presets: BackgroundSoundPreset[] = [];
  private assetsPath: string;

  constructor() {
    this.assetsPath = join(projectRoot, 'assets');
    this.initializePresets();
  }

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

  async mixAudio(
    speechPath: string,
    backgroundSound: string,
    backgroundVolume?: number
  ): Promise<string> {
    try {
      console.info(`🎵 Mixing audio: ${backgroundSound}`);

      // Check if speech file exists
      if (!(await this.fileExists(speechPath))) {
        throw new VoiceTestError(`Speech file not found: ${speechPath}`, 'FILE_NOT_FOUND');
      }

      // Try to resolve background sound path
      let backgroundPath: string;
      try {
        backgroundPath = await this.resolveBackgroundPath(backgroundSound);

        // Check if background file actually exists
        if (!(await this.fileExists(backgroundPath))) {
          console.warn(`⚠️ Background sound file not found: ${backgroundPath}`);
          console.info(`📁 To add background sounds, place audio files in: ${this.assetsPath}`);
          console.info(`🔄 Continuing with original speech audio only`);
          return speechPath;
        }
      } catch {
        console.warn(`⚠️ Background sound not available: ${backgroundSound}`);
        console.info(`💡 Available presets: ${this.presets.map((p) => p.name).join(', ')}`);
        console.info(`🔄 Continuing with original speech audio only`);
        return speechPath;
      }

      // Get optimal mixing configuration
      const mixConfig = this.getOptimalMixingConfig('', backgroundSound, backgroundVolume);

      // Implement actual audio mixing with PCM samples
      console.info(
        `🎚️ Mixing with ${backgroundSound} at ${Math.round(mixConfig.backgroundVolume * 100)}% volume`
      );

      // Load both audio files as PCM data
      const speechData = await this.loadWavFile(speechPath);
      const backgroundData = await this.loadWavFile(backgroundPath);

      // Mix the audio samples
      const mixedData = this.mixAudioSamples(speechData, backgroundData, mixConfig);

      // Save the mixed result back to the original file location (override)
      await this.saveWavFile(speechPath, mixedData, speechData.sampleRate);

      console.info(`✨ Audio mixed successfully: ${speechPath}`);
      console.info(
        `🎚️ Background: ${backgroundSound} (${Math.round(mixConfig.backgroundVolume * 100)}% volume)`
      );
      console.info(`🎵 Natural mixing: Consistent background throughout`);

      return speechPath;
    } catch (error) {
      if (error instanceof VoiceTestError) {
        throw error;
      }

      throw new VoiceTestError(
        `Audio mixing failed: ${getErrorMessage(error)}`,
        'MIXING_FAILED',
        toError(error)
      );
    }
  }

  getAvailablePresets(): BackgroundSoundPreset[] {
    return [...this.presets];
  }

  getOptimalMixingConfig(
    text: string,
    backgroundSound: string,
    backgroundVolume?: number
  ): AudioMixingConfig {
    // AI-driven optimal mixing parameters based on content and background type
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

  private async resolveBackgroundPath(backgroundSound: string): Promise<string> {
    // Check if it's a preset name
    const preset = this.presets.find((p) => p.name === backgroundSound);
    if (preset) {
      return preset.filePath;
    }

    // Check if it's a file path
    if (await this.fileExists(backgroundSound)) {
      return backgroundSound;
    }

    throw new VoiceTestError(
      `Background sound not found: ${backgroundSound}. Available presets: ${this.presets.map((p) => p.name).join(', ')}`,
      'BACKGROUND_NOT_FOUND'
    );
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateMixedFilePath(originalPath: string): string {
    const ext = extname(originalPath);
    const baseName = originalPath.replace(ext, '');
    return `${baseName}_mixed${ext}`;
  }

  private calculateOptimalFadeIn(backgroundSound: string): number {
    // AI logic: Different backgrounds need different fade-in timing
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

  private calculateOptimalFadeOut(backgroundSound: string): number {
    // AI logic: Similar to fade-in but slightly longer for natural endings
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

  private inferOptimalVolume(text: string): number {
    // AI logic: Analyze text content to determine appropriate background volume
    const textLower = text.toLowerCase();

    // If text suggests urgency or importance, lower background volume
    if (
      textLower.includes('urgent') ||
      textLower.includes('important') ||
      textLower.includes('alert') ||
      textLower.includes('warning')
    ) {
      return 0.05;
    }

    // If text is casual conversation, higher background volume is acceptable
    if (
      textLower.includes('hello') ||
      textLower.includes('chat') ||
      textLower.includes('conversation')
    ) {
      return 0.2;
    }

    // Default moderate volume
    return 0.12;
  }

  async createAssetsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.assetsPath, { recursive: true });
      console.info(`📁 Assets directory created: ${this.assetsPath}`);
    } catch (error) {
      console.warn(`⚠️ Could not create assets directory: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Load WAV file and extract PCM audio data
   */
  private async loadWavFile(filePath: string): Promise<AudioData> {
    const buffer = await fs.readFile(filePath);

    // Basic WAV header parsing
    const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Check for RIFF header
    if (buffer.toString('ascii', 0, 4) !== 'RIFF') {
      throw new VoiceTestError(`Invalid WAV file: ${filePath}`, 'INVALID_AUDIO_FORMAT');
    }

    // Find the 'fmt ' chunk
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
            'UNSUPPORTED_AUDIO_FORMAT'
          );
        }

        // Find the data chunk
        let dataOffset = offset + 8 + chunkSize;
        while (dataOffset < buffer.length - 8) {
          const dataChunkId = buffer.toString('ascii', dataOffset, dataOffset + 4);
          const dataChunkSize = dataView.getUint32(dataOffset + 4, true);

          if (dataChunkId === 'data') {
            const audioDataStart = dataOffset + 8;
            const samples: number[] = [];

            // Extract 16-bit PCM samples and convert stereo to mono if needed
            if (numChannels === 1) {
              // Mono - direct extraction
              for (let i = 0; i < dataChunkSize; i += 2) {
                if (audioDataStart + i + 1 < buffer.length) {
                  const sample = dataView.getInt16(audioDataStart + i, true);
                  samples.push(sample);
                }
              }
            } else if (numChannels === 2) {
              // Stereo - convert to mono by averaging channels
              for (let i = 0; i < dataChunkSize; i += 4) {
                if (audioDataStart + i + 3 < buffer.length) {
                  const leftSample = dataView.getInt16(audioDataStart + i, true);
                  const rightSample = dataView.getInt16(audioDataStart + i + 2, true);
                  const monoSample = Math.round((leftSample + rightSample) / 2);
                  samples.push(monoSample);
                }
              }
            }

            return {
              samples,
              sampleRate,
              channels: 1, // Output as mono
              bitsPerSample,
            };
          }

          dataOffset += 8 + dataChunkSize;
        }

        throw new VoiceTestError(
          `No audio data found in WAV file: ${filePath}`,
          'INVALID_AUDIO_FORMAT'
        );
      }

      offset += 8 + chunkSize;
    }

    throw new VoiceTestError(`Invalid WAV format in file: ${filePath}`, 'INVALID_AUDIO_FORMAT');
  }

  /**
   * Mix two audio samples
   */
  private mixAudioSamples(
    speechData: AudioData,
    backgroundData: AudioData,
    config: AudioMixingConfig
  ): AudioData {
    // Defensive checks
    if (!speechData.samples || speechData.samples.length === 0) {
      throw new VoiceTestError('Speech audio has no samples', 'INVALID_AUDIO_DATA');
    }

    if (!backgroundData.samples || backgroundData.samples.length === 0) {
      throw new VoiceTestError('Background audio has no samples', 'INVALID_AUDIO_DATA');
    }

    const speechSamples = speechData.samples;

    // Convert background to match TTS sample rate
    let backgroundSamples = backgroundData.samples;
    if (backgroundData.sampleRate !== speechData.sampleRate) {
      backgroundSamples = this.resampleAudio(
        backgroundSamples,
        backgroundData.sampleRate,
        speechData.sampleRate
      );
    }

    // Prepare background samples with looping
    backgroundSamples = this.prepareBackgroundSamples(
      { ...backgroundData, samples: backgroundSamples },
      speechSamples.length,
      config
    );

    // Mix the samples
    const mixedSamples: number[] = [];

    for (let i = 0; i < speechSamples.length; i++) {
      const speechSample = speechSamples[i];
      const backgroundSample = (backgroundSamples[i] || 0) * config.backgroundVolume;

      // Mix with proper audio mixing formula
      let mixed = speechSample + backgroundSample;

      // Apply soft clipping to prevent distortion
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
   * Simple linear resampling
   */
  private resampleAudio(samples: number[], fromRate: number, toRate: number): number[] {
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

      // Linear interpolation
      const interpolated = sample1 + (sample2 - sample1) * fraction;
      resampled.push(Math.round(interpolated));
    }

    return resampled;
  }

  /**
   * Prepare background samples with looping and length matching
   */
  private prepareBackgroundSamples(
    backgroundData: AudioData,
    targetLength: number,
    config: AudioMixingConfig
  ): number[] {
    const backgroundSamples = backgroundData.samples;

    if (!config.loop) {
      // No looping - pad with silence if needed
      const result = [...backgroundSamples];
      while (result.length < targetLength) {
        result.push(0);
      }
      return result.slice(0, targetLength);
    }

    // Loop the background audio to match speech length
    const loopedSamples: number[] = [];
    let sourceIndex = 0;

    for (let i = 0; i < targetLength; i++) {
      loopedSamples.push(backgroundSamples[sourceIndex]);
      sourceIndex = (sourceIndex + 1) % backgroundSamples.length;
    }

    return loopedSamples;
  }

  /**
   * Apply fade effects to background audio (currently no fades for natural consistency)
   */
  private applyFadeEffects(
    samples: number[],
    _config: AudioMixingConfig,
    _sampleRate: number
  ): number[] {
    const result = [...samples];

    // No fade-in: Background sounds should be present from the start, like in real life
    // No fade-out: Background sounds should continue consistently throughout
    // This creates more natural and realistic audio mixing

    return result;
  }

  /**
   * Determine if background sound should fade out naturally
   */
  private shouldApplyFadeOut(_config: AudioMixingConfig): boolean {
    // Only apply fade out for technical/artificial sounds that should end cleanly
    // Ambient environments should continue naturally without fade out
    return false; // For now, disable fade out for all backgrounds for consistency
  }

  /**
   * Save mixed audio data as WAV file
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

    // Create WAV header
    const header = Buffer.alloc(44);
    let offset = 0;

    // RIFF header
    header.write('RIFF', offset);
    offset += 4;
    header.writeUInt32LE(fileSize, offset);
    offset += 4;
    header.write('WAVE', offset);
    offset += 4;

    // fmt chunk
    header.write('fmt ', offset);
    offset += 4;
    header.writeUInt32LE(16, offset);
    offset += 4; // chunk size
    header.writeUInt16LE(1, offset);
    offset += 2; // audio format (PCM)
    header.writeUInt16LE(channels, offset);
    offset += 2;
    header.writeUInt32LE(sampleRate, offset);
    offset += 4;
    header.writeUInt32LE(sampleRate * channels * bytesPerSample, offset);
    offset += 4; // byte rate
    header.writeUInt16LE(channels * bytesPerSample, offset);
    offset += 2; // block align
    header.writeUInt16LE(bitsPerSample, offset);
    offset += 2;

    // data chunk
    header.write('data', offset);
    offset += 4;
    header.writeUInt32LE(dataSize, offset);

    // Create audio data buffer
    const audioBuffer = Buffer.alloc(dataSize);
    for (let i = 0; i < samples.length; i++) {
      audioBuffer.writeInt16LE(samples[i], i * 2);
    }

    // Combine header and data
    const finalBuffer = Buffer.concat([header, audioBuffer]);

    await fs.writeFile(filePath, finalBuffer);
  }
}

// Audio data interface
interface AudioData {
  samples: number[];
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}
