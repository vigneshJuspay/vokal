# API Documentation

Complete API reference for the Voice Test Framework.

## Table of Contents

- [StreamingSTTService](#streamingsttservice)
- [VoiceInteractionService](#voiceinteractionservice)
- [VoiceTestService](#voicetestservice)
- [AIComparisonService](#aicomparisonservice)
- [AudioRecordingService](#audiorecordingservice)
- [AudioMixerService](#audiomixerservice)
- [VoiceBotTestService](#voicebottestservice)

---

## StreamingSTTService

Real-time speech-to-text transcription with voice activity detection.

### Constructor

```typescript
constructor(apiKey?: string)
```

**Parameters:**
- `apiKey` (optional): Google AI API key. If not provided, uses `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` from environment.

**Authentication Priority:**
1. `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON path)
2. Hardcoded service account path (if exists)
3. API key parameter or environment variable

### Methods

#### startStreaming()

Start a streaming speech recognition session.

```typescript
startStreaming(
  config: Partial<StreamingSTTConfig>,
  onResult: (result: StreamingSTTResult) => void,
  onSpeechStart?: () => void,
  onSpeechEnd?: () => void,
  onError?: (error: Error) => void
): StreamingSTTSession
```

**Parameters:**

- `config`: STT configuration
  ```typescript
  {
    languageCode: string;          // e.g., 'en-US'
    sampleRateHertz: number;       // e.g., 16000
    encoding: 'LINEAR16' | 'WEBM_OPUS' | 'MP3';
    speechStartTimeout?: number;   // seconds (default: 10)
    speechEndTimeout?: number;     // seconds (default: 4)
  }
  ```

- `onResult`: Callback for transcription results
  ```typescript
  (result: StreamingSTTResult) => void

  interface StreamingSTTResult {
    transcript: string;
    confidence: number;          // 0-1
    isFinal: boolean;           // true for final results
    stability?: number;         // 0-1 (interim results only)
    speechEventType?: 'SPEECH_EVENT_UNSPECIFIED'
                    | 'END_OF_SINGLE_UTTERANCE'
                    | 'SPEECH_ACTIVITY_BEGIN'
                    | 'SPEECH_ACTIVITY_END';
  }
  ```

- `onSpeechStart` (optional): Callback when speech detected
- `onSpeechEnd` (optional): Callback when speech ended
- `onError` (optional): Error handler

**Returns:**
```typescript
interface StreamingSTTSession {
  writeAudio: (audioChunk: Buffer) => void;
  endStream: () => void;
  isActive: () => boolean;
}
```

**Example:**
```typescript
const stt = new StreamingSTTService();

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16'
  },
  (result) => {
    if (result.isFinal) {
      console.log('Final:', result.transcript);
    } else {
      console.log('Interim:', result.transcript);
    }
  },
  () => console.log('🗣️ Speech started'),
  () => console.log('🛑 Speech ended')
);

// Write audio chunks
audioStream.on('data', (chunk) => session.writeAudio(chunk));

// End when done
session.endStream();
```

#### cleanup()

Clean up resources and reset state.

```typescript
cleanup(): void
```

---

## VoiceInteractionService

Complete voice conversation pipeline integrating TTS, recording, and STT.

### Constructor

```typescript
constructor(apiKey?: string)
```

### Methods

#### validateSystem()

Validate that all system components are working.

```typescript
async validateSystem(): Promise<SystemValidation>

interface SystemValidation {
  tts: boolean;
  audio: boolean;
  stt: boolean;
  errors: string[];
}
```

**Example:**
```typescript
const voice = new VoiceInteractionService();
const validation = await voice.validateSystem();

if (!validation.tts || !validation.audio || !validation.stt) {
  console.error('System issues:', validation.errors);
}
```

#### runVoiceInteraction()

Run a complete voice interaction: play question → listen → transcribe.

```typescript
async runVoiceInteraction(
  questionText: string,
  config?: Partial<VoiceInteractionConfig>
): Promise<VoiceInteractionResult>
```

**Parameters:**

- `questionText`: The question to ask (1-5000 characters)
- `config`: Interaction configuration
  ```typescript
  {
    language: string;                // default: 'en-US'
    voice: string;                   // default: 'en-US-Neural2-D'
    sampleRate: number;              // default: 16000
    maxRecordingDuration: number;    // ms, default: 500000
    silenceTimeout: number;          // ms, default: 3000
    confidenceThreshold: number;     // 0-1, default: 0.3
    backgroundSound?: string;        // 'office', 'cafe', etc.
    backgroundVolume?: number;       // 0-1
  }
  ```

**Returns:**
```typescript
interface VoiceInteractionResult {
  transcript: string;
  confidence: number;
  duration: number;              // total ms
  audioProcessed: number;        // bytes
  maxVolume: number;             // 0-1
  processingTime: number;        // ms
}
```

**Example:**
```typescript
const voice = new VoiceInteractionService();

const result = await voice.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    maxRecordingDuration: 10000,
    silenceTimeout: 2000,
    backgroundSound: 'office',
    backgroundVolume: 0.15
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
```

#### testVoicePipeline()

Test the complete voice pipeline with a simple question.

```typescript
async testVoicePipeline(): Promise<boolean>
```

#### cleanup()

Clean up all services and resources.

```typescript
cleanup(): void
```

---

## VoiceTestService

Text-to-speech generation with background audio mixing.

### Constructor

```typescript
constructor(config?: Partial<VoiceTestConfig>)

interface VoiceTestConfig {
  apiKey: string;
  defaultOutputDir?: string;
  defaultEncoding?: 'MP3' | 'WAV' | 'OGG_OPUS';
}
```

### Methods

#### generateSpeech()

Generate speech from text.

```typescript
async generateSpeech(input: VoiceTestInput): Promise<string>

interface VoiceTestInput {
  text: string;
  languageCode: string;
  voiceName: string;
  audioEncoding?: 'MP3' | 'WAV' | 'OGG_OPUS';
  speakingRate?: number;           // 0.25-4.0, default: 1.0
  pitch?: number;                  // -20.0 to 20.0, default: 0.0
  play?: boolean;                  // default: false
  output?: string;                 // file path
  backgroundSound?: string;
  backgroundVolume?: number;       // 0-1
}
```

**Returns:** Path to generated audio file

**Example:**
```typescript
const tts = new VoiceTestService();

const audioPath = await tts.generateSpeech({
  text: "Hello, world!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  audioEncoding: 'WAV',
  play: true,
  backgroundSound: 'office',
  backgroundVolume: 0.15
});

console.log('Audio saved to:', audioPath);
```

#### generateSpeechDetailed()

Generate speech with detailed response information.

```typescript
async generateSpeechDetailed(input: VoiceTestInput): Promise<VoiceTestResponse>

interface VoiceTestResponse {
  filePath: string;
  fileSize: number;
  generationTime: number;
  wasPlayed: boolean;
  mixedAudio: boolean;
  metadata: {
    originalAudioSize: number;
    encoding: string;
    backgroundSound?: string;
    neurolinkGenerationTime: number;
  };
}
```

#### getAvailableVoices()

Get available TTS voices.

```typescript
async getAvailableVoices(languageCode?: string): Promise<GoogleVoice[]>
```

#### getAvailableBackgroundSounds()

Get available background sound presets.

```typescript
getAvailableBackgroundSounds(): BackgroundSoundPreset[]

interface BackgroundSoundPreset {
  name: string;
  description: string;
  defaultVolume: number;
  file: string;
}
```

#### playAudio()

Play an audio file.

```typescript
async playAudio(filePath: string): Promise<void>
```

#### testAudioPlayback()

Test audio playback capability.

```typescript
async testAudioPlayback(): Promise<boolean>
```

---

## AIComparisonService

AI-powered semantic response evaluation.

### Static Factory

```typescript
static create(provider: 'google-ai'): AIComparisonService
```

### Methods

#### compareResponses()

Compare user response against expected answer using AI.

```typescript
async compareResponses(input: AIComparisonInput): Promise<AIComparisonResult>

interface AIComparisonInput {
  userResponse: string;
  originalQuestion: string;
  intent: string;
  expectedElements: string[];
  context?: string;
  sampleResponse?: string;
}

interface AIComparisonResult {
  isMatch: boolean;
  score: number;               // 0 or 1 (binary)
  confidence: number;          // 0-1
  analysis: string;
  strengths: string[];
  improvements: string[];
  rawResponse?: string;
}
```

**Example:**
```typescript
const ai = AIComparisonService.create('google-ai');

const result = await ai.compareResponses({
  userResponse: "My name is John",
  originalQuestion: "What is your name?",
  intent: "User should provide their name",
  expectedElements: [
    "A name or identifier",
    "Clear indication this is their name"
  ],
  context: "Name introduction question"
});

console.log('Match:', result.isMatch);
console.log('Score:', result.score);
console.log('Analysis:', result.analysis);
```

#### validate()

Validate the AI service is working.

```typescript
async validate(): Promise<boolean>
```

---

## AudioRecordingService

Cross-platform microphone audio capture.

### Methods

#### startRecording()

Start audio recording from microphone.

```typescript
async startRecording(config: AudioConfig): Promise<AudioRecordingSession>

interface AudioConfig {
  sampleRate: number;          // e.g., 16000
  channels: number;            // 1 (mono) or 2 (stereo)
  bitDepth: number;            // 16, 24, or 32
  encoding: 'LINEAR16';
}

interface AudioRecordingSession {
  audioStream: EventEmitter;   // Emits 'data' events with Buffer
  stop: () => void;
  getVolumeLevel: () => number;  // 0-1
}
```

**Example:**
```typescript
const recorder = new AudioRecordingService();

const session = await recorder.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'LINEAR16'
});

session.audioStream.on('data', (chunk: Buffer) => {
  console.log('Audio chunk:', chunk.length, 'bytes');
  console.log('Volume:', session.getVolumeLevel());
});

// Stop after 5 seconds
setTimeout(() => session.stop(), 5000);
```

#### stopRecording()

Stop current recording session.

```typescript
stopRecording(): void
```

#### checkAudioSupport()

Check which audio backends are available.

```typescript
async checkAudioSupport(): Promise<AudioSupport>

interface AudioSupport {
  supported: boolean;
  backend?: 'naudiodon' | 'node-record-lpcm16';
  missingTools: string[];
  recommendations: string;
}
```

---

## AudioMixerService

Mix background audio with speech.

### Methods

#### mixAudio()

Mix speech file with background audio.

```typescript
async mixAudio(
  speechPath: string,
  backgroundName: string,
  volume?: number
): Promise<string>
```

**Parameters:**
- `speechPath`: Path to speech audio file
- `backgroundName`: Name of background preset ('office', 'cafe', etc.)
- `volume`: Background volume 0-1 (default from preset)

**Returns:** Path to mixed audio file

#### getAvailablePresets()

Get available background sound presets.

```typescript
getAvailablePresets(): BackgroundSoundPreset[]
```

---

## VoiceBotTestService

Voice bot test orchestration and execution.

### Static Factory

```typescript
static create(configPath: string): VoiceBotTestService
```

### Methods

#### runTestSuite()

Run complete test suite from configuration.

```typescript
async runTestSuite(): Promise<TestSuiteResults>

interface TestSuiteResults {
  summary: {
    totalQuestions: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    averageScore: number;
    totalTime: number;
    overallResult: 'PASSED' | 'FAILED';
    resultsFile: string;
    conversationFile: string;
  };
  results: QuestionResult[];
}
```

#### runSingleQuestion()

Run a single question test.

```typescript
async runSingleQuestion(
  question: Question,
  retryCount?: number
): Promise<QuestionResult>
```

#### cleanup()

Clean up resources.

```typescript
cleanup(): void
```

---

## Type Definitions

### Common Types

```typescript
// Voice Test Error
class VoiceTestError extends Error {
  code: string;
  details?: unknown;
  constructor(message: string, code: string, originalError?: Error)
}

// Logger
interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// Background Sound Preset
interface BackgroundSoundPreset {
  name: string;
  description: string;
  defaultVolume: number;
  file: string;
}
```

---

## Error Handling

All services throw `VoiceTestError` with specific error codes:

```typescript
try {
  await voice.runVoiceInteraction("Test");
} catch (error) {
  if (error instanceof VoiceTestError) {
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
  }
}
```

### Common Error Codes

- `MISSING_API_KEY`: API key not provided
- `MISSING_CREDENTIALS`: Service account credentials not found
- `INVALID_INPUT`: Invalid input parameters
- `INVALID_CONFIG`: Invalid configuration
- `NO_SPEECH_TIMEOUT`: No speech detected within timeout
- `MAX_DURATION_REACHED`: Maximum recording duration exceeded
- `VOICE_INTERACTION_ERROR`: Voice interaction failed
- `GENERATION_FAILED`: TTS generation failed

---

## Best Practices

### 1. Resource Cleanup

Always call `cleanup()` when done:

```typescript
const voice = new VoiceInteractionService();
try {
  await voice.runVoiceInteraction("Test");
} finally {
  voice.cleanup();
}
```

### 2. Error Handling

Handle errors gracefully:

```typescript
try {
  const result = await voice.runVoiceInteraction(question);
} catch (error) {
  if (error instanceof VoiceTestError) {
    if (error.code === 'NO_SPEECH_TIMEOUT') {
      console.log('User did not respond');
    }
  }
}
```

### 3. Validation

Validate system before use:

```typescript
const voice = new VoiceInteractionService();
const validation = await voice.validateSystem();

if (!validation.tts || !validation.audio || !validation.stt) {
  throw new Error('System validation failed');
}
```

### 4. Configuration

Use environment variables for sensitive data:

```typescript
// .env file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_AI_API_KEY=your-api-key

// Code
const service = new VoiceTestService(); // Auto-loads from env
```

---

**Last Updated**: 2025-11-17
**Version**: 2.0.0
