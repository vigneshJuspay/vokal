/**
 * Voice Bot Configuration Types
 * Defines the structure for voice bot conversation configurations
 */

export type VoiceBotConfig = {
  /** Conversation suite metadata */
  metadata: TestMetadata;
  /** Global conversation settings */
  settings: TestSettings;
  /** Array of test questions */
  questions: TestQuestion[];
};

export type TestMetadata = {
  /** Name of the test suite */
  name: string;
  /** Version of the test configuration */
  version: string;
  /** Description of what this test suite covers */
  description: string;
  /** Author or team responsible */
  author: string;
  /** Creation date */
  createdAt: string;
  /** Tags for categorization */
  tags: string[];
};

export type TestSettings = {
  /** Default language for speech recognition */
  defaultLanguage: string;
  /** Default voice for TTS responses */
  defaultVoice: string;
  /** Maximum recording duration in milliseconds (safety limit) */
  recordingDuration: number;
  /** Voice activity detection settings */
  vadSettings: {
    /** Volume threshold for silence detection (0.0 to 1.0) */
    silenceThreshold: number;
    /** How long silence before stopping recording (ms) */
    silenceDuration: number;
    /** Timeout for initial speech detection (ms) */
    speechTimeout: number;
  };
  /** TTS provider for text-to-speech (supports any Neurolink provider: 'google-ai', 'openai', 'elevenlabs', 'azure', etc.) */
  ttsProvider?: string;
  /** STT provider for speech-to-text (supports any Neurolink provider: 'google-ai', 'deepgram', 'assemblyai', etc.) */
  sttProvider?: string;
  /** AI provider for response comparison (supports any Neurolink provider: 'google-ai', 'openai', 'anthropic', 'bedrock', etc.) */
  aiProvider?: string;
  /** Minimum score threshold for passing (0 or 1) */
  passingScore: number;
  /** Maximum retries per question */
  maxRetries: number;
  /** Delay between questions in milliseconds */
  questionDelay: number;
  /** Whether to play questions via TTS */
  playQuestions: boolean;
  /** Background sound for questions (optional) */
  backgroundSound?: string;
  /** Background volume (0.0 to 1.0) */
  backgroundVolume: number;
};

export type TestQuestion = {
  /** Unique identifier for the question */
  id: string;
  /** The question text to be asked */
  question: string;
  /** What the question is trying to assess or validate */
  intent: string;
  /** Key information that should be present in a correct response */
  expectedElements: string[];
  /** Additional context for AI comparison */
  context?: string;
  /** Example of a good response (for reference, not for pattern matching) */
  sampleResponse?: string;
  /** Question-specific settings that override defaults */
  settings?: Partial<QuestionSettings>;
  /** Tags for this specific question */
  tags?: string[];
  /** Weight/importance of this question (1-10) */
  weight?: number;
  /** Whether this question is required for test completion */
  required?: boolean;
};

export type QuestionSettings = {
  /** Language override for this question */
  language: string;
  /** Voice override for this question */
  voice: string;
  /** Recording duration override */
  recordingDuration: number;
  /** Custom passing score for this question */
  passingScore: number;
  /** Custom background sound */
  backgroundSound?: string;
  /** Custom background volume */
  backgroundVolume: number;
  /** Whether to play this question via TTS */
  playQuestion: boolean;
};

export type TestResult = {
  /** Test execution metadata */
  metadata: TestExecutionMetadata;
  /** Overall test results */
  summary: TestSummary;
  /** Individual question results */
  questionResults: QuestionResult[];
  /** Performance metrics */
  performance: PerformanceMetrics;
};

export type TestExecutionMetadata = {
  /** Test configuration used */
  configName: string;
  /** When the test was executed */
  executedAt: string;
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Test environment info */
  environment: {
    platform: string;
    nodeVersion: string;
    voiceTestVersion: string;
  };
};

export type TestSummary = {
  /** Total number of questions */
  totalQuestions: number;
  /** Number of questions attempted */
  questionsAttempted: number;
  /** Number of questions passed */
  questionsPassed: number;
  /** Number of questions failed */
  questionsFailed: number;
  /** Number of questions skipped */
  questionsSkipped: number;
  /** Overall pass percentage */
  passRate: number;
  /** Average score across all questions */
  averageScore: number;
  /** Whether the overall test passed */
  testPassed: boolean;
};

export type QuestionResult = {
  /** Question ID */
  questionId: string;
  /** Original question text */
  question: string;
  /** Question intent */
  intent: string;
  /** Expected elements */
  expectedElements: string[];
  /** User's actual response (transcribed) */
  actualResponse: string;
  /** AI comparison result */
  comparison: {
    isMatch: boolean;
    confidence: number;
    score: number;
    analysis: string;
    strengths: string[];
    improvements: string[];
  };
  /** Timing information */
  timing: {
    questionPlayTime: number;
    recordingTime: number;
    transcriptionTime: number;
    analysisTime: number;
    totalTime: number;
  };
  /** Number of retries taken */
  retries: number;
  /** Whether this question passed */
  passed: boolean;
  /** Any errors encountered */
  errors?: string[];
};

export type PerformanceMetrics = {
  /** TTS generation times */
  ttsMetrics: {
    averageGenerationTime: number;
    totalGenerationTime: number;
    questionsWithTTS: number;
  };
  /** STT transcription times */
  sttMetrics: {
    averageTranscriptionTime: number;
    totalTranscriptionTime: number;
    totalRecordingTime: number;
  };
  /** AI analysis times */
  aiMetrics: {
    averageAnalysisTime: number;
    totalAnalysisTime: number;
    provider: string;
  };
  /** Overall system performance */
  systemMetrics: {
    memoryUsage: number;
    cpuUsage?: number;
    errorRate: number;
  };
};

/**
 * JSON Schema for validation
 */
export const TEST_CONFIG_SCHEMA = {
  type: 'object',
  required: ['metadata', 'settings', 'questions'],
  properties: {
    metadata: {
      type: 'object',
      required: ['name', 'version', 'description', 'author', 'createdAt'],
      properties: {
        name: { type: 'string', minLength: 1 },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        description: { type: 'string', minLength: 1 },
        author: { type: 'string', minLength: 1 },
        createdAt: { type: 'string', format: 'date-time' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    settings: {
      type: 'object',
      required: [
        'defaultLanguage',
        'defaultVoice',
        'recordingDuration',
        'vadSettings',
        'passingScore',
      ],
      properties: {
        defaultLanguage: { type: 'string', pattern: '^[a-z]{2}-[A-Z]{2}$' },
        defaultVoice: { type: 'string', minLength: 1 },
        recordingDuration: { type: 'number', minimum: 5000, maximum: 60000 },
        vadSettings: {
          type: 'object',
          required: ['silenceThreshold', 'silenceDuration', 'speechTimeout'],
          properties: {
            silenceThreshold: { type: 'number', minimum: 0.001, maximum: 0.1 },
            silenceDuration: { type: 'number', minimum: 500, maximum: 10000 },
            speechTimeout: { type: 'number', minimum: 3000, maximum: 30000 },
          },
        },
        ttsProvider: { type: 'string' },
        sttProvider: { type: 'string' },
        aiProvider: { type: 'string' },
        passingScore: { type: 'number', minimum: 1, maximum: 10 },
        maxRetries: { type: 'number', minimum: 0, maximum: 5 },
        questionDelay: { type: 'number', minimum: 0, maximum: 10000 },
        playQuestions: { type: 'boolean' },
        backgroundSound: { type: 'string' },
        backgroundVolume: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'question', 'intent', 'expectedElements'],
        properties: {
          id: { type: 'string', minLength: 1 },
          question: { type: 'string', minLength: 1 },
          intent: { type: 'string', minLength: 1 },
          expectedElements: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
          context: { type: 'string' },
          sampleResponse: { type: 'string' },
          settings: { type: 'object' },
          tags: { type: 'array', items: { type: 'string' } },
          weight: { type: 'number', minimum: 1, maximum: 10 },
          required: { type: 'boolean' },
        },
      },
    },
  },
} as const;

/**
 * Sample test configuration for reference
 */
export const SAMPLE_TEST_CONFIG: VoiceBotConfig = {
  metadata: {
    name: 'Customer Service Bot Test',
    version: '1.0.0',
    description: 'Tests basic customer service interactions',
    author: 'Voice Test Team',
    createdAt: new Date().toISOString(),
    tags: ['customer-service', 'basic', 'english'],
  },
  settings: {
    defaultLanguage: 'en-US',
    defaultVoice: 'en-US-Neural2-D',
    recordingDuration: 30000, // 30 second safety limit
    vadSettings: {
      silenceThreshold: 0.02, // Adjust based on environment noise
      silenceDuration: 2000, // 2 seconds of silence to stop
      speechTimeout: 15000, // 10 seconds to start speaking
    },
    ttsProvider: 'google-ai', // Can be 'google-ai', 'openai', 'elevenlabs', 'azure', etc.
    sttProvider: 'google-ai', // Can be 'google-ai', 'deepgram', 'assemblyai', etc.
    aiProvider: 'google-ai', // Can be 'google-ai', 'openai', 'anthropic', 'bedrock', etc.
    passingScore: 7,
    maxRetries: 2,
    questionDelay: 2000,
    playQuestions: true,
    backgroundSound: 'office',
    backgroundVolume: 0.3,
  },
  questions: [
    {
      id: 'greeting',
      question: 'Hello! How can I help you today?',
      intent:
        'User should respond with a greeting and indicate they need help or have a question',
      expectedElements: [
        'Polite greeting (hello, hi, good morning, etc.)',
        'Indication of needing help or having a question',
        'May mention general topic like account, billing, technical issue',
      ],
      context:
        'Customer service greeting - checking if user can respond appropriately to open-ended help offer',
      sampleResponse: 'Hello, I need help with my account',
      weight: 8,
      required: true,
      tags: ['greeting', 'help-request'],
    },
    {
      id: 'account-info',
      question: 'Can you please provide your account number?',
      intent: 'User should provide a specific account number or identifier',
      expectedElements: [
        'Account number or ID',
        'Numeric or alphanumeric identifier',
        'Clear indication this is their account reference',
      ],
      context:
        'Account identification - user should provide specific account details',
      sampleResponse: 'My account number is 12345',
      weight: 10,
      required: true,
      tags: ['account', 'identification', 'data-provision'],
    },
    {
      id: 'problem-description',
      question: 'What seems to be the issue with your account?',
      intent:
        "User should describe a specific problem or issue they're experiencing",
      expectedElements: [
        'Clear description of a problem or issue',
        'Relates to account access, functionality, or services',
        'Specific enough to understand the nature of the problem',
      ],
      context:
        'Problem identification - user should articulate their specific issue clearly',
      sampleResponse: "I can't log into my account",
      weight: 9,
      required: true,
      tags: ['problem', 'description', 'troubleshooting'],
    },
  ],
};
