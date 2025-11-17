# Example Configurations

This directory contains sample configuration files to help you get started with the Voice Test Framework.

## Files

### `sample-config.json`

A basic example configuration demonstrating:
- Simple greeting and name collection questions
- Standard voice bot interaction patterns
- Minimal configuration for quick testing

**Usage:**
```bash
voice-test test examples/sample-config.json
```

## Creating Your Own Configuration

You can create custom test configurations by following this structure:

```json
{
  "metadata": {
    "name": "Your Test Suite Name",
    "version": "1.0.0",
    "description": "Description of what you're testing"
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
      "id": "unique-question-id",
      "question": "Question text to be spoken",
      "intent": "What the user should do",
      "expectedElements": [
        "Element 1",
        "Element 2"
      ],
      "context": "Context about this question",
      "sampleResponse": "Example of a good response"
    }
  ]
}
```

## Configuration Options

### Settings

- **defaultLanguage**: Language code (e.g., "en-US", "es-ES")
- **defaultVoice**: Google Cloud TTS voice name
- **recordingDuration**: Max recording time in milliseconds
- **maxRetries**: Number of retry attempts for failed questions
- **passingScore**: Minimum score (0-1) to consider a test passed
- **aiProvider**: AI provider for evaluation ("google-ai")

### Voice Activity Detection (VAD)

- **silenceThreshold**: Audio level threshold (0-1) to detect silence
- **silenceDuration**: Milliseconds of silence to stop recording
- **speechTimeout**: Maximum time to wait for speech start

### Question Fields

- **id**: Unique identifier for the question
- **question**: The text that will be spoken to the user
- **intent**: What response you expect from the user
- **expectedElements**: Array of elements that should be in the response
- **context**: Additional context for the AI evaluator
- **sampleResponse**: Example of a good response

## Advanced Features

### Per-Question Settings

You can override default settings for individual questions:

```json
{
  "id": "special-question",
  "question": "Question with custom settings",
  "settings": {
    "voice": "en-US-Neural2-F",
    "backgroundSound": "office",
    "backgroundVolume": 0.2
  }
}
```

### Background Sounds

Available background sound presets:
- `office`: Office environment with typing
- `cafe`: Coffee shop ambience
- `nature`: Outdoor environment
- `rain`: Rainfall
- `phone`: Phone line static
- `crowd`: Crowd noise

See the main documentation for more details.
