# Vokal 🎙️

> A production-ready voice bot testing and interaction framework with streaming Speech-to-Text, Text-to-Speech, and AI-powered evaluation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![NPM Package](https://img.shields.io/badge/npm-%40juspay%2Fvokal-red.svg)](https://www.npmjs.com/package/@juspay/vokal)

## ✨ What is Vokal?

Vokal is a comprehensive TypeScript framework for building, testing, and evaluating voice-based applications. It provides a provider-agnostic architecture for Speech-to-Text, Text-to-Speech, and AI-powered evaluation services. **Currently supports Google Cloud providers** (Speech-to-Text, Text-to-Speech via Neurolink SDK, and Gemini AI), with an extensible design that allows for additional provider integrations.

**Perfect for:**
- 🤖 Testing voice bots and conversational AI
- 📞 IVR (Interactive Voice Response) system validation
- 🎯 Voice UI/UX testing and evaluation
- 🔊 Speech synthesis and recognition workflows
- 🧪 Automated voice conversation testing

## 🚀 Key Features

### Voice Services
- **🎤 Text-to-Speech (TTS)** - High-quality neural speech synthesis via Neurolink SDK
- **🎧 Streaming Speech-to-Text** - Real-time audio transcription with voice activity detection
- **🗣️ Voice Interaction Pipeline** - Complete TTS → Listen → STT conversation flows
- **🎵 Background Audio Mixing** - Realistic test environments (office, cafe, rain, nature, phone, crowd)

### Testing & Evaluation
- **🤖 AI-Powered Evaluation** - Semantic response validation using Google Gemini
- **📊 Comprehensive Test Suites** - JSON-based test configuration with detailed reporting
- **🔄 Automatic Retries** - Built-in retry logic with exponential backoff
- **📈 Performance Metrics** - Pass rates, confidence scores, and detailed analytics

### Developer Experience
- **📘 Full TypeScript Support** - Complete type safety with strict mode
- **🛡️ Security First** - Input validation, sanitization, and secure credential handling
- **🔧 Easy Configuration** - JSON-based configuration with sensible defaults
- **📦 Modular Architecture** - Use individual services or the complete framework
- **🖥️ Powerful CLI** - Command-line interface for all operations

## 📋 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Services](#-core-services)
- [CLI Usage](#-cli-usage)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Background Sounds](#-background-sounds)
- [Contributing](#-contributing)

## 🔧 Installation

### Prerequisites

```bash
node -v  # Should be 18.x or higher
npm -v   # Should be 8.x or higher
```

### Install Vokal

```bash
npm install @juspay/vokal
```

Or clone and build from source:

```bash
git clone https://github.com/juspay/vokal.git
cd vokal
npm install
npm run build
```

### Set Up Credentials

Create a `.env` file in your project root:

```bash
# Option 1: Service Account (Recommended - Full Features)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option 2: API Key (Limited Features)
GOOGLE_AI_API_KEY=your_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> **💡 Tip:** Service account authentication provides access to advanced features like configurable VAD timeouts and enhanced STT capabilities.

## 🎯 Quick Start

### 1. Simple Text-to-Speech

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

### 2. Voice Interaction with Background Audio

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const voiceBot = new VoiceInteractionService();

// Run complete voice interaction
const result = await voiceBot.runVoiceInteraction(
  "What is your name?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    backgroundSound: 'office',
    backgroundVolume: 0.15
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

### 3. Automated Voice Bot Testing

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

// Run test suite from configuration
const testService = VoiceBotTestService.create('./test-config.json');
const results = await testService.runTestSuite();

console.log(`✅ Pass Rate: ${results.summary.passRate}%`);
console.log(`📊 Average Score: ${results.summary.averageScore}`);
console.log(`📁 Results: ${results.summary.resultsFile}`);
```

## 🎯 Core Services

| Service | Description | Use Case |
|---------|-------------|----------|
| **VoiceTestService** | Text-to-Speech with background audio via Neurolink | Generate test audio with realistic environments |
| **VoiceInteractionService** | Complete TTS + Listen + STT pipeline | Full conversation simulation |
| **VoiceBotTestService** | Automated test suite execution | Test multiple scenarios with AI evaluation |
| **AIComparisonService** | AI-powered response evaluation | Semantic answer validation using Gemini |
| **AudioMixerService** | Background audio mixing | Add realistic noise to test scenarios |
| **AudioRecordingService** | Microphone recording via naudiodon | Capture user responses |
| **STTHandlerManager** | Provider-agnostic STT management | Unified interface for multiple STT providers |

## 🖥️ CLI Usage

Vokal includes a comprehensive command-line interface:

### Generate Speech

```bash
# Basic TTS generation
vokal voice generate "Hello, world!" --voice en-US-Neural2-F --lang en-US

# With background audio
vokal voice generate "Welcome" --voice en-US-Neural2-D --lang en-US --bg cafe --bgvol 0.2 --play

# Advanced settings
vokal voice generate "Fast speech" --voice en-US-Neural2-A --rate 1.5 --pitch 5.0 --output speech.mp3
```

### List Available Voices

```bash
# List all voices
vokal voices

# Filter by language
vokal voices en-US

# JSON output
vokal voices en-IN --format json
```

### Background Sounds

```bash
# List available background sounds
vokal backgrounds
```

### Test Audio Playback

```bash
# Test system audio capability
vokal test-audio

# Play an audio file
vokal play ./output.wav
```

### Run Voice Bot Tests

```bash
# Create sample configuration
vokal test --save-sample

# Run test suite
vokal test ./config.json

# Run with specific provider and debug mode
vokal test --provider google-ai --debug --verbose
```

### Show Examples

```bash
# Display comprehensive usage examples
vokal example
```

Run `vokal --help` for complete CLI documentation.

## ⚙️ Configuration

### Test Suite Configuration

Create a JSON file to define your test scenarios:

```json
{
  "metadata": {
    "name": "My Voice Bot Tests",
    "version": "1.0.0",
    "description": "Voice bot test suite"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "passingScore": 0.7,
    "sttProvider": "google-ai",
    "ttsProvider": "google-ai",
    "aiProvider": "google-ai",
    "vadSettings": {
      "silenceThreshold": 0.02,
      "silenceDuration": 2000,
      "speechTimeout": 10000
    }
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

See the [`examples/sample-config.json`](./examples/sample-config.json) for a complete example.

## 🏗️ Architecture

Vokal is built with a **provider-agnostic architecture** using the Handler pattern for extensibility.

### Current Provider Support

**Google Cloud (Default)**
- **TTS**: Google Cloud Text-to-Speech via Neurolink SDK
- **STT**: Google Cloud Speech-to-Text via `GoogleAISTTHandler`
- **AI Evaluation**: Google Gemini via `AIComparisonService`

### Project Structure

```
vokal/
├── src/
│   ├── services/          # Core voice services
│   │   ├── voice-test.ts           # TTS service with Neurolink
│   │   ├── voice-interaction.ts    # Complete pipeline orchestration
│   │   ├── voice-bot-test.ts       # Test suite execution
│   │   ├── ai-comparison.ts        # AI-powered evaluation
│   │   ├── audio-mixer.ts          # Background audio processing
│   │   └── audio-recording.ts      # Microphone capture
│   ├── providers/         # Provider implementations
│   │   ├── google-ai-stt.handler.ts    # Google Cloud STT
│   │   ├── stt-handler-manager.ts      # Provider manager
│   │   └── stt-registry.ts             # Provider registry
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utilities (logging, retry, validation, security)
│   ├── constants/         # Audio configuration constants
│   ├── errors/            # Custom error classes
│   └── cli/               # Command-line interface
├── examples/              # Example configurations
│   ├── sample-config.json          # Test suite example
│   ├── basic-example.js            # Basic usage template
│   └── stt-handler-example.ts      # STT provider example
├── assets/                # Background audio files
│   ├── office-ambience.wav
│   ├── cafe-ambience.wav
│   ├── nature-sounds.wav
│   ├── rain-light.wav
│   ├── phone-static.wav
│   └── crowd-distant.wav
├── memory-bank/           # AI assistant context
└── docs/                  # Documentation (coming soon)
```

### Provider Architecture

```typescript
// Handler pattern for provider abstraction
interface STTHandler {
  startStreaming(config, onResult, onSpeechStart, onSpeechEnd, onError);
  stopStreaming();
}

// Register providers
STTHandlerManager.registerHandler('google-ai', GoogleAISTTHandler);

// Get provider instance
const handler = STTHandlerManager.getHandler('google-ai');
```

## 🎵 Background Sounds

Available background sound presets for realistic test environments:

| Sound | Description | Recommended Volume | Use Case |
|-------|-------------|-------------------|----------|
| **office** | Office ambience with typing and quiet chatter | 0.15 | Business applications, productivity bots |
| **cafe** | Coffee shop atmosphere with ambient noise | 0.20 | Customer service, casual conversations |
| **nature** | Outdoor setting with birds and gentle wind | 0.18 | Wellness apps, meditation guides |
| **rain** | Gentle rainfall ambience | 0.12 | Calming applications, sleep aids |
| **phone** | Phone line static and connection noise | 0.08 | IVR testing, call center simulations |
| **crowd** | Distant crowd noise and murmurs | 0.10 | Public space simulations, event apps |

All audio files are located in the `assets/` directory as WAV files.

## 🛡️ Security

Vokal follows security best practices:

- ✅ Input validation and sanitization via `validation.ts`
- ✅ Secure credential handling (no hardcoded secrets)
- ✅ Command injection prevention in `secure-exec.ts`
- ✅ Safe file path handling with path resolution
- ✅ API key validation
- ✅ Spawn-based command execution (no shell injection)

## 🧪 Testing

```bash
# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## 📦 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to JavaScript (`dist/`) |
| `npm run dev` | Build in watch mode |
| `npm run clean` | Clean build directory |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run prebuild` | Format and lint before build |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **[@juspay/neurolink](https://github.com/juspay/neurolink)** - TTS generation and audio synthesis
- **[Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)** - Streaming STT with voice activity detection
- **[Google Gemini](https://ai.google.dev/)** - AI-powered semantic evaluation
- **[naudiodon](https://github.com/Streampunk/naudiodon)** - Native audio I/O for Node.js

## 📞 Support

- 📖 Documentation: Coming soon in `/docs`
- 💬 Issues: [GitHub Issues](https://github.com/juspay/vokal/issues)
- 📧 Email: opensource@juspay.in

---

**Made with ❤️ by the Breeze Team**
