# Getting Started with Vokal

Welcome to Vokal! This guide will help you get started with the production voice bot testing framework.

## What is Vokal?

Vokal is a comprehensive TypeScript SDK and CLI tool for:

- **Voice Bot Testing** - Test conversational AI systems with real voice interactions
- **Text-to-Speech (TTS)** - Generate high-quality speech with background audio
- **Speech-to-Text (STT)** - Real-time voice recognition with multiple providers
- **AI Evaluation** - Semantic response analysis using advanced LLMs
- **Audio Processing** - Recording, mixing, and playback utilities

## Two Ways to Use Vokal

### 1. As a CLI Tool

Perfect for CI/CD pipelines and test automation:

```bash
npm install -g @juspay/vokal
vokal test -c vokal-config.json
```

### 2. As an SDK (Programmatic)

Perfect for integrating into your applications:

```typescript
import { createVoiceTest, VoiceInteractionService } from '@juspay/vokal';

const voiceTest = createVoiceTest(process.env.GOOGLE_API_KEY);
await voiceTest.generateSpeech({ text: 'Hello!' });
```

## Quick Links

- **CLI Usage**: [Quick Start](quick-start.md)
- **SDK Usage**: [SDK Guide](../user-guide/sdk-usage.md)
- **API Reference**: [API Documentation](../api/overview.md)
- **Examples**: [Code Examples](../user-guide/examples.md)

## Installation

Choose your installation method:

### For CLI Usage

```bash
# Global installation
npm install -g @juspay/vokal

# Or use npx (no installation needed)
npx @juspay/vokal test -c config.json
```

### For SDK Usage

```bash
# Add to your project
npm install @juspay/vokal

# Or with yarn
yarn add @juspay/vokal

# Or with yarn
npm install @juspay/vokal
```

## Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: 9.0.0 or higher
- **API Keys**: Google AI API key (for TTS/STT)
- **Audio Tools**: SoX (optional, for audio processing)

### Setting Up API Keys

Create a `.env` file in your project:

```env
GOOGLE_API_KEY=your_google_ai_api_key_here
```

Or export environment variables:

```bash
export GOOGLE_API_KEY="your_google_ai_api_key_here"
```

## Your First Test

### Using the SDK

```typescript
import { createVoiceTest } from '@juspay/vokal';

// Initialize the SDK
const voiceTest = createVoiceTest(process.env.GOOGLE_API_KEY);

// Generate speech with background audio
const audioPath = await voiceTest.generateSpeech({
  text: 'Welcome to our customer service line',
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  backgroundSound: 'office',
  play: true
});

console.log('Audio saved to:', audioPath);
```

### Using the CLI

Create `vokal-config.json`:

```json
{
  "sttProvider": "google-ai",
  "scenarios": [
    {
      "prompt": "What is your name?",
      "expectedResponse": "My name is Sarah"
    }
  ]
}
```

Run the test:

```bash
vokal test -c vokal-config.json
```

## Next Steps

- **CLI Users**: Continue to [Quick Start Guide](quick-start.md)
- **SDK Users**: Check out the [SDK Usage Guide](../user-guide/sdk-usage.md)
- **Learn the APIs**: Browse [API Reference](../api/overview.md)
- **See Examples**: Explore [Code Examples](../user-guide/examples.md)

## Need Help?

- 📚 [Full Documentation](https://juspay.github.io/vokal/)
- 🐛 [Report Issues](https://github.com/juspay/vokal/issues)
- 💬 [Discussions](https://github.com/juspay/vokal/discussions)
- 📧 [Support](../about/support.md)
