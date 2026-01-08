# SDK Usage Guide

This guide covers how to use Vokal programmatically as a TypeScript/JavaScript SDK in your applications.

## Overview

Vokal provides a comprehensive SDK for voice testing and interaction. You can import individual services or use the convenience functions.

## Installation

```bash
pnpm add @juspay/vokal
```

## Core Services

### 1. Voice Test Service (TTS)

Generate speech with background audio mixing.

```typescript
import { createVoiceTest } from '@juspay/vokal';

const voiceTest = createVoiceTest(process.env.GOOGLE_API_KEY);

// Basic TTS
const audioPath = await voiceTest.generateSpeech({
  text: 'Hello, welcome to our service',
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
});

// TTS with background audio
const audioWithBg = await voiceTest.generateSpeech({
  text: 'Please hold while we connect you',
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  backgroundSound: 'office', // cafe, office, nature, phone, rain
  backgroundVolume: 0.3,
  play: true // Play audio immediately
});
```

### 2. Voice Interaction Service (STT)

Real-time speech recognition and voice interaction.

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const interaction = new VoiceInteractionService(process.env.GOOGLE_API_KEY);

// Run complete voice interaction (TTS + STT)
const result = await interaction.runVoiceInteraction(
  'What is your account number?',
  {
    language: 'en-US',
    voice: 'en-US-Neural2-F',
    recordingDuration: 5000, // 5 seconds
    silenceThreshold: 0.01
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

### 3. Audio Recording Service

Record audio from microphone with voice activity detection.

```typescript
import { AudioRecordingService } from '@juspay/vokal';

const recorder = new AudioRecordingService({
  sampleRate: 16000,
  channels: 1,
  encoding: 'LINEAR16',
  silenceThreshold: 0.01,
  silenceDuration: 2000 // Stop after 2s of silence
});

// Start recording
const session = await recorder.startRecording();

// Stop after some time or on event
setTimeout(async () => {
  const audioBuffer = await recorder.stopRecording(session);
  console.log('Recorded audio:', audioBuffer.length, 'bytes');
}, 10000);
```

### 4. Audio Mixer Service

Mix audio files with background sounds.

```typescript
import { AudioMixerService } from '@juspay/vokal';

const mixer = new AudioMixerService();

// Mix speech with background noise
const mixedAudio = await mixer.mixAudio({
  sourceAudio: speechBuffer,
  backgroundAudio: 'cafe-ambience.wav',
  backgroundVolume: 0.2,
  outputPath: 'output.wav'
});
```

### 5. AI Comparison Service

Evaluate voice bot responses using AI.

```typescript
import { AIComparisonService } from '@juspay/vokal';

const aiService = AIComparisonService.create('google-ai', process.env.GOOGLE_API_KEY);

const evaluation = await aiService.compareResponses({
  userResponse: 'My account number is 12345',
  originalQuestion: 'What is your account number?',
  intent: 'User should provide their account number',
  expectedElements: [
    'Account number',
    'Numeric value',
    'Clear response'
  ],
  context: 'Banking customer service',
  sampleResponse: 'My account number is 67890'
});

console.log('Score:', evaluation.score); // 0 or 1
console.log('Confidence:', evaluation.confidence);
console.log('Analysis:', evaluation.analysis);
```

### 6. Voice Bot Test Service

Run complete test suites for voice bots.

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const testService = VoiceBotTestService.create(
  './vokal-config.json',
  process.env.GOOGLE_API_KEY
);

// Run all tests
const results = await testService.runTestSuite();

console.log('Tests passed:', results.summary.passed);
console.log('Tests failed:', results.summary.failed);
console.log('Success rate:', results.summary.successRate);

// Access individual test results
results.scenarios.forEach(scenario => {
  console.log(`${scenario.scenarioId}: ${scenario.success ? 'PASS' : 'FAIL'}`);
  console.log(`  Transcript: ${scenario.transcription}`);
  console.log(`  Score: ${scenario.evaluation.score}`);
});
```

## STT Provider Management

### Register Custom STT Handler

```typescript
import { STTHandlerManager, type STTHandler } from '@juspay/vokal';

// Create custom handler
const mySTTHandler: STTHandler = {
  async transcribe(audio: Buffer) {
    // Your STT implementation
    return 'transcribed text';
  },
  supports: {
    streaming: true,
    languageCodes: ['en-US', 'es-ES'],
    encoding: ['LINEAR16', 'FLAC']
  }
};

// Register handler
const manager = new STTHandlerManager('my-provider');
manager.registerHandler('my-provider', mySTTHandler);

// Use handler
const transcript = await manager.transcribe(audioBuffer);
```

### Use Google AI STT

```typescript
import { GoogleAISTTHandler } from '@juspay/vokal';

const sttHandler = new GoogleAISTTHandler({
  apiKey: process.env.GOOGLE_API_KEY,
  languageCode: 'en-US',
  encoding: 'LINEAR16',
  sampleRate: 16000
});

const transcript = await sttHandler.transcribe(audioBuffer);
console.log('Transcript:', transcript);
```

## Utility Functions

### Retry Logic

```typescript
import { retry, withTimeout, CircuitBreaker } from '@juspay/vokal';

// Retry with exponential backoff
const result = await retry(
  () => someUnreliableOperation(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2
  }
);

// Add timeout
const resultWithTimeout = await withTimeout(
  () => someSlowOperation(),
  5000 // 5 second timeout
);

// Circuit breaker pattern
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  timeout: 10000
});

const protectedResult = await breaker.execute(() => unreliableService());
```

### Logging

```typescript
import { ConsoleLogger, LogLevel, createComponentLogger } from '@juspay/vokal';

// Create logger
const logger = new ConsoleLogger({
  level: LogLevel.DEBUG,
  prefix: 'MyApp',
  timestamp: true
});

logger.info('Application started');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error occurred');

// Component-specific logger
const sttLogger = createComponentLogger('STT', LogLevel.INFO);
```

### Error Handling

```typescript
import {
  VoiceTestError,
  ErrorCode,
  isSTTError,
  isAPIError,
  getErrorMessage
} from '@juspay/vokal';

try {
  const result = await voiceTest.generateSpeech({ text: 'Hello' });
} catch (error) {
  if (isSTTError(error)) {
    console.error('STT Error:', error.code);
  } else if (isAPIError(error)) {
    console.error('API Error:', error.statusCode);
  } else {
    console.error('Error:', getErrorMessage(error));
  }
}
```

## Type Safety

All SDK functions are fully typed with TypeScript:

```typescript
import type {
  VoiceTestInput,
  VoiceTestResponse,
  STTResponse,
  AudioConfig,
  VoiceInteractionResult,
  TestResult
} from '@juspay/vokal';

// Type-safe configuration
const config: VoiceTestInput = {
  text: 'Hello world',
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
};
```

## Complete Example

Here's a complete example combining multiple services:

```typescript
import {
  createVoiceTest,
  VoiceInteractionService,
  AIComparisonService,
  ConsoleLogger,
  LogLevel
} from '@juspay/vokal';

async function runVoiceBotTest() {
  const logger = new ConsoleLogger({ level: LogLevel.INFO });
  const apiKey = process.env.GOOGLE_API_KEY;
  
  const voiceTest = createVoiceTest(apiKey);
  const interaction = new VoiceInteractionService(apiKey);
  const aiService = AIComparisonService.create('google-ai', apiKey);
  
  try {
    logger.info('Generating voice prompt...');
    await voiceTest.generateSpeech({
      text: 'What is your name?',
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-F',
      backgroundSound: 'office',
      play: true
    });
    
    logger.info('Recording user response...');
    const response = await interaction.runVoiceInteraction(
      'What is your name?',
      { recordingDuration: 5000 }
    );
    
    logger.info(`User said: "${response.transcript}"`);
    
    logger.info('Evaluating response...');
    const evaluation = await aiService.compareResponses({
      userResponse: response.transcript,
      originalQuestion: 'What is your name?',
      intent: 'User should provide their name',
      expectedElements: ['Name', 'Clear identification'],
      context: 'Customer service interaction'
    });
    
    logger.info(`Score: ${evaluation.score}`);
    logger.info(`Analysis: ${evaluation.analysis}`);
    
    return {
      success: evaluation.score === 1,
      transcript: response.transcript,
      evaluation
    };
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

runVoiceBotTest()
  .then(result => console.log('Test completed:', result))
  .catch(error => console.error('Test failed:', error));
```

## Next Steps

- [API Reference](../api/overview.md) - Detailed API documentation
- [Examples](examples.md) - More code examples
- [Configuration Guide](../getting-started/configuration.md) - Configuration options
- [Architecture](../development/architecture.md) - Understand the internals
