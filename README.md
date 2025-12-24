# Vokal 🎙️

> A production-ready voice bot testing and interaction framework with streaming Speech-to-Text, Text-to-Speech, and AI-powered evaluation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## ✨ What is Vokal?

Vokal is a comprehensive TypeScript framework for building, testing, and evaluating voice-based applications. It provides a provider-agnostic architecture for Speech-to-Text, Text-to-Speech, and AI-powered evaluation services. **Currently supports Google Cloud providers** (Speech-to-Text, Text-to-Speech, and Gemini AI), with an extensible design that allows for additional provider integrations.

**Perfect for:**
- 🤖 Testing voice bots and conversational AI
- 📞 IVR (Interactive Voice Response) system validation
- 🎯 Voice UI/UX testing and evaluation
- 🔊 Speech synthesis and recognition workflows
- 🧪 Automated voice conversation testing

## 🚀 Key Features

### Voice Services
- **🎤 Text-to-Speech (TTS)** - High-quality speech synthesis with multiple voices and languages
- **🎧 Streaming Speech-to-Text** - Real-time audio transcription with voice activity detection
- **🗣️ Voice Interaction Pipeline** - Complete TTS → Listen → STT conversation flows
- **🎵 Background Audio Mixing** - Realistic test environments (office, cafe, phone, etc.)

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

## 📋 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Services](#-core-services)
- [Documentation](#-documentation)
- [Examples](#-examples)
- [CLI Usage](#-cli-usage)
- [Contributing](#-contributing)

## 🔧 Installation

### Prerequisites

```bash
node -v  # Should be 18.x or higher
npm -v   # Should be 8.x or higher
```

### Install Vokal

```bash
npm install vokal
```

Or clone and build from source:

```bash
git clone https://github.com/your-org/vokal.git
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

> **🔄 Default Provider:** If no provider is explicitly specified, Vokal automatically defaults to `google-ai` for all services:
> - **Text-to-Speech (TTS)**: Uses Google Cloud Text-to-Speech
> - **Speech-to-Text (STT)**: Uses Google Cloud Speech-to-Text
> - **AI Comparison**: Uses Google Gemini for semantic evaluation
>
> You can override the default by specifying a provider in your configuration:
> ```json
> {
>   "settings": {
>     "ttsProvider": "google-ai",
>     "sttProvider": "google-ai", 
>     "aiProvider": "google-ai"
>   }
> }
> ```

## 🎯 Quick Start

### 1. Simple Text-to-Speech

```typescript
import { createVoiceTest } from 'vokal';

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
import { VoiceInteractionService } from 'vokal';

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

### 3. Streaming Speech Recognition

```typescript
import { StreamingSTTService } from 'vokal/services';

const stt = new StreamingSTTService();

const session = stt.startStreaming(
  {
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    encoding: 'LINEAR16',
    speechStartTimeout: 10,
    speechEndTimeout: 4
  },
  (result) => {
    console.log(result.isFinal ? 'Final:' : 'Interim:', result.transcript);
  },
  () => console.log('🗣️ Speech started'),
  () => console.log('🛑 Speech ended')
);

// Stream audio data
audioStream.on('data', chunk => session.writeAudio(chunk));

// End the stream
session.endStream();
```

### 4. Automated Voice Bot Testing

```typescript
import { VoiceBotTestService } from 'vokal';

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
| **VoiceTestService** | Text-to-Speech with background audio | Generate test audio with realistic environments |
| **StreamingSTTService** | Real-time speech-to-text | Live transcription with voice activity detection |
| **VoiceInteractionService** | Complete TTS + Listen + STT pipeline | Full conversation simulation |
| **VoiceBotTestService** | Automated test suite execution | Test multiple scenarios with AI evaluation |
| **AIComparisonService** | AI-powered response evaluation | Semantic answer validation |
| **AudioMixerService** | Background audio mixing | Add realistic noise to test scenarios |
| **AudioRecordingService** | Microphone recording | Capture user responses |

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Installation and first steps
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- **[Configuration Guide](./docs/CONFIGURATION.md)** - Test suite configuration
- **[Testing Guide](./docs/TESTING.md)** - Writing and running tests
- **[Advanced Features](./docs/ADVANCED.md)** - Voice Activity Detection, streaming, and more
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and components

## 💡 Examples

Check out the `examples/` directory for complete working examples:

- **[Basic TTS](./examples/01-basic-tts.ts)** - Simple text-to-speech
- **[Speech Recognition](./examples/02-speech-recognition.ts)** - Recording and transcription
- **[Voice Interaction](./examples/03-voice-interaction.ts)** - Complete conversation flow
- **[Test Suite](./examples/04-test-suite.ts)** - Automated testing
- **[Advanced Streaming](./examples/05-advanced-streaming.ts)** - Real-time STT with VAD
- **[Custom Configuration](./examples/sample-config.json)** - Test suite configuration

## 🖥️ CLI Usage

Vokal includes a powerful command-line interface:

```bash
# Run a test suite
vokal test ./config.json

# Generate speech from text
vokal tts "Hello, world!" --voice en-US-Neural2-F --output speech.mp3

# Transcribe audio file
vokal stt audio.wav --language en-US

# Interactive voice test
vokal interact "What is your name?" --voice en-US-Neural2-D

# Validate configuration
vokal validate ./config.json
```

Run `vokal --help` for complete CLI documentation.

## ⚙️ Configuration

### Test Suite Configuration

Create a JSON file to define your test scenarios:

```json
{
  "metadata": {
    "name": "My Voice Bot Tests",
    "version": "1.0.0"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "passingScore": 0.7,
    "vadSettings": {
      "silenceThreshold": 0.02,
      "silenceDuration": 2000
    }
  },
  "questions": [
    {
      "id": "greeting",
      "question": "Hello! How can I help you?",
      "intent": "User greets and asks for help",
      "expectedElements": ["Greeting", "Request for assistance"]
    }
  ]
}
```

See [Configuration Guide](./docs/CONFIGURATION.md) for complete details.

## 🏗️ Architecture

Vokal is built with a **provider-agnostic architecture** that separates service interfaces from their implementations. This design allows for easy integration of additional providers in the future.

### Current Provider Support

**Google Cloud (Default)**
- Text-to-Speech via Google Cloud TTS
- Speech-to-Text via Google Cloud STT
- AI Evaluation via Google Gemini

### Provider Architecture

```
vokal/
├── src/
│   ├── services/          # Core voice services (provider-agnostic)
│   │   ├── voice-test.ts           # TTS service
│   │   ├── streaming-stt.ts        # Streaming STT
│   │   ├── voice-interaction.ts    # Complete pipeline
│   │   ├── voice-bot-test.ts       # Test orchestration
│   │   ├── ai-comparison.ts        # AI evaluation
│   │   ├── audio-mixer.ts          # Audio processing
│   │   └── audio-recording.ts      # Microphone capture
│   ├── providers/         # Provider implementations
│   │   └── google-ai/     # Google Cloud provider
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utilities (logging, retry, validation)
│   ├── constants/         # Configuration constants
│   ├── errors/            # Custom error classes
│   └── cli/               # Command-line interface
├── examples/              # Example code and configurations
├── docs/                  # Documentation
└── assets/                # Background audio files
```

## 🛡️ Security

Vokal follows security best practices:

- ✅ Input validation and sanitization
- ✅ Secure credential handling
- ✅ No command injection vulnerabilities
- ✅ Safe file path handling
- ✅ API key validation
- ✅ No hardcoded secrets

See [SECURITY.md](./docs/SECURITY.md) for security guidelines.

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
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Build in watch mode |
| `npm run clean` | Clean build directory |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **[Neurolink SDK](https://github.com/juspay/neurolink)** - TTS integration
- **[Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)** - Streaming STT API
- **[Google Gemini](https://ai.google.dev/)** - AI-powered evaluation

## 📞 Support

- 📖 [Documentation](./docs/)
- 💬 [GitHub Issues](https://github.com/your-org/vokal/issues)
- 📧 Email: support@vokal.dev

---
