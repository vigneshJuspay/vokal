# Vokal Examples

This directory contains example configurations and code templates for the vokal voice bot framework.

## 📁 Available Examples

### Configuration Examples

| File | Description |
|------|-------------|
| **sample-config.json** | Complete voice bot test suite configuration with 3 sample questions |

### Code Examples

| File | Description | Status |
|------|-------------|--------|
| **basic-example.js** | Basic usage template (placeholder) | 🚧 Template |
| **stt-handler-example.ts** | STT provider handler example | 🚧 In Progress |

## 🚀 Quick Start

### Prerequisites

1. **Install vokal:**
   ```bash
   pnpm add @juspay/vokal
   # Or from source
   cd vokal && pnpm install && pnpm run build
   ```

2. **Set up credentials:**
   Create a `.env` file:
   ```bash
   # Option 1: Service Account (Recommended)
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

   # Option 2: API Key
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

### Run a Test Suite

```bash
# Using the CLI
vokal test ./examples/sample-config.json

# Using Node.js
node dist/src/cli/index.js test ./examples/sample-config.json
```

## 📖 Configuration Example

The `sample-config.json` demonstrates a complete test suite with metadata, settings, and test questions.

### Structure

```json
{
  "metadata": {
    "name": "Sample Voice Bot Test Suite",
    "version": "1.0.0",
    "description": "Example configuration for testing voice bot interactions",
    "author": "Voice Test Team",
    "tags": ["sample", "example", "getting-started"]
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "maxRetries": 2,
    "passingScore": 0.7,
    "questionDelay": 0,
    "vadSettings": {
      "silenceThreshold": 0.02,
      "silenceDuration": 2000,
      "speechTimeout": 10000
    },
    "aiProvider": "google-ai"
  },
  "questions": [...]
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `defaultLanguage` | Language code (BCP-47) | `en-US` |
| `defaultVoice` | Google Cloud TTS voice | `en-US-Neural2-D` |
| `recordingDuration` | Max recording time (ms) | `10000` |
| `passingScore` | Minimum score to pass (0-1) | `0.7` |
| `maxRetries` | Retry attempts on failure | `2` |
| `questionDelay` | Delay before listening (ms) | `1000` |

### Voice Activity Detection (VAD)

```json
{
  "vadSettings": {
    "silenceThreshold": 0.02,
    "silenceDuration": 2000,
    "speechTimeout": 10000
  }
}
```

| Setting | Description | Default |
|---------|-------------|---------|
| `silenceThreshold` | Audio level for silence | `0.02` |
| `silenceDuration` | Silence duration to stop (ms) | `2000` |
| `speechTimeout` | Max wait for speech (ms) | `10000` |

## 💻 Programmatic Usage

### Basic Voice Interaction

```typescript
import { VoiceInteractionService } from '@juspay/vokal';

const service = new VoiceInteractionService();

const result = await service.runVoiceInteraction(
  'What is your name?',
  {
    language: 'en-US',
    voice: 'en-US-Neural2-F',
    maxRecordingDuration: 10000
  }
);

console.log('User said:', result.transcript);
console.log('Confidence:', result.confidence);
```

### Running Test Suites

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const testService = VoiceBotTestService.create('./examples/sample-config.json');
const results = await testService.runTestSuite();

console.log('Pass Rate:', results.summary.passRate);
console.log('Average Score:', results.summary.averageScore);
```

### Text-to-Speech

```typescript
import { VoiceTestService } from '@juspay/vokal';

const voiceTest = VoiceTestService.create();

await voiceTest.generateSpeech({
  text: 'Hello from Vokal!',
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F',
  backgroundSound: 'office',
  play: true
});
```

## 🎯 Available Services

| Service | Description | Use Case |
|---------|-------------|----------|
| **VoiceTestService** | Text-to-Speech with background audio | Generate test audio |
| **VoiceInteractionService** | Complete TTS + Listen + STT pipeline | Full conversation simulation |
| **VoiceBotTestService** | Automated test suite execution | Test multiple scenarios |
| **AIComparisonService** | AI-powered response evaluation | Semantic answer validation |
| **AudioMixerService** | Background audio mixing | Add realistic noise |
| **AudioRecordingService** | Microphone recording | Capture user responses |

## 🔧 Background Sounds

Available background sound presets (located in `assets/`):

| Sound | Description | Recommended Volume |
|-------|-------------|-------------------|
| `office` | Office ambience with typing | 0.15 |
| `cafe` | Coffee shop atmosphere | 0.20 |
| `nature` | Outdoor with birds | 0.18 |
| `rain` | Gentle rainfall | 0.12 |
| `phone` | Phone line static | 0.08 |
| `crowd` | Distant crowd noise | 0.10 |

## 📊 Test Results

After running tests, you'll find:

- **vokal-results-[timestamp].json** - Detailed test results
- **conversation-report-[timestamp].json** - Conversation logs with AI evaluation

## 🐛 Troubleshooting

**Issue: "No microphone found"**
```bash
# Check available audio devices
vokal test-audio
```

**Issue: "Low transcription confidence"**
- Check microphone quality
- Reduce background noise
- Speak clearly at normal pace
- Adjust VAD thresholds

**Issue: "API authentication failed"**
- Verify `.env` file exists
- Check API key or service account path
- Ensure credentials have correct permissions

## 📚 Additional Resources

- **[Main README](../README.md)** - Complete project documentation
- **[CLI Documentation](../src/cli/)** - Command-line interface code

## 🤝 Contributing Examples

Have a great example?

1. Create your example file
2. Add documentation to this README
3. Test thoroughly
4. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
