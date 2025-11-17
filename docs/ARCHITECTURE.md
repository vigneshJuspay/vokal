# Architecture Documentation

This document describes the architecture and design of the Voice Test Framework.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Services](#core-services)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)

## Overview

The Voice Test Framework is designed as a modular, service-oriented architecture for voice bot testing and validation. It integrates multiple Google Cloud services (Speech-to-Text, Text-to-Speech, Gemini AI) with local audio processing capabilities.

### Key Design Goals

1. **Modularity**: Each service is independent and can be used standalone
2. **Real-time Processing**: Streaming STT with voice activity detection
3. **Reliability**: Retry mechanisms, error handling, and resource cleanup
4. **Security**: Input validation, sanitization, and secure authentication
5. **Developer Experience**: TypeScript, comprehensive logging, clear APIs

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Voice Test Framework                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Voice Bot Test │  │   Voice      │  │   Browser      │  │
│  │    Service     │──│ Interaction  │  │   Voice Test   │  │
│  │                │  │   Service    │  │                │  │
│  └────────────────┘  └──────┬───────┘  └────────────────┘  │
│                             │                                │
│        ┌────────────────────┼────────────────────┐          │
│        │                    │                    │          │
│        ▼                    ▼                    ▼          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │   TTS       │  │  Streaming   │  │   AI           │    │
│  │  Service    │  │  STT Service │  │  Comparison    │    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
│        │                  │                    │            │
│        │                  │                    │            │
│        ▼                  ▼                    ▼            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │   Audio     │  │   Audio      │  │   Validation   │    │
│  │   Mixer     │  │  Recording   │  │   Utilities    │    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────────┐
          │      Google Cloud Services           │
          ├─────────────────────────────────────┤
          │  • Speech-to-Text Streaming API     │
          │  • Text-to-Speech API               │
          │  • Gemini AI API                    │
          └─────────────────────────────────────┘
```

## Core Services

### 1. StreamingSTTService

**Purpose**: Real-time speech-to-text transcription with voice activity detection.

**Responsibilities**:
- Establish streaming connection to Google Cloud Speech-to-Text
- Process audio chunks in real-time
- Detect speech start and end events
- Provide interim and final transcription results
- Manage authentication (service account or API key)

**Key Components**:
```typescript
class StreamingSTTService {
  - client: SpeechClient              // Google Cloud client
  - config: StreamingSTTConfig        // STT configuration
  - isActive: boolean                 // Stream state
  - audioChunksReceived: number       // Metrics tracking

  + startStreaming()                  // Initialize streaming session
  + cleanup()                         // Resource cleanup
}
```

**Authentication**:
- **Service Account** (Preferred): Full VAD timeout support
- **API Key** (Fallback): Limited feature set

**Features**:
- Voice Activity Detection (VAD)
- Configurable speech start/end timeouts
- Real-time interim results
- Automatic punctuation
- Multiple audio encoding support

### 2. VoiceInteractionService

**Purpose**: Complete voice conversation pipeline orchestration.

**Responsibilities**:
- Play TTS questions
- Record user audio
- Stream audio to STT
- Manage conversation flow
- Handle timeouts and errors

**Flow**:
```
1. Play Question (TTS)
   ↓
2. Wait 1 second
   ↓
3. Start Audio Recording
   ↓
4. Start STT Streaming
   ↓
5. Pipe audio: Recording → STT
   ↓
6. Listen for speech events
   ↓
7. Handle transcription results
   ↓
8. Return transcript + metadata
```

**Key Features**:
- System validation before interaction
- Configurable recording duration
- Silence timeout detection
- Speech activity callbacks
- Graceful error handling

### 3. VoiceTestService

**Purpose**: Text-to-speech generation with audio mixing.

**Responsibilities**:
- Generate speech from text
- Mix background audio
- Play audio output
- Save to file

**Dependencies**:
- Neurolink TTS SDK
- AudioMixerService
- STTService (for batch transcription)

### 4. AIComparisonService

**Purpose**: Semantic response evaluation using AI.

**Responsibilities**:
- Compare user response to expected answer
- Validate intent and expected elements
- Provide binary scoring (0 or 1)
- Generate detailed analysis

**Evaluation Process**:
```
1. Build prompt with:
   - Original question
   - Expected intent
   - Expected elements
   - User's actual response

2. Send to Gemini AI

3. Parse JSON response:
   - isMatch: boolean
   - score: 0 or 1
   - confidence: 0-1
   - analysis: string
   - strengths: string[]
   - improvements: string[]

4. Return structured result
```

### 5. AudioRecordingService

**Purpose**: Cross-platform microphone audio capture.

**Responsibilities**:
- Initialize microphone
- Capture audio stream
- Monitor volume levels
- Provide cleanup

**Audio Backends**:
1. **naudiodon** (Preferred): Native Node.js audio bindings
2. **node-record-lpcm16** (Fallback): External `rec` command

### 6. AudioMixerService

**Purpose**: Mix background audio with speech.

**Responsibilities**:
- Load background audio presets
- Mix speech + background using ffmpeg
- Adjust volume levels
- Apply fade in/out effects

**Available Presets**:
- office, cafe, nature, rain, phone, crowd

## Data Flow

### Voice Interaction Data Flow

```
┌──────────────┐
│ User Request │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ runVoiceInteraction │
└──────┬──────────────┘
       │
       ├─────► 1. Generate TTS
       │           ↓
       │       Play Audio
       │           ↓
       │       Wait 1s
       │
       ├─────► 2. Start Recording
       │           ↓
       │       Audio Stream
       │           ↓
       ├─────► 3. Start STT Streaming
       │           ↓
       │       ┌──────────────────┐
       │       │  Speech Events   │
       │       ├──────────────────┤
       │       │ • SPEECH_BEGIN   │
       │       │ • Interim Result │
       │       │ • Final Result   │
       │       │ • SPEECH_END     │
       │       └──────────────────┘
       │           ↓
       └─────► 4. Return Result
                   {
                     transcript,
                     confidence,
                     duration,
                     audioProcessed,
                     maxVolume,
                     processingTime
                   }
```

### Streaming STT Data Flow

```
Audio Chunks ──►  writeAudio()
                       │
                       ▼
              ┌─────────────────┐
              │ recognizeStream │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   Speech Event    Interim      Final Result
      (VAD)        Result       (isFinal=true)
         │             │             │
         ▼             ▼             ▼
   onSpeechStart  onResult     onResult
   onSpeechEnd    callback     callback
```

## Design Patterns

### 1. Service Layer Pattern

Each major functionality is encapsulated in a service class:
- Single responsibility
- Clear interfaces
- Dependency injection
- Testable design

### 2. Callback Pattern

Streaming STT uses callbacks for real-time events:
```typescript
startStreaming(
  config,
  onResult,      // Transcription results
  onSpeechStart, // Speech detected
  onSpeechEnd,   // Speech ended
  onError        // Error handling
)
```

### 3. Factory Pattern

Services provide static factory methods:
```typescript
VoiceTestService.create(apiKey)
AIComparisonService.create(provider)
VoiceBotTestService.create(configPath)
```

### 4. Observer Pattern

Event-driven architecture for audio streams and speech events.

### 5. Strategy Pattern

Multiple authentication strategies:
- Service account
- API key fallback

### 6. Resource Management Pattern

All services implement cleanup methods:
```typescript
cleanup(): void {
  // Release resources
  // Close connections
  // Clear state
}
```

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | TypeScript 5.x | Type safety, modern JavaScript |
| Runtime | Node.js 18+ | JavaScript runtime |
| Package Manager | npm | Dependency management |

### Google Cloud Services

| Service | Purpose |
|---------|---------|
| Speech-to-Text Streaming API | Real-time transcription |
| Text-to-Speech API (via Neurolink) | Speech synthesis |
| Gemini AI | Semantic evaluation |

### Audio Processing

| Library | Purpose |
|---------|---------|
| naudiodon | Native audio recording |
| node-record-lpcm16 | Fallback recording |
| ffmpeg | Audio mixing |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| TypeScript Compiler | Type checking & transpilation |

## Security Architecture

### Authentication Flow

```
Service Initialization
        │
        ▼
Check GOOGLE_APPLICATION_CREDENTIALS
        │
   ┌────┴────┐
   │         │
   YES       NO
   │         │
   ▼         ▼
Service   API Key
Account   Auth
   │         │
   └────┬────┘
        │
        ▼
Initialize Google Client
```

### Input Validation

All user inputs go through validation:
1. Type checking
2. Range validation
3. Sanitization (remove control characters)
4. Path traversal prevention
5. Injection prevention

### File Security

- Secure file path handling
- No arbitrary file access
- Temp file cleanup
- Path normalization

## Performance Considerations

### Streaming Optimization

- **Chunked Processing**: Audio processed in 8KB chunks
- **Buffering**: Minimal latency with streaming API
- **Resource Cleanup**: Immediate cleanup after completion

### Memory Management

- **No Memory Leaks**: Proper event listener cleanup
- **Stream Closing**: All streams properly closed
- **Timeout Management**: All timeouts cleared

### Error Recovery

- **Retry Logic**: Exponential backoff for API calls
- **Graceful Degradation**: Fallback audio backends
- **Error Boundaries**: Isolated error handling per service

## Scalability

### Concurrent Sessions

Each service instance is independent:
- No shared state between instances
- Thread-safe audio processing
- Isolated Google Cloud connections

### Resource Limits

Configurable limits:
- Max recording duration
- Silence timeout
- Speech timeout
- API retry attempts

## Extension Points

### Adding New Services

1. Create service class in `src/services/`
2. Define TypeScript interfaces in `src/types/`
3. Add to exports in `src/index.ts`
4. Document in API.md

### Custom Audio Backends

Implement `AudioRecordingService` interface:
```typescript
interface AudioBackend {
  startRecording(config): AudioSession
  stopRecording(): void
  checkSupport(): Promise<AudioSupport>
}
```

### Custom AI Providers

Implement `AIProvider` interface:
```typescript
interface AIProvider {
  compareResponses(input): Promise<AIResponse>
  validate(): Promise<boolean>
}
```

---

**Last Updated**: 2025-11-17
**Version**: 2.0.0
