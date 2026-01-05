# User Guide Overview

Welcome to the Vokal user guide! This comprehensive guide covers all features and capabilities of the voice testing framework.

## What You'll Learn

This user guide is organized into sections covering:

- **Features** - Complete feature overview and capabilities
- **Examples** - Practical code examples and use cases
- **CLI Usage** - Command-line interface reference

## Core Concepts

### Voice Testing Pipeline

Vokal provides a complete pipeline for voice interaction testing:

```
Text Input → TTS Generation → Audio Mixing → Playback → Recording → STT → AI Evaluation
```

### Services Architecture

Vokal is built on modular services that can be used independently or together:

```typescript
// Individual services
VoiceTestService        // TTS generation
AudioMixerService       // Background audio
AudioRecordingService   // Microphone capture
AIComparisonService     // AI evaluation

// Orchestration services
VoiceInteractionService // Complete TTS→STT pipeline
VoiceBotTestService     // Automated test suites
```

## Key Features

### 1. Text-to-Speech (TTS)

Generate high-quality speech from text using Google Cloud Neural voices via Neurolink SDK.

**Capabilities:**
- 50+ neural voices across multiple languages
- Adjustable speaking rate and pitch
- Background audio mixing
- Multiple output formats

### 2. Speech-to-Text (STT)

Real-time streaming transcription with voice activity detection.

**Capabilities:**
- Live streaming transcription
- Voice activity detection (VAD)
- Confidence scores
- Multiple language support
- Provider-agnostic architecture

### 3. Voice Interaction

Complete conversation simulation with TTS, listening, and STT.

**Capabilities:**
- Full conversation flow
- Configurable recording duration
- VAD-based automatic stopping
- Background noise simulation
- Detailed result metrics

### 4. Automated Testing

Run comprehensive test suites with AI-powered evaluation.

**Capabilities:**
- JSON-based test configuration
- Multiple test scenarios
- AI semantic evaluation
- Retry logic with exponential backoff
- Detailed reporting and analytics

### 5. Background Audio

Add realistic environmental sounds to your tests.

**Available Presets:**
- Office ambience (typing, quiet chatter)
- Cafe atmosphere (coffee shop noise)
- Nature sounds (birds, gentle wind)
- Light rain
- Phone static
- Distant crowd

## Common Workflows

### Testing a Voice Bot

1. Create a test configuration with questions
2. Run the test suite
3. Review AI evaluation results
4. Iterate and improve

```bash
vokal test ./config.json
```

### Voice UI Testing

1. Generate TTS for prompts
2. Simulate user responses
3. Test in various noise conditions
4. Validate recognition accuracy

### IVR Validation

1. Configure realistic phone static
2. Test all menu options
3. Validate response handling
4. Check timeout behavior

## Getting Started

Choose your path:

- **New Users**: Start with [Quick Start](../getting-started/quick-start.md)
- **Developers**: Check [Examples](examples.md) for code samples
- **CLI Users**: See CLI commands below
- **API Users**: Browse [API Reference](../api/overview.md)

## CLI Quick Reference

```bash
# Voice generation
vokal voice generate "text" --voice VOICE --lang LANG

# List voices
vokal voices [LANGUAGE]

# List backgrounds
vokal backgrounds

# Run tests
vokal test CONFIG_FILE

# Test audio
vokal test-audio

# Play audio file
vokal play FILE

# Show examples
vokal example

# Get help
vokal --help
```

## Provider Architecture

Vokal uses a provider-agnostic architecture:

```typescript
// Current providers
STTProvider: "google-ai"
TTSProvider: "google-ai" (via Neurolink)
AIProvider: "google-ai" (Gemini)

// Extensible design allows adding:
// - AWS providers
// - Azure providers
// - Custom providers
```

## Configuration Overview

Vokal supports multiple configuration methods:

### 1. JSON Configuration Files
```json
{
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D"
  },
  "questions": [...]
}
```

### 2. Environment Variables
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
GOOGLE_AI_API_KEY=your_key
```

### 3. Programmatic Configuration
```typescript
const config = {
  language: 'en-US',
  voice: 'en-US-Neural2-D'
};
```

## Best Practices

### Voice Testing
- Start with simple questions
- Test in realistic environments
- Use appropriate background volumes
- Validate with AI evaluation

### Configuration
- Use version control for test configs
- Document test intent clearly
- Set realistic passing scores
- Organize tests by feature/area

### Performance
- Adjust VAD settings for environment
- Use appropriate recording durations
- Handle retries gracefully
- Monitor confidence scores

### Security
- Never commit API keys
- Use environment variables
- Validate all inputs
- Follow least privilege principle

## Troubleshooting

Common issues and solutions:

**Audio Issues**
```bash
vokal test-audio  # Test your setup
```

**Authentication Errors**
- Check `.env` file exists
- Verify credentials are valid
- Ensure proper permissions

**Low Confidence Scores**
- Reduce background noise
- Adjust VAD settings
- Improve microphone quality
- Speak clearly

**Timeout Errors**
- Increase `speechTimeout`
- Check microphone input
- Verify audio device

## Next Steps

- [Features Deep Dive](features.md)
- [Practical Examples](examples.md)
- [API Methods](../api/methods.md)
- [Architecture](../development/architecture.md)

## Support

Need help?
- Check [Examples](examples.md)
- Review [API docs](../api/overview.md)
- Open an [issue](https://github.com/juspay/vokal/issues)
