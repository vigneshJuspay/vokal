# Vokal Examples 📚

This directory contains practical examples demonstrating how to use Vokal's features.

## 📁 Available Examples

### 1. Basic Examples

| File | Description | Difficulty |
|------|-------------|------------|
| **01-basic-tts.ts** | Simple text-to-speech generation | ⭐ Beginner |
| **02-speech-recognition.ts** | Recording and transcribing audio | ⭐ Beginner |
| **03-voice-interaction.ts** | Complete voice conversation flow | ⭐⭐ Intermediate |
| **04-test-suite.ts** | Automated voice bot testing | ⭐⭐ Intermediate |
| **05-advanced-streaming.ts** | Real-time STT with voice activity detection | ⭐⭐⭐ Advanced |

### 2. Configuration Examples

| File | Description |
|------|-------------|
| **sample-config.json** | Basic test suite configuration |
| **customer-service-config.json** | Customer service bot testing |
| **multilingual-config.json** | Multi-language voice testing |

## 🚀 Running Examples

### Prerequisites

1. **Install dependencies:**
   ```bash
   cd /path/to/vokal
   npm install
   npm run build
   ```

2. **Set up credentials:**
   Create a `.env` file in the project root:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   # OR
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

### Run an Example

```bash
# Run TypeScript directly
npx ts-node examples/01-basic-tts.ts

# Or build and run
npm run build
node dist/examples/01-basic-tts.js
```

## 📖 Example Descriptions

### 01. Basic Text-to-Speech

**What it demonstrates:**
- Generating speech from text
- Using different voices and languages
- Saving audio to files
- Playing audio directly

**Key concepts:**
- `VoiceTestService` initialization
- `generateSpeech()` method
- Voice selection and configuration

**Usage:**
```typescript
import { createVoiceTest } from '../src/index.js';

const voiceTest = createVoiceTest();
await voiceTest.generateSpeech({
  text: "Hello from Vokal!",
  languageCode: 'en-US',
  voiceName: 'en-US-Neural2-F'
});
```

---

### 02. Speech Recognition

**What it demonstrates:**
- Recording audio from microphone
- Transcribing audio to text
- Handling confidence scores
- Error handling and retries

**Key concepts:**
- `AudioRecordingService` for capture
- `StreamingSTTService` for transcription
- Voice activity detection
- Audio quality optimization

**Usage:**
```typescript
import { AudioRecordingService, StreamingSTTService } from '../src/index.js';

const recorder = new AudioRecordingService();
const stt = new StreamingSTTService();

// Record and transcribe
const session = await recorder.startRecording({
  duration: 5000,
  sampleRate: 16000
});
```

---

### 03. Voice Interaction

**What it demonstrates:**
- Complete TTS → Listen → STT pipeline
- Background audio mixing
- Voice activity detection
- Realistic conversation simulation

**Key concepts:**
- `VoiceInteractionService` orchestration
- Background sound effects
- Silence detection
- Response evaluation

**Usage:**
```typescript
import { VoiceInteractionService } from '../src/index.js';

const voiceBot = new VoiceInteractionService();

const result = await voiceBot.runVoiceInteraction(
  "What is your favorite color?",
  {
    language: 'en-US',
    voice: 'en-US-Neural2-D',
    backgroundSound: 'cafe',
    backgroundVolume: 0.2
  }
);

console.log('User said:', result.transcript);
```

---

### 04. Test Suite

**What it demonstrates:**
- JSON-based test configuration
- Running multiple test scenarios
- AI-powered response evaluation
- Generating detailed reports

**Key concepts:**
- Test configuration structure
- `VoiceBotTestService` usage
- Semantic response validation
- Pass/fail criteria

**Usage:**
```typescript
import { VoiceBotTestService } from '../src/index.js';

const testService = VoiceBotTestService.create('./examples/sample-config.json');
const results = await testService.runTestSuite();

console.log(`Pass rate: ${results.summary.passRate}%`);
```

---

### 05. Advanced Streaming

**What it demonstrates:**
- Real-time audio streaming
- Interim transcription results
- Custom voice activity detection
- Low-latency processing

**Key concepts:**
- Streaming STT configuration
- Interim vs. final results
- Speech start/end detection
- Timeout configuration

**Usage:**
```typescript
import { StreamingSTTService } from '../src/index.js';

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
    if (result.isFinal) {
      console.log('✅ Final:', result.transcript);
    } else {
      console.log('⏳ Interim:', result.transcript);
    }
  }
);
```

---

## 🎛️ Configuration Examples

### Basic Test Configuration

The `sample-config.json` demonstrates a simple test suite:

```json
{
  "metadata": {
    "name": "Basic Voice Bot Test",
    "version": "1.0.0"
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-D",
    "recordingDuration": 10000,
    "passingScore": 0.7
  },
  "questions": [...]
}
```

**Key configuration options:**

| Option | Description | Default |
|--------|-------------|---------|
| `defaultLanguage` | Language code (BCP-47) | `en-US` |
| `defaultVoice` | Google Cloud TTS voice | `en-US-Neural2-D` |
| `recordingDuration` | Max recording time (ms) | `10000` |
| `passingScore` | Minimum score to pass (0-1) | `0.7` |
| `maxRetries` | Retry attempts on failure | `2` |

### Voice Activity Detection (VAD) Settings

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
| `silenceThreshold` | Audio level for silence (0-1) | `0.02` |
| `silenceDuration` | Silence duration to stop (ms) | `2000` |
| `speechTimeout` | Max wait for speech (ms) | `10000` |

### Background Sound Options

```json
{
  "settings": {
    "backgroundSound": "office",
    "backgroundVolume": 0.15
  }
}
```

**Available sounds:**
- `office` - Office environment with typing (0.15)
- `cafe` - Coffee shop ambience (0.20)
- `nature` - Outdoor with birds (0.18)
- `rain` - Gentle rainfall (0.12)
- `phone` - Phone line static (0.08)
- `crowd` - Distant crowd noise (0.10)

---

## 💡 Tips and Best Practices

### 1. Voice Selection

Choose voices based on your use case:

**Customer Service:**
- `en-US-Neural2-D` (Male, professional)
- `en-US-Neural2-F` (Female, warm)
- `en-US-Neural2-J` (Male, friendly)

**IVR Systems:**
- `en-US-Neural2-C` (Female, clear)
- `en-US-Neural2-A` (Male, authoritative)

### 2. Audio Quality

For best transcription accuracy:
- Use 16kHz sample rate minimum
- LINEAR16 encoding for lowest latency
- Quiet environment or noise cancellation
- Good quality microphone

### 3. VAD Configuration

Adjust based on environment:

**Quiet environment:**
```json
{
  "silenceThreshold": 0.01,
  "silenceDuration": 1500
}
```

**Noisy environment:**
```json
{
  "silenceThreshold": 0.05,
  "silenceDuration": 2500
}
```

### 4. Test Design

**Good test questions:**
- ✅ Clear and specific intent
- ✅ Expected response is well-defined
- ✅ Realistic conversation flow
- ✅ Appropriate difficulty level

**Avoid:**
- ❌ Ambiguous questions
- ❌ Multiple intents in one question
- ❌ Overly complex expectations
- ❌ Questions requiring external context

### 5. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await voiceBot.runVoiceInteraction(question, config);
  // Process result
} catch (error) {
  if (error.code === 'RECORDING_ERROR') {
    // Handle microphone issues
  } else if (error.code === 'STT_ERROR') {
    // Handle transcription issues
  }
  console.error('Test failed:', error.message);
}
```

---

## 🔧 Customization

### Creating Custom Examples

1. **Copy an existing example:**
   ```bash
   cp examples/01-basic-tts.ts examples/my-custom-example.ts
   ```

2. **Modify for your use case:**
   - Change voice settings
   - Add error handling
   - Customize output format
   - Add logging

3. **Run your example:**
   ```bash
   npx ts-node examples/my-custom-example.ts
   ```

### Extending Configuration

Create domain-specific configurations:

```json
{
  "metadata": {
    "name": "Healthcare Bot Test",
    "domain": "healthcare",
    "compliance": ["HIPAA"]
  },
  "settings": {
    "defaultLanguage": "en-US",
    "defaultVoice": "en-US-Neural2-F",
    "privacyMode": true
  },
  "questions": [
    {
      "id": "symptoms",
      "question": "What symptoms are you experiencing?",
      "intent": "Patient describes health concerns",
      "sensitivity": "high"
    }
  ]
}
```

---

## 📊 Understanding Test Results

### Result Files

After running tests, you'll find:

- **vokal-results-[timestamp].json** - Detailed results
- **conversation-report-[timestamp].json** - Conversation logs

### Result Structure

```json
{
  "metadata": {...},
  "summary": {
    "totalQuestions": 3,
    "passed": 2,
    "failed": 1,
    "passRate": 66.67,
    "averageScore": 0.75
  },
  "results": [
    {
      "questionId": "greeting",
      "passed": true,
      "score": 0.85,
      "transcript": "Hello, I need help",
      "evaluation": {...}
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "No microphone found"**
```bash
# Check available audio devices
vokal devices

# Specify device index
vokal interact "Test" --device 0
```

**Issue: "Low transcription confidence"**
- Check microphone quality
- Reduce background noise
- Speak clearly and at normal pace
- Adjust VAD thresholds

**Issue: "API authentication failed"**
- Verify `.env` file exists
- Check API key or service account path
- Ensure credentials have correct permissions

---

## 📚 Additional Resources

- **[Main Documentation](../docs/)** - Complete API documentation
- **[Configuration Guide](../docs/CONFIGURATION.md)** - Detailed config options
- **[API Reference](../docs/API_REFERENCE.md)** - Full API documentation
- **[Troubleshooting](../docs/TROUBLESHOOTING.md)** - Common problems and solutions

---

## 🤝 Contributing Examples

Have a great example? Share it!

1. Create your example file
2. Add documentation to this README
3. Test thoroughly
4. Submit a pull request

**Example template:**
```typescript
/**
 * Example: [Name]
 * 
 * Description: [What this demonstrates]
 * Difficulty: [Beginner/Intermediate/Advanced]
 * 
 * Usage:
 *   npx ts-node examples/[filename].ts
 */

import { /* services */ } from '../src/index.js';

async function main() {
  // Your example code here
}

main().catch(console.error);
```

---

**Need help?** Open an issue on GitHub or check the [documentation](../docs/).
