# Type Definitions

## Core Types

### VoiceTestConfig

Main configuration object for voice bot tests.

```typescript
interface VoiceTestConfig {
  sttProvider: string;
  ttsProvider?: string;
  scenarios: TestScenario[];
  audioSettings?: AudioSettings;
  evaluationSettings?: EvaluationSettings;
  retryOptions?: RetryOptions;
}
```

### TestScenario

Individual test scenario definition.

```typescript
interface TestScenario {
  id?: string;
  prompt: string;
  expectedResponse: string;
  backgroundNoise?: BackgroundNoise;
  timeout?: number;
  metadata?: Record<string, any>;
}
```

### VoiceTestResult

Result of a voice bot test.

```typescript
interface VoiceTestResult {
  scenarios: ScenarioResult[];
  summary: TestSummary;
  startTime: Date;
  endTime: Date;
  duration: number;
}
```

### ScenarioResult

Result for an individual scenario.

```typescript
interface ScenarioResult {
  scenarioId: string;
  success: boolean;
  transcription: string;
  evaluation: EvaluationResult;
  audioFile?: string;
  error?: string;
  duration: number;
}
```

## STT Types

### STTHandler

Interface for STT provider implementations.

```typescript
interface STTHandler {
  transcribe(audio: Buffer, options?: STTOptions): Promise<string>;
  transcribeStream?(stream: Readable): Promise<string>;
  supports: {
    streaming?: boolean;
    languageCodes?: string[];
    encoding?: AudioEncoding[];
  };
}
```

### STTOptions

Options for STT operations.

```typescript
interface STTOptions {
  languageCode?: string;
  encoding?: AudioEncoding;
  sampleRate?: number;
  model?: string;
  enableAutomaticPunctuation?: boolean;
  enableWordTimeOffsets?: boolean;
}
```

### STTProviderConfig

Configuration for STT providers.

```typescript
interface STTProviderConfig {
  apiKey?: string;
  projectId?: string;
  credentialsPath?: string;
  endpoint?: string;
  timeout?: number;
  customOptions?: Record<string, any>;
}
```

## TTS Types

### TTSProviderConfig

Configuration for TTS providers.

```typescript
interface TTSProviderConfig {
  apiKey?: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
}
```

## Audio Types

### AudioSettings

Audio recording and playback settings.

```typescript
interface AudioSettings {
  sampleRate?: number;
  channels?: number;
  encoding?: AudioEncoding;
  bitDepth?: number;
  silenceThreshold?: number;
  silenceDuration?: number;
}
```

### AudioEncoding

Supported audio encoding formats.

```typescript
type AudioEncoding = 
  | 'LINEAR16'
  | 'FLAC'
  | 'MULAW'
  | 'AMR'
  | 'AMR_WB'
  | 'OGG_OPUS'
  | 'SPEEX_WITH_HEADER_BYTE'
  | 'MP3'
  | 'WEBM_OPUS';
```

### BackgroundNoise

Background noise configuration.

```typescript
interface BackgroundNoise {
  type: NoiseType;
  level?: number; // 0.0 to 1.0
  file?: string;
}

type NoiseType = 
  | 'none'
  | 'cafe'
  | 'office'
  | 'street'
  | 'phone'
  | 'custom';
```

### RecordingOptions

Options for audio recording.

```typescript
interface RecordingOptions {
  sampleRate: number;
  channels: number;
  encoding: AudioEncoding;
  device?: string;
  threshold?: number;
  silence?: number;
}
```

### MixerOptions

Options for audio mixing.

```typescript
interface MixerOptions {
  sourceAudio: Buffer;
  backgroundNoise: string | Buffer;
  noiseLevel: number;
  outputFormat?: AudioEncoding;
}
```

## Evaluation Types

### EvaluationSettings

Settings for AI evaluation.

```typescript
interface EvaluationSettings {
  model: string;
  temperature?: number;
  maxTokens?: number;
  criteria?: EvaluationCriteria[];
  threshold?: number;
}
```

### EvaluationResult

Result of AI evaluation.

```typescript
interface EvaluationResult {
  score: number;
  passed: boolean;
  details: EvaluationDetails;
  model: string;
  timestamp: Date;
}
```

### EvaluationDetails

Detailed evaluation information.

```typescript
interface EvaluationDetails {
  semanticSimilarity?: number;
  accuracy?: number;
  relevance?: number;
  completeness?: number;
  reasoning?: string;
  suggestions?: string[];
}
```

### EvaluationCriteria

Criteria for evaluation.

```typescript
interface EvaluationCriteria {
  name: string;
  weight: number;
  description?: string;
}
```

## Utility Types

### RetryOptions

Options for retry logic.

```typescript
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}
```

### ValidationResult

Result of configuration validation.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### ValidationError

Validation error details.

```typescript
interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

### Logger

Logger interface.

```typescript
interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

## CLI Types

### CLIOptions

Command-line interface options.

```typescript
interface CLIOptions {
  config?: string;
  verbose?: boolean;
  output?: string;
  dryRun?: boolean;
  watch?: boolean;
}
```

### TestSummary

Summary of test execution.

```typescript
interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
}
```

## Next Steps

- [Methods Reference](methods.md) - API methods documentation
- [Examples](../user-guide/examples.md) - Usage examples
- [Configuration](../getting-started/configuration.md) - Configuration guide
