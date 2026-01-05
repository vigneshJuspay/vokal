# Welcome to Vokal 🎙️

> A production-ready voice bot testing and interaction framework with streaming Speech-to-Text, Text-to-Speech, and AI-powered evaluation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](about/license.md)
[![NPM Package](https://img.shields.io/badge/npm-%40juspay%2Fvokal-red.svg)](https://www.npmjs.com/package/@juspay/vokal)

## What is Vokal?


Vokal is a comprehensive TypeScript framework for building, testing, and evaluating voice-based applications. It provides a provider-agnostic architecture for Speech-to-Text, Text-to-Speech, and AI-powered evaluation services.

**Currently supports Google Cloud providers** with an extensible design that allows for additional provider integrations.

## Perfect For

- 🤖 Testing voice bots and conversational AI
- 📞 IVR (Interactive Voice Response) system validation
- 🎯 Voice UI/UX testing and evaluation
- 🔊 Speech synthesis and recognition workflows
- 🧪 Automated voice conversation testing

## Key Features

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

## Quick Start

```bash
# Install Vokal
npm install @juspay/vokal

# Set up credentials
echo 'GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json' > .env

# Generate speech
vokal voice generate "Hello, world!" --voice en-US-Neural2-F --play

# Run a test suite
vokal test ./config.json
```

## Core Services

| Service | Description |
|---------|-------------|
| **VoiceTestService** | Text-to-Speech with background audio via Neurolink |
| **VoiceInteractionService** | Complete TTS + Listen + STT pipeline |
| **VoiceBotTestService** | Automated test suite execution |
| **AIComparisonService** | AI-powered response evaluation |
| **AudioMixerService** | Background audio mixing |
| **AudioRecordingService** | Microphone recording via naudiodon |

## Get Started

Check out the [Installation Guide](getting-started/installation.md) to begin using Vokal, or explore the [Quick Start](getting-started/quick-start.md) for immediate hands-on examples.

## License

This project is licensed under the MIT License - see the [License](about/license.md) page for details.

---

**Made with ❤️ by the Breeze Team**
