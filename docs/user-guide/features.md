# Features

Comprehensive overview of all Vokal features and capabilities.

## Text-to-Speech (TTS)

High-quality neural speech synthesis powered by Google Cloud via Neurolink SDK.

### Capabilities

- **50+ Neural Voices** across multiple languages
- **Voice Customization** - Adjust rate, pitch, and volume
- **Multiple Formats** - MP3, WAV, OGG output
- **Background Audio Mixing** - Add realistic environmental sounds
- **Streaming Support** - Real-time audio generation

### Basic Usage

```typescript
import { createVoiceTest } from '@juspay/vokal';

const voiceTest = createVoiceTest();

await voiceTest.generateSpeech({
  text: "Hello, world!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  speakingRate: 1.0,
  pitch: 0.0
});
```

### CLI Usage

```bash
# Basic generation
vokal voice generate "Hello" --voice en-US-Neural2-F

# With customization
vokal voice generate "Fast speech" --rate 1.5 --pitch 5.0

# Play immediately
vokal voice generate "Test" --play
```

### Voice Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | required | Text to synthesize |
| `languageCode` | string | `en-US` | BCP-47 language code |
| `voiceName` | string | `en-US-Neural2-D` | Voice identifier |
| `speakingRate` | number | `1.0` | Speed (0.25-4.0) |
| `pitch` | number | `0.0` | Pitch (-20.0 to 20.0) |
| `volumeGainDb` | number | `0.0` | Volume gain |

## Speech-to-Text (STT)

Real-time streaming transcription with voice activity detection.

### Capabilities

- **Streaming Transcription** - Real-time audio processing
- **Voice Activity Detection** - Automatic speech start/end
- **Confidence Scores** - Transcription accuracy metrics
- **Multi-language** - Support for 100+ languages
- **Provider Agnostic** - Extensible handler architecture

### Basic Usage

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const service = new VoiceInteractionService();

const result = await service.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    maxRecordingDuration: 10000
  }
);

console.log('Transcript:', result.transcript);
console.log('Confidence:', result.confidence);
```

### VAD Configuration

```typescript
const config = {
  vadSettings: {
    silenceThreshold: 0.02,    // Audio level for silence
    silenceDuration: 2000,      // Stop after 2s silence
    speechTimeout: 10000        // Max wait for speech
  }
};
```

### STT Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | string | `en-US` | Recognition language |
| `maxRecordingDuration` | number | `10000` | Max recording time (ms) |
| `sampleRate` | number | `16000` | Audio sample rate |
| `vadSettings` | object | - | Voice detection config |

## Voice Interaction Pipeline

Complete TTS → Listen → STT conversation flow.

### Features

- **End-to-End Flow** - Automated question-answer cycle
- **Background Audio** - Realistic environment simulation
- **Automatic Recording** - VAD-based capture
- **Detailed Metrics** - Timing and confidence data

### Full Example

```typescript
const result = await voiceBot.runVoiceInteraction(
  "Please provide your account number",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    backgroundSound: 'phone',
    backgroundVolume: 0.08,
    maxRecordingDuration: 15000,
    vadSettings: {
      silenceThreshold: 0.02,
      silenceDuration: 2500
    }
  }
);

// Result contains:
// - transcript: recognized text
// - confidence: accuracy score
// - duration: interaction time
// - audioPath: recorded audio file
```

## Background Audio Mixing

Add realistic environmental sounds to test scenarios.

### Available Presets

| Preset | Description | Files | Recommended Volume |
|--------|-------------|-------|-------------------|
| `office` | Office ambience | office-ambience.wav | 0.15 |
| `cafe` | Coffee shop | cafe-ambience.wav | 0.20 |
| `nature` | Outdoor sounds | nature-sounds.wav | 0.18 |
| `rain` | Light rainfall | rain-light.wav | 0.12 |
| `phone` | Phone static | phone-static.wav | 0.08 |
| `crowd` | Crowd noise | crowd-distant.wav | 0.10 |

### Usage

```typescript
await voiceTest.generateSpeech({
  text: "Testing in noisy environment",
  languageCode: 'en-US',
  backgroundSound: 'cafe',
  backgroundVolume: 0.25
});
```

```bash
vokal voice generate "Test" --bg office --bgvol 0.15
```

### Custom Background Audio

```typescript
import { AudioMixerService } from '@juspay/vokal';

const mixer = new AudioMixerService();

await mixer.mixAudioFiles(
  './speech.wav',
  './custom-background.wav',
  './output.wav',
  0.20  // background volume
);
```

## Automated Test Suites

Run comprehensive voice bot tests with AI evaluation.

### Features

- **JSON Configuration** - Easy test definition
- **Multiple Scenarios** - Test many questions
- **AI Evaluation** - Semantic answer validation
- **Retry Logic** - Automatic retry on failure
- **Detailed Reporting** - JSON and console output

### Test Configuration

```json
{
  "metadata": {
    "name": "Customer Service Bot Test",
    "version": "1.0.0"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "passingScore": 0.75,
    "maxRetries": 2
  },
  "questions": [
    {
      "id": "greeting",
      "question": "Hello! How can I help you?",
      "intent": "User greets and states purpose",
      "expectedElements": ["Greeting", "Request"],
      "sampleResponse": "Hi, I need help with billing"
    }
  ]
}
```

### Running Tests

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const service = VoiceBotTestService.create('./config.json');
const results = await service.runTestSuite();

console.log('Pass Rate:', results.summary.passRate);
console.log('Tests Run:', results.summary.totalTests);
console.log('Passed:', results.summary.passedTests);
```

```bash
vokal test ./config.json --verbose
```

### Test Results

Results include:

```typescript
{
  summary: {
    totalTests: 10,
    passedTests: 8,
    failedTests: 2,
    passRate: 80,
    averageScore: 0.85,
    resultsFile: 'vokal-results-timestamp.json'
  },
  results: [
    {
      id: 'greeting',
      passed: true,
      score: 0.92,
      transcript: 'Hi, I need help',
      confidence: 0.95,
      aiEvaluation: {...}
    }
  ]
}
```

## AI-Powered Evaluation

Semantic response validation using Google Gemini.

### Features

- **Intent Matching** - Validates user intent
- **Element Detection** - Checks for expected elements
- **Semantic Scoring** - AI-based relevance scoring
- **Detailed Feedback** - Explanation of scores

### Evaluation Process

```typescript
import { AIComparisonService } from '@juspay/vokal';

const ai = AIComparisonService.create();

const evaluation = await ai.compareResponses({
  question: "What is your name?",
  userResponse: "I'm John Smith",
  expectedIntent: "User provides their name",
  expectedElements: ["Name", "Personal info"],
  sampleResponse: "My name is Alice"
});

console.log('Score:', evaluation.score);
console.log('Intent Match:', evaluation.intentMatch);
console.log('Elements Found:', evaluation.elementsFound);
```

### Evaluation Output

```typescript
{
  score: 0.85,
  intentMatch: true,
  elementsFound: ["Name", "Personal info"],
  reasoning: "User correctly provided name...",
  confidence: 0.92
}
```

## Audio Recording

Capture microphone input with voice activity detection.

### Features

- **Low-latency Recording** - Real-time capture
- **VAD Integration** - Automatic start/stop
- **Format Support** - WAV, PCM output
- **Cross-platform** - Works on Windows, macOS, Linux

### Usage

```typescript
import { AudioRecordingService } from '@juspay/vokal';

const recorder = AudioRecordingService.create({
  sampleRate: 16000,
  channels: 1,
  vadSettings: {
    silenceThreshold: 0.02,
    silenceDuration: 2000
  }
});

const audioPath = await recorder.recordAudio(10000); // 10 seconds max
console.log('Recorded:', audioPath);
```

## CLI Features

### Voice Commands

```bash
# Generate speech
vokal voice generate "text" [options]

# Options:
  --voice, -v     Voice name
  --lang, -l      Language code
  --rate, -r      Speaking rate (0.25-4.0)
  --pitch, -p     Pitch (-20.0 to 20.0)
  --bg            Background sound preset
  --bgvol         Background volume (0.0-1.0)
  --output, -o    Output file path
  --play          Play after generation
```

### Utility Commands

```bash
# List all voices
vokal voices

# Filter by language
vokal voices en-US

# List background sounds
vokal backgrounds

# Test audio playback
vokal test-audio

# Play audio file
vokal play ./file.wav

# Show examples
vokal example
```

### Test Commands

```bash
# Run test suite
vokal test ./config.json

# Options:
  --provider      STT provider (default: google-ai)
  --debug         Enable debug logging
  --verbose       Verbose output
  --save-sample   Generate sample config
```

## Security Features

- **Input Validation** - All inputs sanitized
- **Secure Credential Handling** - Environment-based auth
- **Command Injection Prevention** - Safe command execution
- **Path Traversal Protection** - Secure file operations

### Validation

```typescript
import { validateLanguageCode, validateVoiceName } from '@juspay/vokal/utils';

// Validates BCP-47 format
validateLanguageCode('en-US');  // ✓
validateLanguageCode('invalid'); // ✗

// Validates voice format
validateVoiceName('en-US-Neural2-F');  // ✓
validateVoiceName('../malicious');      // ✗
```

## Error Handling

Comprehensive error types:

```typescript
import {
  VoiceTestError,
  AudioMixerError,
  RecordingError,
  STTError
} from '@juspay/vokal/errors';

try {
  await voiceTest.generateSpeech({...});
} catch (error) {
  if (error instanceof VoiceTestError) {
    console.error('TTS failed:', error.message);
  }
}
```

## Performance Features

- **Retry Logic** - Exponential backoff on failures
- **Streaming** - Real-time audio processing
- **Async/Await** - Non-blocking operations
- **Resource Cleanup** - Automatic cleanup on exit

## Next Steps

- [Examples](examples.md) - Practical code examples
- [API Reference](../api/overview.md) - Complete API docs
- [Architecture](../development/architecture.md) - System design
