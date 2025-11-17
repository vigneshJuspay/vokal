# Examples

Practical examples demonstrating the Voice Test Framework's capabilities.

## Table of Contents

- [Text-to-Speech Examples](#text-to-speech-examples)
- [Streaming Speech-to-Text Examples](#streaming-speech-to-text-examples)
- [Voice Interaction Examples](#voice-interaction-examples)
- [Voice Bot Testing Examples](#voice-bot-testing-examples)
- [AI Comparison Examples](#ai-comparison-examples)
- [Audio Recording Examples](#audio-recording-examples)
- [Error Handling Examples](#error-handling-examples)

---

## Text-to-Speech Examples

### Basic TTS Generation

Generate speech from text and save to file:

```typescript
import { VoiceTestService } from './services/voice-test.js';

const tts = new VoiceTestService();

const audioPath = await tts.generateSpeech({
  text: "Hello, world!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  audioEncoding: 'WAV'
});

console.log('Audio saved to:', audioPath);
```

### TTS with Playback

Generate and immediately play audio:

```typescript
const tts = new VoiceTestService();

await tts.generateSpeech({
  text: "Welcome to the voice testing framework!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  audioEncoding: 'WAV',
  play: true  // Play audio after generation
});
```

### TTS with Background Audio

Generate speech with office background noise:

```typescript
const tts = new VoiceTestService();

await tts.generateSpeech({
  text: "Can you hear me with the office noise?",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  audioEncoding: 'WAV',
  play: true,
  backgroundSound: 'office',
  backgroundVolume: 0.15
});
```

### TTS with Custom Voice Settings

Adjust speaking rate and pitch:

```typescript
const tts = new VoiceTestService();

await tts.generateSpeech({
  text: "This is spoken at a faster rate with higher pitch",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  audioEncoding: 'WAV',
  speakingRate: 1.3,  // 30% faster
  pitch: 5.0,         // Higher pitch
  play: true
});
```

### Get Available Voices

List all available TTS voices for a language:

```typescript
const tts = new VoiceTestService();

const voices = await tts.getAvailableVoices('en-US');

console.log('Available English voices:');
voices.forEach(voice => {
  console.log(`- ${voice.name} (${voice.ssmlGender})`);
});
```

### Get Available Background Sounds

List all background sound presets:

```typescript
const tts = new VoiceTestService();

const backgrounds = tts.getAvailableBackgroundSounds();

backgrounds.forEach(bg => {
  console.log(`${bg.name}: ${bg.description} (default volume: ${bg.defaultVolume})`);
});

// Output:
// office: Subtle office environment with typing (default volume: 0.15)
// cafe: Coffee shop with distant conversations (default volume: 0.20)
// nature: Peaceful outdoor with birds (default volume: 0.18)
// rain: Gentle rainfall (default volume: 0.12)
// phone: Phone line static (default volume: 0.08)
// crowd: Distant crowd noise (default volume: 0.10)
```

---

## Streaming Speech-to-Text Examples

### Basic Streaming STT

Transcribe audio in real-time:

```typescript
import { StreamingSTTService } from './services/streaming-stt.js';
import fs from 'fs';

const stt = new StreamingSTTService();

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16'
  },
  // onResult callback
  (result) => {
    if (result.isFinal) {
      console.log('Final:', result.transcript);
      console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
    } else {
      console.log('Interim:', result.transcript);
    }
  }
);

// Read audio file and stream it
const audioStream = fs.createReadStream('path/to/audio.raw');
audioStream.on('data', (chunk) => {
  session.writeAudio(chunk);
});

audioStream.on('end', () => {
  session.endStream();
});
```

### Streaming STT with Voice Activity Detection

Use speech start/end callbacks:

```typescript
const stt = new StreamingSTTService();

let finalTranscript = '';

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16',
    speechStartTimeout: 10,  // Wait 10 seconds for speech to start
    speechEndTimeout: 4      // 4 seconds of silence to end
  },
  // onResult
  (result) => {
    if (result.isFinal) {
      finalTranscript += ' ' + result.transcript;
    }
  },
  // onSpeechStart
  () => {
    console.log('🗣️ User started speaking');
  },
  // onSpeechEnd
  () => {
    console.log('🤫 User stopped speaking');
    console.log('Complete transcript:', finalTranscript);
  },
  // onError
  (error) => {
    console.error('STT Error:', error.message);
  }
);
```

### Microphone to STT

Stream microphone input directly to STT:

```typescript
import { StreamingSTTService } from './services/streaming-stt.js';
import { AudioRecordingService } from './services/audio-recording.js';

const stt = new StreamingSTTService();
const recorder = new AudioRecordingService();

// Start recording
const audioSession = await recorder.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'LINEAR16'
});

// Start STT
const sttSession = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16'
  },
  (result) => {
    if (result.isFinal) {
      console.log('You said:', result.transcript);
    }
  },
  () => console.log('Started speaking'),
  () => {
    console.log('Stopped speaking');
    audioSession.stop();
    sttSession.endStream();
  }
);

// Pipe audio from microphone to STT
audioSession.audioStream.on('data', (chunk) => {
  sttSession.writeAudio(chunk);
});
```

### Accumulate Multiple Utterances

Collect multiple sentences in one session:

```typescript
const stt = new StreamingSTTService();

let allTranscripts: string[] = [];

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16'
  },
  (result) => {
    if (result.isFinal && result.transcript.trim()) {
      allTranscripts.push(result.transcript.trim());
      console.log('Sentence', allTranscripts.length + ':', result.transcript);
    }
  },
  () => console.log('Speech started'),
  () => {
    console.log('Speech ended');
    console.log('All sentences:', allTranscripts.join(' '));
  }
);
```

---

## Voice Interaction Examples

### Simple Voice Interaction

Ask a question and get the response:

```typescript
import { VoiceInteractionService } from './services/voice-interaction.js';

const voice = new VoiceInteractionService();

try {
  const result = await voice.runVoiceInteraction(
    "What is your name?",
    {
      language: 'en-US',
      voice: 'en-US-Neural2-D',
      maxRecordingDuration: 10000,
      silenceTimeout: 2000
    }
  );

  console.log('User said:', result.transcript);
  console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
  console.log('Duration:', result.duration + 'ms');
} finally {
  voice.cleanup();
}
```

### Voice Interaction with System Validation

Validate system before running interaction:

```typescript
const voice = new VoiceInteractionService();

try {
  // Validate all components
  const validation = await voice.validateSystem();

  if (!validation.tts || !validation.audio || !validation.stt) {
    console.error('System validation failed:');
    validation.errors.forEach(err => console.error('  -', err));
    process.exit(1);
  }

  console.log('✅ System validated successfully');

  // Run interaction
  const result = await voice.runVoiceInteraction(
    "Please tell me your email address"
  );

  console.log('Email:', result.transcript);
} finally {
  voice.cleanup();
}
```

### Voice Interaction with Background Noise

Test with realistic background audio:

```typescript
const voice = new VoiceInteractionService();

try {
  const result = await voice.runVoiceInteraction(
    "What is your account number?",
    {
      language: 'en-US',
      voice: 'en-US-Neural2-F',
      backgroundSound: 'cafe',
      backgroundVolume: 0.20,
      maxRecordingDuration: 15000,
      silenceTimeout: 3000
    }
  );

  console.log('User response:', result.transcript);
  console.log('Audio processed:', result.audioProcessed, 'bytes');
  console.log('Max volume level:', (result.maxVolume * 100).toFixed(1) + '%');
} finally {
  voice.cleanup();
}
```

### Sequential Voice Interactions

Run multiple questions in sequence:

```typescript
const voice = new VoiceInteractionService();

const questions = [
  "What is your name?",
  "What is your phone number?",
  "What is your email address?"
];

const responses: string[] = [];

try {
  for (const question of questions) {
    console.log('\nAsking:', question);

    const result = await voice.runVoiceInteraction(question, {
      maxRecordingDuration: 10000,
      silenceTimeout: 2000
    });

    responses.push(result.transcript);
    console.log('Answer:', result.transcript);

    // Brief pause between questions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nAll responses:', responses);
} finally {
  voice.cleanup();
}
```

---

## Voice Bot Testing Examples

### Basic Test Suite

Run a complete voice bot test:

```typescript
import { VoiceBotTestService } from './services/voice-bot-test.js';

const testService = VoiceBotTestService.create('./config/test-config.json');

try {
  const results = await testService.runTestSuite();

  console.log('=== Test Results ===');
  console.log('Total Questions:', results.summary.totalQuestions);
  console.log('Passed:', results.summary.passed);
  console.log('Failed:', results.summary.failed);
  console.log('Pass Rate:', (results.summary.passRate * 100).toFixed(1) + '%');
  console.log('Average Score:', results.summary.averageScore.toFixed(2));
  console.log('Total Time:', results.summary.totalTime + 'ms');
  console.log('Overall Result:', results.summary.overallResult);
  console.log('\nResults saved to:', results.summary.resultsFile);
  console.log('Conversation saved to:', results.summary.conversationFile);
} finally {
  testService.cleanup();
}
```

### Test Configuration Example

Create a test configuration file:

```json
{
  "metadata": {
    "name": "Customer Service Bot Test",
    "version": "1.0.0",
    "description": "Test customer service voice bot interactions"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "maxRetries": 2,
    "passingScore": 0.7,
    "vadSettings": {
      "silenceThreshold": 0.02,
      "silenceDuration": 2000,
      "speechTimeout": 10000
    },
    "backgroundAudio": {
      "enabled": true,
      "preset": "office",
      "volume": 0.15
    },
    "aiProvider": "google-ai"
  },
  "questions": [
    {
      "id": "greeting",
      "question": "Hello! Welcome to customer service. How can I help you today?",
      "intent": "User should respond with a greeting and state their need",
      "expectedElements": [
        "Polite greeting or acknowledgment",
        "Indication of needing help or having a question"
      ],
      "context": "Initial greeting to customer",
      "sampleResponse": "Hi, I need help with my account"
    },
    {
      "id": "name",
      "question": "Thank you! May I have your full name please?",
      "intent": "User should provide their full name",
      "expectedElements": [
        "First name",
        "Last name"
      ],
      "context": "Collecting customer name for verification",
      "sampleResponse": "My name is John Smith"
    },
    {
      "id": "account",
      "question": "Great! And what is your account number?",
      "intent": "User should provide their account number",
      "expectedElements": [
        "A number or alphanumeric identifier",
        "Clear indication this is their account number"
      ],
      "context": "Collecting account number for verification",
      "sampleResponse": "My account number is 123456789"
    }
  ]
}
```

### Single Question Test

Test just one question:

```typescript
const testService = VoiceBotTestService.create('./config/test-config.json');

const question = {
  id: 'name-test',
  question: "What is your name?",
  intent: "User should provide their name",
  expectedElements: [
    "A name or identifier",
    "Clear indication this is their name"
  ],
  context: "Name collection test"
};

try {
  const result = await testService.runSingleQuestion(question);

  console.log('Question:', question.question);
  console.log('User Response:', result.userResponse);
  console.log('Result:', result.result);
  console.log('Score:', result.score);
  console.log('AI Analysis:', result.aiAnalysis?.analysis);

  if (result.aiAnalysis?.strengths) {
    console.log('Strengths:', result.aiAnalysis.strengths);
  }
  if (result.aiAnalysis?.improvements) {
    console.log('Improvements:', result.aiAnalysis.improvements);
  }
} finally {
  testService.cleanup();
}
```

---

## AI Comparison Examples

### Basic Response Comparison

Compare user response to expected answer:

```typescript
import { AIComparisonService } from './services/ai-comparison.js';

const ai = AIComparisonService.create('google-ai');

const result = await ai.compareResponses({
  userResponse: "My name is Sarah Johnson",
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
console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
console.log('Analysis:', result.analysis);
console.log('Strengths:', result.strengths);
console.log('Improvements:', result.improvements);
```

### Account Number Validation

Validate account number response:

```typescript
const ai = AIComparisonService.create('google-ai');

const result = await ai.compareResponses({
  userResponse: "It's 987654321",
  originalQuestion: "What is your account number?",
  intent: "User should provide their account number",
  expectedElements: [
    "A numeric identifier",
    "Clear indication this is an account number"
  ],
  context: "Account verification",
  sampleResponse: "My account number is 123456789"
});

if (result.isMatch) {
  console.log('✅ Valid account number response');
} else {
  console.log('❌ Invalid response');
  console.log('Reason:', result.analysis);
}
```

### Complex Multi-Part Response

Validate response with multiple expected elements:

```typescript
const ai = AIComparisonService.create('google-ai');

const result = await ai.compareResponses({
  userResponse: "I'm calling because my credit card was charged twice for the same purchase last week",
  originalQuestion: "How can I help you today?",
  intent: "User should explain their issue clearly",
  expectedElements: [
    "Description of the problem",
    "Context about when it happened",
    "What type of issue (billing, technical, etc.)"
  ],
  context: "Initial problem description"
});

console.log('Score:', result.score);
console.log('Analysis:', result.analysis);

if (result.strengths.length > 0) {
  console.log('\nStrengths:');
  result.strengths.forEach(s => console.log('  ✓', s));
}

if (result.improvements.length > 0) {
  console.log('\nSuggested Improvements:');
  result.improvements.forEach(i => console.log('  •', i));
}
```

### Validate AI Service

Check if AI service is working:

```typescript
const ai = AIComparisonService.create('google-ai');

const isValid = await ai.validate();

if (isValid) {
  console.log('✅ AI service is ready');
} else {
  console.error('❌ AI service validation failed');
}
```

---

## Audio Recording Examples

### Basic Microphone Recording

Record from microphone:

```typescript
import { AudioRecordingService } from './services/audio-recording.js';

const recorder = new AudioRecordingService();

const session = await recorder.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'LINEAR16'
});

let totalBytes = 0;

session.audioStream.on('data', (chunk: Buffer) => {
  totalBytes += chunk.length;
  const volume = session.getVolumeLevel();
  console.log(`Audio: ${chunk.length} bytes, Volume: ${(volume * 100).toFixed(1)}%`);
});

// Record for 5 seconds
setTimeout(() => {
  session.stop();
  console.log('Total recorded:', totalBytes, 'bytes');
}, 5000);
```

### Record to File

Save microphone audio to a file:

```typescript
import { AudioRecordingService } from './services/audio-recording.js';
import fs from 'fs';

const recorder = new AudioRecordingService();

const session = await recorder.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'LINEAR16'
});

const outputFile = fs.createWriteStream('recording.raw');

session.audioStream.on('data', (chunk: Buffer) => {
  outputFile.write(chunk);
  console.log('Volume:', (session.getVolumeLevel() * 100).toFixed(1) + '%');
});

// Record for 10 seconds
setTimeout(() => {
  session.stop();
  outputFile.end();
  console.log('Recording saved to recording.raw');
}, 10000);
```

### Check Audio Support

Verify audio recording capabilities:

```typescript
const recorder = new AudioRecordingService();

const support = await recorder.checkAudioSupport();

console.log('Audio supported:', support.supported);

if (support.supported) {
  console.log('Backend:', support.backend);
} else {
  console.log('Missing tools:', support.missingTools);
  console.log('Recommendations:', support.recommendations);
}
```

### Volume-Based Recording

Start recording only when volume exceeds threshold:

```typescript
const recorder = new AudioRecordingService();

const session = await recorder.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'LINEAR16'
});

let recording = false;
const chunks: Buffer[] = [];
const volumeThreshold = 0.05; // 5% volume

session.audioStream.on('data', (chunk: Buffer) => {
  const volume = session.getVolumeLevel();

  if (volume > volumeThreshold) {
    if (!recording) {
      console.log('🎤 Started recording (volume detected)');
      recording = true;
    }
    chunks.push(chunk);
  } else if (recording) {
    console.log('🛑 Stopped recording (silence)');
    recording = false;

    // Process recorded chunks
    const totalAudio = Buffer.concat(chunks);
    console.log('Recorded:', totalAudio.length, 'bytes');
    chunks.length = 0;
  }
});

// Stop after 30 seconds
setTimeout(() => session.stop(), 30000);
```

---

## Error Handling Examples

### Graceful Error Handling

Handle errors with cleanup:

```typescript
import { VoiceInteractionService } from './services/voice-interaction.js';
import { VoiceTestError } from './types/index.js';

const voice = new VoiceInteractionService();

try {
  const result = await voice.runVoiceInteraction(
    "What is your name?",
    {
      maxRecordingDuration: 10000,
      silenceTimeout: 2000
    }
  );

  console.log('Success:', result.transcript);
} catch (error) {
  if (error instanceof VoiceTestError) {
    console.error('Voice Test Error:', error.code);
    console.error('Message:', error.message);

    // Handle specific error codes
    switch (error.code) {
      case 'NO_SPEECH_TIMEOUT':
        console.log('User did not speak within timeout period');
        break;
      case 'MAX_DURATION_REACHED':
        console.log('Recording exceeded maximum duration');
        break;
      case 'MISSING_API_KEY':
        console.log('API key not configured');
        break;
      case 'MISSING_CREDENTIALS':
        console.log('Service account credentials not found');
        break;
      default:
        console.log('Unknown error occurred');
    }
  } else {
    console.error('Unexpected error:', error);
  }
} finally {
  // Always cleanup
  voice.cleanup();
}
```

### Retry Logic

Implement retry for failed interactions:

```typescript
async function runWithRetry(
  question: string,
  maxRetries: number = 3
): Promise<string> {
  const voice = new VoiceInteractionService();

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        const result = await voice.runVoiceInteraction(question, {
          maxRecordingDuration: 10000,
          silenceTimeout: 2000
        });

        if (result.transcript && result.confidence > 0.3) {
          return result.transcript;
        }

        console.log('Low confidence, retrying...');
      } catch (error) {
        if (error instanceof VoiceTestError) {
          if (error.code === 'NO_SPEECH_TIMEOUT') {
            console.log('No speech detected, retrying...');
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  } finally {
    voice.cleanup();
  }
}

// Usage
const response = await runWithRetry("What is your name?", 3);
console.log('Final response:', response);
```

### Input Validation

Validate inputs before processing:

```typescript
function validateQuestion(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Question text cannot be empty');
  }

  if (text.length > 5000) {
    throw new Error('Question text too long (max 5000 characters)');
  }

  // Remove control characters
  const sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');
  if (sanitized !== text) {
    throw new Error('Question contains invalid control characters');
  }
}

// Usage
try {
  const question = "What is your name?";
  validateQuestion(question);

  const voice = new VoiceInteractionService();
  const result = await voice.runVoiceInteraction(question);
  voice.cleanup();
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Timeout Handling

Handle different timeout scenarios:

```typescript
const voice = new VoiceInteractionService();

try {
  const result = await voice.runVoiceInteraction(
    "Please describe your issue in detail",
    {
      maxRecordingDuration: 60000,  // 60 seconds max
      silenceTimeout: 5000           // 5 seconds silence
    }
  );

  console.log('User response:', result.transcript);
} catch (error) {
  if (error instanceof VoiceTestError) {
    if (error.code === 'NO_SPEECH_TIMEOUT') {
      console.log('User did not speak - prompting again');
      // Could retry with a different prompt
    } else if (error.code === 'MAX_DURATION_REACHED') {
      console.log('User spoke for too long - may have been cut off');
      // Could try to continue from where they left off
    }
  }
} finally {
  voice.cleanup();
}
```

### Resource Cleanup

Ensure proper cleanup even on errors:

```typescript
class VoiceTestRunner {
  private voice: VoiceInteractionService | null = null;
  private stt: StreamingSTTService | null = null;

  async run(): Promise<void> {
    try {
      this.voice = new VoiceInteractionService();
      this.stt = new StreamingSTTService();

      // Do work...
      const result = await this.voice.runVoiceInteraction("Test question");
      console.log(result.transcript);
    } finally {
      this.cleanup();
    }
  }

  cleanup(): void {
    if (this.voice) {
      this.voice.cleanup();
      this.voice = null;
    }
    if (this.stt) {
      this.stt.cleanup();
      this.stt = null;
    }
  }
}

// Usage
const runner = new VoiceTestRunner();
await runner.run();
```

---

**Last Updated**: 2025-11-17
**Version**: 2.0.0
