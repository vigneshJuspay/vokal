# Testing Guide

This guide covers testing strategies and best practices for Vokal.

## Test Structure

```
test/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── fixtures/         # Test data and fixtures
└── helpers/          # Test utilities
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Writing Tests

### Unit Tests

Test individual functions and classes in isolation.

**Example: Testing Audio Mixer**

```typescript
import { mixAudio } from '../src/services/audio-mixer';
import { readFileSync } from 'fs';

describe('AudioMixer', () => {
  let testAudio: Buffer;
  
  beforeEach(() => {
    testAudio = readFileSync('test/fixtures/test-audio.wav');
  });

  it('should mix audio with background noise', async () => {
    const result = await mixAudio({
      sourceAudio: testAudio,
      backgroundNoise: 'cafe-ambience.wav',
      noiseLevel: 0.3
    });
    
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should throw error for invalid noise level', async () => {
    await expect(mixAudio({
      sourceAudio: testAudio,
      backgroundNoise: 'cafe-ambience.wav',
      noiseLevel: 1.5
    })).rejects.toThrow('Noise level must be between 0 and 1');
  });

  it('should handle missing background noise file', async () => {
    await expect(mixAudio({
      sourceAudio: testAudio,
      backgroundNoise: 'nonexistent.wav',
      noiseLevel: 0.3
    })).rejects.toThrow('Background noise file not found');
  });
});
```

### Integration Tests

Test interactions between multiple components.

**Example: Testing STT Handler Manager**

```typescript
import { STTHandlerManager } from '../src/providers/stt-handler-manager';
import { registerSTTHandler } from '../src/providers/stt-registry';

describe('STTHandlerManager Integration', () => {
  beforeEach(() => {
    // Register mock handler
    registerSTTHandler('mock-stt', {
      async transcribe(audio: Buffer) {
        return 'mock transcription';
      },
      supports: {
        streaming: false,
        languageCodes: ['en-US'],
        encoding: ['LINEAR16']
      }
    });
  });

  it('should transcribe audio using registered handler', async () => {
    const manager = new STTHandlerManager('mock-stt');
    const audio = Buffer.from('test audio data');
    
    const result = await manager.transcribe(audio);
    
    expect(result).toBe('mock transcription');
  });

  it('should throw error for unregistered handler', () => {
    expect(() => {
      new STTHandlerManager('nonexistent-handler');
    }).toThrow('STT handler not found');
  });
});
```

### End-to-End Tests

Test complete workflows from CLI to results.

**Example: Testing Voice Bot Test**

```typescript
import { runVoiceTest } from '../src/services/voice-test';
import { readFileSync } from 'fs';

describe('Voice Bot Test E2E', () => {
  it('should run complete voice bot test', async () => {
    const config = {
      sttProvider: 'google-ai',
      scenarios: [
        {
          prompt: 'Hello, how can I help you?',
          expectedResponse: 'I need assistance with my order'
        }
      ],
      audioSettings: {
        sampleRate: 16000,
        channels: 1,
        encoding: 'LINEAR16'
      }
    };

    const result = await runVoiceTest(config);

    expect(result.summary.total).toBe(1);
    expect(result.scenarios[0].transcription).toBeDefined();
    expect(result.scenarios[0].evaluation).toBeDefined();
  }, 30000); // 30 second timeout for E2E test
});
```

## Mocking

### Mocking STT Providers

```typescript
import { jest } from '@jest/globals';

const mockSTTHandler = {
  transcribe: jest.fn().mockResolvedValue('mocked transcription'),
  supports: {
    streaming: true,
    languageCodes: ['en-US'],
    encoding: ['LINEAR16']
  }
};
```

### Mocking Audio Recording

```typescript
import { jest } from '@jest/globals';

jest.mock('../src/services/audio-recording', () => ({
  startRecording: jest.fn().mockReturnValue({
    stop: jest.fn().mockResolvedValue(Buffer.from('mock audio'))
  })
}));
```

### Mocking AI Comparison

```typescript
import { jest } from '@jest/globals';

jest.mock('../src/services/ai-comparison', () => ({
  compareResponses: jest.fn().mockResolvedValue({
    score: 0.95,
    passed: true,
    details: {
      semanticSimilarity: 0.95,
      reasoning: 'Responses are very similar'
    }
  })
}));
```

## Test Fixtures

### Audio Fixtures

Create sample audio files for testing:

```typescript
// test/fixtures/audio-fixtures.ts
import { writeFileSync } from 'fs';
import { join } from 'path';

export function createTestAudio(duration: number = 1000): Buffer {
  // Generate simple PCM audio data
  const sampleRate = 16000;
  const samples = (sampleRate * duration) / 1000;
  const buffer = Buffer.alloc(samples * 2); // 16-bit audio
  
  // Fill with sine wave
  for (let i = 0; i < samples; i++) {
    const value = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    const sample = Math.round(value * 32767);
    buffer.writeInt16LE(sample, i * 2);
  }
  
  return buffer;
}
```

### Configuration Fixtures

```typescript
// test/fixtures/config-fixtures.ts
export const basicConfig = {
  sttProvider: 'google-ai',
  scenarios: [
    {
      prompt: 'Test prompt',
      expectedResponse: 'Test response'
    }
  ]
};

export const advancedConfig = {
  sttProvider: 'google-ai',
  scenarios: [
    {
      prompt: 'Complex test',
      expectedResponse: 'Complex response',
      backgroundNoise: {
        type: 'cafe',
        level: 0.3
      }
    }
  ],
  audioSettings: {
    sampleRate: 16000,
    channels: 1,
    encoding: 'LINEAR16'
  },
  evaluationSettings: {
    model: 'gpt-4',
    threshold: 0.8
  }
};
```

## Test Helpers

### Setup Helpers

```typescript
// test/helpers/setup.ts
import { registerSTTHandler } from '../../src/providers/stt-registry';

export function setupMockProviders() {
  registerSTTHandler('mock-stt', {
    async transcribe(audio: Buffer) {
      return 'mock transcription';
    },
    supports: {
      streaming: false,
      languageCodes: ['en-US'],
      encoding: ['LINEAR16']
    }
  });
}

export function cleanupMockProviders() {
  // Cleanup logic
}
```

### Assertion Helpers

```typescript
// test/helpers/assertions.ts
export function expectValidTestResult(result: any) {
  expect(result).toHaveProperty('scenarios');
  expect(result).toHaveProperty('summary');
  expect(result.summary).toHaveProperty('total');
  expect(result.summary).toHaveProperty('passed');
  expect(result.summary).toHaveProperty('failed');
}

export function expectValidAudioBuffer(buffer: Buffer) {
  expect(buffer).toBeInstanceOf(Buffer);
  expect(buffer.length).toBeGreaterThan(0);
}
```

## Performance Testing

### Benchmarking

```typescript
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should transcribe audio within acceptable time', async () => {
    const audio = createTestAudio(5000); // 5 second audio
    
    const start = performance.now();
    await transcribeAudio(audio);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10000); // Should complete in 10 seconds
  });
});
```

### Memory Testing

```typescript
describe('Memory Tests', () => {
  it('should not leak memory during audio processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process multiple audio files
    for (let i = 0; i < 100; i++) {
      const audio = createTestAudio();
      await processAudio(audio);
    }
    
    // Force garbage collection
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Don't rely on test execution order

### 2. Clear Test Names

```typescript
// Good
it('should throw error when audio file is missing', async () => {});

// Bad
it('test1', async () => {});
```

### 3. Test One Thing

```typescript
// Good
it('should validate sample rate', () => {});
it('should validate channel count', () => {});

// Bad
it('should validate all audio settings', () => {});
```

### 4. Use Descriptive Assertions

```typescript
// Good
expect(result.score).toBeGreaterThan(0.8);

// Bad
expect(result.score > 0.8).toBe(true);
```

### 5. Handle Async Properly

```typescript
// Good
it('should transcribe audio', async () => {
  await expect(transcribe(audio)).resolves.toBeDefined();
});

// Bad
it('should transcribe audio', () => {
  transcribe(audio); // Promise not awaited
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --testNamePattern="should mix audio"
```

### Debug in VS Code

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

### Verbose Output

```bash
npm test -- --verbose
```

## Next Steps

- [Contributing Guide](contributing.md) - Contribution guidelines
- [Architecture](architecture.md) - System architecture
- [API Reference](../api/overview.md) - API documentation
