# Voice Test Framework

> A production-ready voice bot testing framework with streaming Speech-to-Text, TTS, and AI-powered evaluation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 🚀 Features

### Core Capabilities
- **🎤 Text-to-Speech (TTS)**: High-quality speech synthesis using Neurolink SDK with Google Gemini
- **🎧 Streaming Speech-to-Text**: Real-time transcription with Google Cloud Speech-to-Text streaming API
- **🗣️ Voice Activity Detection (VAD)**: Automatic speech start/end detection with configurable timeouts
- **🤖 AI Response Evaluation**: Semantic analysis using Google Gemini for intelligent answer validation
- **🎵 Audio Mixing**: Professional background audio mixing with multiple environment presets
- **📊 Complete Voice Pipeline**: End-to-end conversation flow with recording and transcription

### Advanced Features
- **Real-time Streaming**: Voice activity detection with interim and final transcription results
- **Service Account Support**: Full Google Cloud integration with enhanced features
- **Semantic Evaluation**: AI-powered response comparison (not exact text matching)
- **Retry Mechanisms**: Automatic retry with exponential backoff for reliability
- **Resource Management**: Proper cleanup and memory management
- **Input Validation**: Comprehensive validation with descriptive errors
- **Security**: Input sanitization and secure file handling

### Developer Experience
- **Full TypeScript Support**: Complete type safety with strict mode enabled
- **Zero Errors Build**: No TypeScript, ESLint, or Prettier violations
- **Professional Structure**: Industry-standard project organization
- **Cross-Platform**: Works on macOS, Linux, and Windows

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Services](#core-services)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Examples](#examples)
- [Security](#security)

## 🔧 Installation

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **Google Cloud Credentials**: Service account JSON or API key
- **Microphone Access**: For audio recording functionality

### Install Dependencies

```bash
git clone https://github.com/your-org/vokal.git
cd vokal
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```bash
# Option 1: Service Account (Recommended - Full Feature Support)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option 2: API Key (Limited Features)
GOOGLE_AI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: Service account authentication provides full access to Voice Activity Detection timeouts and enhanced STT features.

## 🚀 Quick Start

### 1. Simple Text-to-Speech

```typescript
import { VoiceTestService } from './services/voice-test.js';

const voiceTest = new VoiceTestService();

// Generate and play speech
await voiceTest.generateSpeech({
  text: "Hello, world!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-D',
  play: true
});
```

### 2. Complete Voice Interaction

```typescript
import { VoiceInteractionService } from './services/voice-interaction.js';

const voiceBot = new VoiceInteractionService();

// Validate system components
const status = await voiceBot.validateSystem();
console.log('System ready:', status);

// Run voice interaction (TTS + Listen + STT)
const result = await voiceBot.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    maxRecordingDuration: 10000,
    silenceTimeout: 2000
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

### 3. Streaming Speech-to-Text

```typescript
import { StreamingSTTService } from './services/streaming-stt.js';

const stt = new StreamingSTTService();

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16',
    speechStartTimeout: 10,  // seconds to wait for speech to start
    speechEndTimeout: 4      // seconds of silence to end speech
  },
  // onResult callback
  (result) => {
    if (result.isFinal) {
      console.log('Final:', result.transcript);
      console.log('Confidence:', result.confidence);
    } else {
      console.log('Interim:', result.transcript);
    }
  },
  // onSpeechStart callback
  () => console.log('User started speaking'),
  // onSpeechEnd callback
  () => console.log('User stopped speaking'),
  // onError callback
  (error) => console.error('STT Error:', error)
);

// Write audio chunks to the stream
audioStream.on('data', (chunk) => {
  session.writeAudio(chunk);
});

// End the stream when done
session.endStream();
```

### 4. Voice Bot Testing with AI Evaluation

```typescript
import { VoiceBotTestService } from './services/voice-bot-test.js';

const testService = VoiceBotTestService.create('./test-config.json');
const results = await testService.runTestSuite();

console.log('Pass Rate:', results.summary.passRate);
console.log('Average Score:', results.summary.averageScore);
console.log('Results saved to:', results.summary.resultsFile);
```

## 🎯 Core Services

### StreamingSTTService

Real-time speech-to-text with voice activity detection.

**Features:**
- Real-time interim results during speech
- Automatic speech start/end detection
- Configurable VAD timeouts
- Support for service account and API key authentication
- Multiple audio encodings (LINEAR16, WEBM_OPUS, MP3)

**Configuration:**
```typescript
interface StreamingSTTConfig {
  languageCode: string;           // e.g., 'en-US'
  sampleRateHertz: number;        // e.g., 16000
  encoding: 'LINEAR16' | 'WEBM_OPUS' | 'MP3';
  speechStartTimeout?: number;    // seconds (default: 10)
  speechEndTimeout?: number;      // seconds (default: 4)
}
```

### VoiceInteractionService

Complete voice conversation pipeline integrating TTS, audio recording, and STT.

**Features:**
- Plays question using TTS
- Records user response with microphone
- Transcribes speech using streaming STT
- Voice activity detection for automatic start/stop
- Configurable timeouts and thresholds

### VoiceTestService

Text-to-speech generation with background audio mixing.

**Features:**
- High-quality TTS using Neurolink SDK
- Background audio mixing (office, cafe, nature, etc.)
- Multiple voice options
- Adjustable speaking rate and pitch
- Save to file or play directly

### AIComparisonService

AI-powered semantic response evaluation.

**Features:**
- Semantic matching (not exact text comparison)
- Intent validation
- Expected elements checking
- Binary scoring (0 or 1)
- Detailed analysis and suggestions

## ⚙️ Configuration

### Voice Bot Test Configuration

Create a JSON configuration file for automated testing:

```json
{
  "metadata": {
    "name": "Customer Service Test",
    "version": "1.0.0"
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
    "aiProvider": "google-ai"
  },
  "questions": [
    {
      "id": "greeting",
      "question": "Hello! How can I help you today?",
      "intent": "User should respond with a greeting",
      "expectedElements": [
        "Polite greeting",
        "Indication of needing help"
      ]
    }
  ]
}
```

### Available Background Sounds

| Sound | Description | Default Volume |
|-------|-------------|----------------|
| `office` | Subtle office environment with typing | 0.15 |
| `cafe` | Coffee shop with distant conversations | 0.20 |
| `nature` | Peaceful outdoor with birds | 0.18 |
| `rain` | Gentle rainfall | 0.12 |
| `phone` | Phone line static | 0.08 |
| `crowd` | Distant crowd noise | 0.10 |

## 🏗️ Architecture

```
vokal/
│
├── src/
│   ├── services/
│   │   ├── voice-test.ts           # TTS service
│   │   ├── streaming-stt.ts        # Real-time STT with VAD
│   │   ├── voice-interaction.ts    # Complete voice pipeline
│   │   ├── voice-bot-test.ts       # Test orchestration
│   │   ├── ai-comparison.ts        # AI evaluation
│   │   ├── audio-mixer.ts          # Background audio
│   │   ├── audio-recording.ts      # Microphone capture
│   │   ├── stt.ts                  # Batch STT
│   │   └── browser-voice-test.ts   # Browser automation
│   ├── types/                      # TypeScript definitions
│   ├── utils/                      # Utilities
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   ├── retry.ts
│   │   ├── secure-exec.ts
│   │   └── stt-optimizer.ts
│   ├── constants/                  # Configuration constants
│   ├── errors/                     # Custom error classes
│   └── cli/                        # CLI interface
├── assets/                         # Background audio files
└── docs/                           # Documentation
```

### Key Components

1. **Streaming STT Service**
   - Uses Google Cloud Speech-to-Text streaming API
   - Real-time voice activity detection
   - Interim and final transcription results
   - Service account authentication for full features

2. **Voice Interaction Service**
   - Orchestrates TTS → Listen → STT pipeline
   - Automatic speech start/end detection
   - Configurable timeouts and thresholds
   - Resource cleanup and error handling

3. **Audio Recording Service**
   - Cross-platform microphone capture
   - Support for naudiodon (native) and node-record-lpcm16
   - Configurable sample rate, channels, and bit depth
   - Volume level monitoring

4. **AI Comparison Service**
   - Semantic response evaluation using Google Gemini
   - Intent validation and expected elements checking
   - Binary scoring with detailed analysis
   - Retry logic for reliability

## 📖 Examples

### Voice Bot Test with Background Audio

```typescript
const result = await voiceBot.runVoiceInteraction(
  "Welcome! Please tell me your name.",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-F',
    backgroundSound: 'office',
    backgroundVolume: 0.15,
    maxRecordingDuration: 10000,
    silenceTimeout: 2000
  }
);
```

### Custom STT Processing

```typescript
const stt = new StreamingSTTService();

let finalTranscript = '';

const session = stt.startStreaming(
  { languageCode: 'en-US', sampleRateHertz: 16000, encoding: 'LINEAR16' },
  (result) => {
    if (result.isFinal) {
      finalTranscript += ' ' + result.transcript;
    }
  },
  () => console.log('🗣️ Speech started'),
  () => {
    console.log('🛑 Speech ended');
    console.log('Complete transcript:', finalTranscript);
  }
);
```

## 🛡️ Security

This project follows security best practices:

- ✅ Input validation on all user inputs
- ✅ No command injection vulnerabilities
- ✅ Secure file path handling (no path traversal)
- ✅ API key validation
- ✅ Sanitized text inputs
- ✅ Safe shell command execution
- ✅ No hardcoded secrets

### Security Recommendations

1. **Service Account Security**
   - Store service account JSON files securely
   - Use environment variables for paths
   - Never commit credentials to git
   - Rotate service accounts regularly

2. **API Key Security**
   - Use `.env` files (add to `.gitignore`)
   - Never expose keys in client-side code
   - Use different keys for dev/prod environments
   - Monitor API usage for anomalies

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Build in watch mode |
| `npm run clean` | Clean build directory |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |

## 🙏 Acknowledgments

- [Neurolink](https://github.com/juspay/neurolink) - TTS SDK
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text) - Streaming STT API
- [Google Gemini](https://ai.google.dev/) - AI evaluation
