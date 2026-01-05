# Configuration

Learn how to configure Vokal for your voice testing needs.

## Configuration File Structure

Vokal uses JSON configuration files for test suites:

```json
{
  "metadata": {
    "name": "Test Suite Name",
    "version": "1.0.0",
    "description": "Description of test suite",
    "author": "Your Name",
    "tags": ["tag1", "tag2"]
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "maxRetries": 2,
    "passingScore": 0.7,
    "questionDelay": 1000,
    "sttProvider": "google-ai",
    "ttsProvider": "google-ai",
    "aiProvider": "google-ai",
    "vadSettings": {
      "silenceThreshold": 0.02,
      "silenceDuration": 2000,
      "speechTimeout": 10000
    }
  },
  "questions": []
}
```

## Metadata Section

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Name of your test suite |
| `version` | string | Version (semver format) |
| `description` | string | Brief description |
| `author` | string | Author name |
| `tags` | string[] | Tags for organization |

## Settings Section

### General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultLanguage` | string | `"en-US"` | BCP-47 language code |
| `defaultVoice` | string | `"en-US-Neural2-D"` | Google Cloud TTS voice name |
| `recordingDuration` | number | `10000` | Max recording time (ms) |
| `maxRetries` | number | `2` | Retry attempts on failure |
| `passingScore` | number | `0.7` | Minimum score to pass (0-1) |
| `questionDelay` | number | `1000` | Delay before listening (ms) |

### Provider Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sttProvider` | string | `"google-ai"` | Speech-to-Text provider |
| `ttsProvider` | string | `"google-ai"` | Text-to-Speech provider |
| `aiProvider` | string | `"google-ai"` | AI evaluation provider |

**Available Providers:**
- `"google-ai"` - Google Cloud services

### Voice Activity Detection (VAD)

Configure how Vokal detects speech start and end:

```json
{
  "vadSettings": {
    "silenceThreshold": 0.02,
    "silenceDuration": 2000,
    "speechTimeout": 10000
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `silenceThreshold` | number | `0.02` | Audio level threshold for silence (0-1) |
| `silenceDuration` | number | `2000` | Silence duration to stop recording (ms) |
| `speechTimeout` | number | `10000` | Max wait time for speech to start (ms) |

**Tips:**
- Lower `silenceThreshold` for quieter environments
- Increase `silenceDuration` for longer pauses
- Adjust `speechTimeout` based on expected response time

## Question Configuration

Each question in the `questions` array:

```json
{
  "id": "unique-question-id",
  "question": "What is your name?",
  "intent": "User provides their name",
  "expectedElements": ["Name", "Personal information"],
  "sampleResponse": "My name is John Doe",
  "language": "en-US",
  "voice": "en-US-Neural2-F",
  "backgroundSound": "office",
  "backgroundVolume": 0.15,
  "maxRecordingDuration": 10000
}
```

### Question Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier |
| `question` | string | ✅ | Question text (TTS) |
| `intent` | string | ✅ | Expected user intent |
| `expectedElements` | string[] | ✅ | Key elements in response |
| `sampleResponse` | string | ✅ | Example valid response |
| `language` | string | ❌ | Override default language |
| `voice` | string | ❌ | Override default voice |
| `backgroundSound` | string | ❌ | Background audio preset |
| `backgroundVolume` | number | ❌ | Volume (0-1) |
| `maxRecordingDuration` | number | ❌ | Override recording duration |

## Background Audio

### Audio Settings {#audio-settings}

Available background sound presets:

| Preset | Description | Recommended Volume | Use Case |
|--------|-------------|-------------------|----------|
| `office` | Office ambience with typing | 0.15 | Business apps |
| `cafe` | Coffee shop atmosphere | 0.20 | Casual conversations |
| `nature` | Outdoor with birds | 0.18 | Wellness apps |
| `rain` | Gentle rainfall | 0.12 | Calming apps |
| `phone` | Phone line static | 0.08 | IVR testing |
| `crowd` | Distant crowd noise | 0.10 | Public space |

## Voice Selection

### Popular Google Cloud Voices

**English (US):**
- `en-US-Neural2-A` - Male
- `en-US-Neural2-C` - Female
- `en-US-Neural2-D` - Male
- `en-US-Neural2-F` - Female
- `en-US-Neural2-J` - Male

**English (UK):**
- `en-GB-Neural2-A` - Female
- `en-GB-Neural2-B` - Male
- `en-GB-Neural2-C` - Female
- `en-GB-Neural2-D` - Male

List all available voices:
```bash
vokal voices
vokal voices en-US
```

## Environment Variables

Create a `.env` file for credentials:

### Option 1: Service Account

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Option 2: API Keys

```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Optional Settings

```bash
# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Custom audio paths
AUDIO_OUTPUT_DIR=./audio-output
```

## Example Configurations

### Simple Greeting Test

```json
{
  "metadata": {
    "name": "Greeting Test",
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
      "question": "Hello! How are you today?",
      "intent": "User responds to greeting",
      "expectedElements": ["Greeting", "Status"],
      "sampleResponse": "Hi, I'm doing great, thanks!"
    }
  ]
}
```

### Multi-Language Test

```json
{
  "settings": {
    "defaultLanguage": "en-US",
    "passingScore": 0.7
  },
  "questions": [
    {
      "id": "english-q",
      "question": "What is your name?",
      "language": "en-US",
      "voice": "en-US-Neural2-F",
      "intent": "User provides name",
      "expectedElements": ["Name"],
      "sampleResponse": "My name is Alice"
    },
    {
      "id": "hindi-q",
      "question": "आपका नाम क्या है?",
      "language": "hi-IN",
      "voice": "hi-IN-Neural2-A",
      "intent": "User provides name in Hindi",
      "expectedElements": ["नाम"],
      "sampleResponse": "मेरा नाम रवि है"
    }
  ]
}
```

### Noisy Environment Test

```json
{
  "settings": {
    "defaultLanguage": "en-US",
    "vadSettings": {
      "silenceThreshold": 0.03,
      "silenceDuration": 2500,
      "speechTimeout": 12000
    }
  },
  "questions": [
    {
      "id": "noisy-cafe",
      "question": "Can you hear me clearly?",
      "intent": "User confirms audio quality",
      "expectedElements": ["Confirmation", "Audio quality"],
      "sampleResponse": "Yes, I can hear you",
      "backgroundSound": "cafe",
      "backgroundVolume": 0.25
    }
  ]
}
```

## Programmatic Configuration

### TypeScript/JavaScript

```typescript
import { VoiceBotTestService } from '@juspay/vokal';

const config = {
  metadata: {
    name: "Dynamic Test",
    version: "1.0.0"
  },
  settings: {
    defaultLanguage: "en-US",
    defaultVoice: "en-US-Neural2-D",
    passingScore: 0.75
  },
  questions: [
    {
      id: "q1",
      question: "What is 2 plus 2?",
      intent: "User answers math question",
      expectedElements: ["Number", "Four"],
      sampleResponse: "Four"
    }
  ]
};

const testService = VoiceBotTestService.create(config);
const results = await testService.runTestSuite();
```

## Best Practices

1. **Start Simple** - Begin with basic questions and add complexity
2. **Test Incrementally** - Run individual questions first
3. **Adjust VAD** - Tune for your audio environment
4. **Use Background Audio** - Test in realistic conditions
5. **Set Realistic Scores** - Adjust `passingScore` based on results
6. **Organize Tests** - Use tags and clear IDs
7. **Version Control** - Track config changes in git

## Next Steps

- [Quick Start Examples](quick-start.md)
- [User Guide](../user-guide/overview.md)
- [API Reference](../api/overview.md)
