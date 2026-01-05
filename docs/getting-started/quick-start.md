# Quick Start

Get up and running with Vokal in minutes! This guide covers the most common use cases.

## Basic Text-to-Speech

Generate speech from text:

```typescript
import { createVoiceTest } from '@juspay/vokal';

const voiceTest = createVoiceTest();

// Generate and save speech
const audioPath = await voiceTest.generateSpeech({
  text: "Welcome to Vokal! Your voice testing framework.",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
});

console.log('Audio saved to:', audioPath);
```

### CLI Version

```bash
vokal voice generate "Hello, world!" --voice en-US-Neural2-F --lang en-US
```

## Voice Interaction

Run a complete voice interaction with TTS → Listen → STT:

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const voiceBot = new VoiceInteractionService();

const result = await voiceBot.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    maxRecordingDuration: 10000
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

## Add Background Audio

Make your tests more realistic with background sounds:

```typescript
const result = await voiceBot.runVoiceInteraction(
  "What is your account number?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    backgroundSound: 'office',      // Options: office, cafe, nature, rain, phone, crowd
    backgroundVolume: 0.15          // 0.0 to 1.0
  }
);
```

### CLI Version

```bash
vokal voice generate "Welcome" \
  --voice en-US-Neural2-D \
  --bg cafe \
  --bgvol 0.2 \
  --play
```

## Run Automated Tests

Create a test configuration file `test-config.json`:

```json
{
  "metadata": {
    "name": "My First Test Suite",
    "version": "1.0.0"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "passingScore": 0.7
  },
  "questions": [
    {
      "id": "greeting",
      "question": "Hello! How can I help you?",
      "intent": "User greets and asks for help",
      "expectedElements": ["Greeting", "Request for assistance"],
      "sampleResponse": "Hi, I need help with my account"
    }
  ]
}
```

Run the test:

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const testService = VoiceBotTestService.create('./test-config.json');
const results = await testService.runTestSuite();

console.log(`Pass Rate: ${results.summary.passRate}%`);
console.log(`Average Score: ${results.summary.averageScore}`);
```

### CLI Version

```bash
# Generate sample config
vokal test --save-sample

# Run tests
vokal test ./test-config.json
```

## Available Voices

List all available Google Cloud TTS voices:

```bash
# List all voices
vokal voices

# Filter by language
vokal voices en-US

# JSON output
vokal voices en-IN --format json
```

## Background Sounds

List available background audio:

```bash
vokal backgrounds
```

Available sounds:
- **office** - Office ambience (0.15 recommended volume)
- **cafe** - Coffee shop atmosphere (0.20)
- **nature** - Outdoor with birds (0.18)
- **rain** - Gentle rainfall (0.12)
- **phone** - Phone line static (0.08)
- **crowd** - Distant crowd noise (0.10)

## Common CLI Commands

```bash
# Generate speech with options
vokal voice generate "Text here" --voice en-US-Neural2-F --rate 1.2 --pitch 2.0

# Test audio playback
vokal test-audio

# Play an audio file
vokal play ./output.wav

# Show comprehensive examples
vokal example

# Get help
vokal --help
vokal voice --help
```

## Next Steps

- [Configuration Guide](configuration.md) - Detailed configuration options
- [User Guide](../user-guide/overview.md) - Complete feature documentation
- [API Reference](../api/overview.md) - API documentation
- [Examples](../user-guide/examples.md) - More examples

## Common Patterns

### Custom Recording Duration

```typescript
const result = await voiceBot.runVoiceInteraction(
  "Please describe your issue in detail",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    maxRecordingDuration: 20000  // 20 seconds
  }
);
```

### With Voice Activity Detection

```typescript
const config = {
  language: 'en-US',
  voice: 'en-US-Neural2-D',
  vadSettings: {
    silenceThreshold: 0.02,
    silenceDuration: 2000,      // Stop after 2s of silence
    speechTimeout: 10000         // Max wait for speech
  }
};

const result = await voiceBot.runVoiceInteraction("Your question?", config);
```

### Multiple Test Scenarios

```typescript
const testService = VoiceBotTestService.create('./test-config.json');

// Run tests with retries
const results = await testService.runTestSuite();

// Access individual results
results.results.forEach(result => {
  console.log(`${result.id}: ${result.passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Score: ${result.score}`);
  console.log(`  Transcript: ${result.transcript}`);
});
```

## Troubleshooting

### No audio output
```bash
vokal test-audio  # Test your audio setup
```

### Low transcription confidence
- Speak clearly at normal pace
- Reduce background noise
- Check microphone quality
- Adjust VAD settings

### Authentication errors
```bash
# Verify your .env file exists and has correct credentials
cat .env
```

## Ready to Learn More?

Explore the full documentation:
- [Features Overview](../user-guide/features.md)
- [API Methods](../api/methods.md)
- [Development Guide](../development/architecture.md)
