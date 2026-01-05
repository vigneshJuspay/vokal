# Examples

Practical examples for common Vokal use cases.

## Basic Text-to-Speech

### Simple Speech Generation

```typescript
import { createVoiceTest } from '@juspay/vokal';

const voiceTest = createVoiceTest();

const audioPath = await voiceTest.generateSpeech({
  text: "Welcome to Vokal!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
});

console.log('Audio saved to:', audioPath);
```

### With Custom Voice Settings

```typescript
await voiceTest.generateSpeech({
  text: "This is faster and higher pitched",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  speakingRate: 1.5,
  pitch: 5.0,
  volumeGainDb: 2.0
});
```

### Multiple Languages

```typescript
// English
await voiceTest.generateSpeech({
  text: "Hello, how are you?",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
});

// Hindi
await voiceTest.generateSpeech({
  text: "नमस्ते, आप कैसे हैं?",
  languageCode: 'hi-IN',
  voiceName: 'hi-IN-Neural2-A'
});

// Spanish
await voiceTest.generateSpeech({
  text: "Hola, ¿cómo estás?",
  languageCode: 'es-ES',
  voiceName: 'es-ES-Neural2-A'
});
```

## Voice Interaction

### Basic Question-Answer

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const service = new VoiceInteractionService();

const result = await service.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D'
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

### With Background Audio

```typescript
const result = await service.runVoiceInteraction(
  "Can you hear me in this noisy environment?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-F',
    backgroundSound: 'cafe',
    backgroundVolume: 0.25
  }
);
```

### Custom Recording Duration

```typescript
const result = await service.runVoiceInteraction(
  "Please describe your issue in detail",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    maxRecordingDuration: 20000  // 20 seconds
  }
);
```

### With VAD Configuration

```typescript
const result = await service.runVoiceInteraction(
  "Tell me about yourself",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    vadSettings: {
      silenceThreshold: 0.02,
      silenceDuration: 3000,  // 3 seconds of silence
      speechTimeout: 15000     // 15 seconds max
    }
  }
);
```

## Automated Testing

### Simple Test Suite

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const config = {
  metadata: {
    name: "Basic Test",
    version: "1.0.0"
  },
  settings: {
    defaultLanguage: "en-US",
    defaultVoice: "en-US-Neural2-D",
    passingScore: 0.7
  },
  questions: [
    {
      id: "q1",
      question: "What is your name?",
      intent: "User provides name",
      expectedElements: ["Name"],
      sampleResponse: "My name is Alice"
    }
  ]
};

const service = VoiceBotTestService.create(config);
const results = await service.runTestSuite();

console.log('Results:', results);
```

### Testing with Retries

```typescript
const config = {
  settings: {
    defaultLanguage: "en-US",
    maxRetries: 3,
    passingScore: 0.75
  },
  questions: [
    {
      id: "greeting",
      question: "Hello! How can I help you today?",
      intent: "User greets and asks for help",
      expectedElements: ["Greeting", "Request"],
      sampleResponse: "Hi, I need help with my account"
    }
  ]
};

const service = VoiceBotTestService.create(config);
const results = await service.runTestSuite();

results.results.forEach(result => {
  console.log(`${result.id}: ${result.passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Score: ${result.score}`);
  console.log(`  Attempts: ${result.attempts}`);
});
```

### Multi-Scenario Testing

```typescript
const config = {
  settings: {
    defaultLanguage: "en-US",
    passingScore: 0.7
  },
  questions: [
    {
      id: "greeting",
      question: "Hello! Welcome to our service.",
      intent: "User responds to greeting",
      expectedElements: ["Greeting"],
      sampleResponse: "Hi there!"
    },
    {
      id: "account-info",
      question: "Can you provide your account number?",
      intent: "User provides account information",
      expectedElements: ["Account number", "Numbers"],
      sampleResponse: "My account number is 12345"
    },
    {
      id: "issue-description",
      question: "What issue are you experiencing?",
      intent: "User describes problem",
      expectedElements: ["Problem", "Issue"],
      sampleResponse: "I can't log into my account"
    }
  ]
};

const service = VoiceBotTestService.create(config);
const results = await service.runTestSuite();

console.log(`Pass Rate: ${results.summary.passRate}%`);
console.log(`Average Score: ${results.summary.averageScore}`);
```

## Background Audio

### Office Environment

```typescript
await voiceTest.generateSpeech({
  text: "Testing in office environment",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  backgroundSound: 'office',
  backgroundVolume: 0.15
});
```

### Phone Call Simulation

```typescript
const result = await service.runVoiceInteraction(
  "Can you hear me on the phone?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-F',
    backgroundSound: 'phone',
    backgroundVolume: 0.08
  }
);
```

### Custom Background Mixing

```typescript
import { AudioMixerService } from '@juspay/vokal';

const mixer = new AudioMixerService();

await mixer.mixAudioFiles(
  './speech.wav',
  './custom-background.wav',
  './output.wav',
  0.20
);
```

## AI Evaluation

### Evaluate Single Response

```typescript
import { AIComparisonService } from '@juspay/vokal';

const ai = AIComparisonService.create();

const evaluation = await ai.compareResponses({
  question: "What is your favorite color?",
  userResponse: "I really like blue",
  expectedIntent: "User states color preference",
  expectedElements: ["Color", "Preference"],
  sampleResponse: "My favorite color is red"
});

console.log('Score:', evaluation.score);
console.log('Intent Match:', evaluation.intentMatch);
console.log('Elements Found:', evaluation.elementsFound);
console.log('Reasoning:', evaluation.reasoning);
```

### Batch Evaluation

```typescript
const questions = [
  {
    question: "What is your name?",
    userResponse: "I'm John",
    expectedIntent: "User provides name",
    expectedElements: ["Name"],
    sampleResponse: "My name is Alice"
  },
  {
    question: "Where are you from?",
    userResponse: "I'm from New York",
    expectedIntent: "User states location",
    expectedElements: ["Location", "City"],
    sampleResponse: "I'm from London"
  }
];

for (const q of questions) {
  const evaluation = await ai.compareResponses(q);
  console.log(`Q: ${q.question}`);
  console.log(`Score: ${evaluation.score}`);
  console.log('---');
}
```

## CLI Examples

### Generate Speech

```bash
# Basic
vokal voice generate "Hello, world!" --voice en-US-Neural2-F

# With background
vokal voice generate "Test message" --bg office --bgvol 0.15 --play

# Custom settings
vokal voice generate "Fast speech" --rate 1.5 --pitch 5.0 --output custom.wav

# Different language
vokal voice generate "Bonjour" --lang fr-FR --voice fr-FR-Neural2-A
```

### List Available Resources

```bash
# All voices
vokal voices

# Filtered by language
vokal voices en-US
vokal voices hi-IN

# JSON format
vokal voices --format json

# Background sounds
vokal backgrounds
```

### Run Tests

```bash
# Basic test
vokal test ./config.json

# With debug output
vokal test ./config.json --debug --verbose

# Generate sample config
vokal test --save-sample

# Specify provider
vokal test ./config.json --provider google-ai
```

### Audio Utilities

```bash
# Test audio setup
vokal test-audio

# Play audio file
vokal play ./output.wav

# Show examples
vokal example
```

## IVR Testing

### Complete IVR Flow

```typescript
const ivrTest = {
  metadata: {
    name: "IVR Menu Test",
    version: "1.0.0"
  },
  settings: {
    defaultLanguage: "en-US",
    defaultVoice: "en-US-Neural2-D",
    passingScore: 0.8
  },
  questions: [
    {
      id: "main-menu",
      question: "Press 1 for account info, 2 for technical support",
      intent: "User selects menu option",
      expectedElements: ["Number", "Selection"],
      sampleResponse: "One",
      backgroundSound: "phone",
      backgroundVolume: 0.08
    },
    {
      id: "account-verification",
      question: "Please enter your account number",
      intent: "User provides account number",
      expectedElements: ["Account", "Numbers"],
      sampleResponse: "My account number is 12345",
      backgroundSound: "phone",
      backgroundVolume: 0.08
    }
  ]
};

const service = VoiceBotTestService.create(ivrTest);
const results = await service.runTestSuite();
```

## Error Handling

### With Try-Catch

```typescript
import { VoiceTestError } from '@juspay/vokal/errors';

try {
  await voiceTest.generateSpeech({
    text: "Test",
    languageCode: 'en-US',
    voiceName: 'en-US-Neural2-F'
  });
} catch (error) {
  if (error instanceof VoiceTestError) {
    console.error('TTS Error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### With Retry Logic

```typescript
import { retryAsync } from '@juspay/vokal/utils';

const result = await retryAsync(
  async () => {
    return await service.runVoiceInteraction("Question?", {
      language: 'en-US',
      voice: 'en-US-Neural2-D'
    });
  },
  {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  }
);
```

## Advanced Usage

### Custom STT Provider

```typescript
import { STTHandlerManager } from '@juspay/vokal/providers';

class CustomSTTHandler {
  async startStreaming(config, onResult, onSpeechStart, onSpeechEnd, onError) {
    // Custom implementation
  }
  
  async stopStreaming() {
    // Cleanup
  }
}

// Register provider
STTHandlerManager.registerHandler('custom', CustomSTTHandler);

// Use it
const result = await service.runVoiceInteraction("Question?", {
  language: 'en-US',
  sttProvider: 'custom'
});
```

### Streaming Recording

```typescript
import { AudioRecordingService } from '@juspay/vokal';

const recorder = AudioRecordingService.create({
  sampleRate: 16000,
  vadSettings: {
    silenceThreshold: 0.02,
    silenceDuration: 2000
  }
});

recorder.on('speechStart', () => {
  console.log('User started speaking');
});

recorder.on('speechEnd', () => {
  console.log('User stopped speaking');
});

const audioPath = await recorder.recordAudio(10000);
```

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import { VoiceInteractionService } from '@juspay/vokal';

const app = express();
const voiceService = new VoiceInteractionService();

app.post('/api/voice-interaction', async (req, res) => {
  try {
    const { question } = req.body;
    
    const result = await voiceService.runVoiceInteraction(question, {
      language: 'en-US',
      voice: 'en-US-Neural2-D'
    });
    
    res.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Webhook Handler

```typescript
async function handleWebhook(data) {
  const { text, language, voice } = data;
  
  const audioPath = await voiceTest.generateSpeech({
    text,
    languageCode: language,
    voiceName: voice,
    backgroundSound: 'office',
    backgroundVolume: 0.15
  });
  
  return { audioUrl: audioPath };
}
```

## Next Steps

- [API Reference](../api/overview.md) - Complete API documentation
- [Architecture](../development/architecture.md) - System design
- [Contributing](../development/contributing.md) - Contribute to Vokal
