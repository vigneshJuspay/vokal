# API Methods

## Voice Test Service

### `runVoiceTest(config: VoiceTestConfig): Promise<VoiceTestResult>`

Run a complete voice bot test with the specified configuration.

**Parameters:**

- `config` (VoiceTestConfig): Test configuration object

**Returns:** Promise<VoiceTestResult> - Test results including transcriptions and evaluations

**Example:**

```typescript
import { runVoiceTest } from '@juspay/vokal';

const result = await runVoiceTest({
  sttProvider: 'google-ai',
  scenarios: [
    {
      prompt: 'Hello, how can I help you?',
      expectedResponse: 'I need assistance'
    }
  ]
});
```

## STT Handler Manager

### `registerSTTHandler(name: string, handler: STTHandler): void`

Register a custom STT handler.

**Parameters:**

- `name` (string): Unique identifier for the handler
- `handler` (STTHandler): Handler implementation

**Example:**

```typescript
import { registerSTTHandler } from '@juspay/vokal';

registerSTTHandler('my-custom-stt', {
  async transcribe(audioBuffer) {
    // Custom implementation
    return 'transcribed text';
  }
});
```

### `getSTTHandler(name: string): STTHandler | undefined`

Retrieve a registered STT handler.

**Parameters:**

- `name` (string): Handler identifier

**Returns:** STTHandler | undefined

## Audio Recording

### `startRecording(options: RecordingOptions): Recorder`

Start audio recording.

**Parameters:**

- `options` (RecordingOptions): Recording configuration

**Returns:** Recorder instance

**Example:**

```typescript
import { startRecording } from '@juspay/vokal';

const recorder = startRecording({
  sampleRate: 16000,
  channels: 1,
  encoding: 'LINEAR16'
});
```

### `stopRecording(recorder: Recorder): Promise<Buffer>`

Stop recording and get audio buffer.

**Parameters:**

- `recorder` (Recorder): Active recorder instance

**Returns:** Promise<Buffer> - Audio data

## Audio Mixer

### `mixAudio(options: MixerOptions): Promise<Buffer>`

Mix audio with background noise.

**Parameters:**

- `options` (MixerOptions): Mixing configuration including source audio and background noise

**Returns:** Promise<Buffer> - Mixed audio

**Example:**

```typescript
import { mixAudio } from '@juspay/vokal';

const mixed = await mixAudio({
  sourceAudio: audioBuffer,
  backgroundNoise: 'cafe-ambience.wav',
  noiseLevel: 0.3
});
```

## Voice Interaction

### `playAndRecord(options: InteractionOptions): Promise<InteractionResult>`

Play audio and record the response.

**Parameters:**

- `options` (InteractionOptions): Interaction configuration

**Returns:** Promise<InteractionResult> - Recorded response

**Example:**

```typescript
import { playAndRecord } from '@juspay/vokal';

const result = await playAndRecord({
  audioToPlay: promptAudio,
  recordDuration: 5000
});
```

## AI Comparison

### `compareResponses(options: ComparisonOptions): Promise<ComparisonResult>`

Compare bot responses using AI evaluation.

**Parameters:**

- `options` (ComparisonOptions): Comparison configuration including expected and actual responses

**Returns:** Promise<ComparisonResult> - Evaluation results with scores

**Example:**

```typescript
import { compareResponses } from '@juspay/vokal';

const result = await compareResponses({
  expected: 'Your order will arrive tomorrow',
  actual: 'Your package is scheduled for delivery tomorrow',
  model: 'gpt-4'
});
```

## Utility Functions

### `validateConfig(config: VoiceTestConfig): ValidationResult`

Validate voice test configuration.

**Parameters:**

- `config` (VoiceTestConfig): Configuration to validate

**Returns:** ValidationResult - Validation status and errors

### `retryWithBackoff(fn: Function, options: RetryOptions): Promise<any>`

Execute a function with retry logic and exponential backoff.

**Parameters:**

- `fn` (Function): Function to execute
- `options` (RetryOptions): Retry configuration

**Returns:** Promise<any> - Function result

**Example:**

```typescript
import { retryWithBackoff } from '@juspay/vokal';

const result = await retryWithBackoff(
  () => sttProvider.transcribe(audio),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000
  }
);
```

## CLI Commands

### `vokal test`

Run voice bot tests from the command line.

**Options:**

- `-c, --config <path>` - Path to configuration file
- `-v, --verbose` - Enable verbose logging
- `-o, --output <path>` - Output file for results

**Example:**

```bash
vokal test -c vokal-config.json -v -o results.json
```

### `vokal validate`

Validate configuration file.

**Options:**

- `-c, --config <path>` - Path to configuration file

**Example:**

```bash
vokal validate -c vokal-config.json
```

## Next Steps

- [Type Definitions](types.md) - Complete type reference
- [Examples](../user-guide/examples.md) - Usage examples
