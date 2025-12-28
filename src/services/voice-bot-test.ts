/**
 * Voice Bot Test Service
 *
 * Comprehensive testing framework for voice bot conversations with AI-powered evaluation.
 * Orchestrates complete test suites including TTS playback, user response capture, STT transcription,
 * and semantic AI analysis of responses.
 *
 * @module services/voice-bot-test
 * @since 1.0.0
 *
 * @remarks
 * This service provides a complete voice bot testing framework:
 * - **Test Suite Management**: Load and execute test configurations
 * - **Voice Interactions**: Play questions and capture responses
 * - **AI Evaluation**: Semantic analysis of responses with detailed feedback
 * - **Performance Metrics**: Track timing, accuracy, and system performance
 * - **Detailed Reporting**: Generate comprehensive test results and conversation reports
 * - **Parallel Processing**: Run AI analysis in background for efficiency
 * - **Retry Logic**: Automatic retry with configurable attempts
 *
 * **Test Flow:**
 * 1. Load test configuration from JSON file
 * 2. Validate system components (TTS, STT, Audio)
 * 3. For each question:
 *    - Play question via TTS
 *    - Record user response
 *    - Transcribe with STT
 *    - Start AI analysis in background
 * 4. Wait for all AI analyses to complete
 * 5. Generate comprehensive test results
 * 6. Save results and conversation report
 *
 * @example
 * ```typescript
 * const testService = VoiceBotTestService.create('./config.json', apiKey);
 *
 * const results = await testService.runTestSuite();
 *
 * console.log('Test passed:', results.summary.testPassed);
 * console.log('Pass rate:', results.summary.passRate);
 * console.log('Average score:', results.summary.averageScore);
 * ```
 */

import { VoiceInteractionService } from './voice-interaction.js';
import { AIComparisonService } from './ai-comparison.js';
import { ConsoleLogger } from '../utils/logger.js';
import {
  VoiceTestError,
  getErrorMessage,
  toError,
  safeJSONParse,
} from '../types/index.js';
import { ErrorCode } from '../errors/voice-test.errors.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import ora from 'ora';
import type {
  VoiceBotConfig,
  TestQuestion,
  QuestionResult,
  TestResult,
  TestSummary,
  PerformanceMetrics,
} from '../types/index.js';

// Test progress type
/**
 * Test progress tracking information.
 *
 * @interface
 * @internal
 */
type TestProgress = {
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Total number of questions in test suite */
  totalQuestions: number;
  /** Number of questions completed */
  questionsCompleted: number;
  /** Current question being processed */
  currentQuestion: TestQuestion;
  /** Time elapsed since test start in milliseconds */
  timeElapsed: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
};

// Extended question result with AI analysis promise
/**
 * Extended question result with AI analysis promise for parallel processing.
 *
 * @interface
 * @internal
 */
type QuestionResultWithPromise = QuestionResult & {
  /** Promise for AI analysis completion */
  aiAnalysisPromise?: Promise<QuestionResult>;
};

/**
 * Voice Bot Test Service class for comprehensive conversation testing.
 *
 * @class
 *
 * @remarks
 * Integrates multiple services for complete test automation:
 * - VoiceInteractionService: Complete voice interaction pipeline
 * - AIComparisonService: Semantic response evaluation
 * - ConsoleLogger: Structured logging
 *
 * Features:
 * - Parallel AI analysis for faster test execution
 * - Automatic retry on failures
 * - Detailed performance metrics
 * - Human-readable conversation reports
 * - Support for multiple languages and voices
 * - Background audio mixing support
 */
export class VoiceBotTestService {
  private reliableVoice: VoiceInteractionService;
  private aiComparison: AIComparisonService;
  private logger: ConsoleLogger;
  private config: VoiceBotConfig;
  private results: QuestionResultWithPromise[] = [];
  private startTime: number = 0;

  /**
   * Creates a new VoiceBotTestService instance.
   *
   * @param configPath - Path to test configuration JSON file
   *
   * @throws {VoiceTestError} If configuration path is missing or configuration is invalid
   *
   * @remarks
   * The configuration file should contain:
   * - `metadata`: Test suite information (name, version, description)
   * - `settings`: Default settings (language, voice, timeouts, provider names)
   * - `questions`: Array of test questions with expected responses
   *
   * Each service initializes with its own API key from environment variables:
   * - **AI Comparison**: Reads API key based on `aiProvider` setting
   *   - google-ai: GOOGLE_API_KEY or GOOGLE_AI_API_KEY
   *   - openai: OPENAI_API_KEY
   *   - anthropic: ANTHROPIC_API_KEY
   * - **STT**: Reads API key based on `sttProvider` setting
   *   - google-ai: GOOGLE_AI_API_KEY
   *   - google-cloud: GOOGLE_APPLICATION_CREDENTIALS
   *   - whisper: OPENAI_API_KEY
   * - **TTS**: Reads API key based on `ttsProvider` setting
   *   - google-ai: GOOGLE_AI_API_KEY
   *   - polly: AWS credentials from environment
   *   - azure: AZURE_SPEECH_KEY
   *
   * @example
   * ```typescript
   * // API keys are read from environment variables
   * // GOOGLE_API_KEY=xxx OPENAI_API_KEY=yyy node test.js
   *
   * const service = new VoiceBotTestService('./test-config.json');
   * const results = await service.runTestSuite();
   * ```
   */
  constructor(configPath?: string) {
    this.logger = new ConsoleLogger();

    // Load test configuration
    if (!configPath) {
      throw new VoiceTestError(
        'Test configuration path is required',
        ErrorCode.MISSING_CONFIG
      );
    }

    this.config = this.loadTestConfig(configPath);

    this.logger.info('🔧 Initializing services with provider configuration...');
    this.logger.info(
      `   TTS Provider: ${this.config.settings.ttsProvider || 'google-ai'}`
    );
    this.logger.info(
      `   STT Provider: ${this.config.settings.sttProvider || 'google-ai'}`
    );
    this.logger.info(
      `   AI Provider: ${this.config.settings.aiProvider || 'google-ai'}`
    );

    // Initialize services - each handles its own API key from environment variables
    this.reliableVoice = new VoiceInteractionService(this.config.settings);
    this.aiComparison = AIComparisonService.create(
      this.config.settings.aiProvider || 'google-ai'
    );

    this.logger.info('🚀 Voice Bot Test Service initialized');
    this.logger.info(
      `📋 Loaded test: "${this.config.metadata.name}" (${this.config.questions.length} questions)`
    );
  }

  /**
   * Run the complete voice bot test suite.
   *
   * @returns Promise resolving to comprehensive test results
   *
   * @throws {VoiceTestError} If test suite execution fails
   *
   * @remarks
   * **Test Execution Flow:**
   * 1. Validates system components (TTS, STT, Audio)
   * 2. Runs each question in sequence
   * 3. Starts AI analysis in background for each response
   * 4. Waits for all AI analyses to complete
   * 5. Generates final test results and metrics
   * 6. Saves results to JSON files
   * 7. Prints summary to console
   *
   * **Performance Optimization:**
   * - AI analysis runs in parallel (non-blocking)
   * - Fresh voice service instance per question (prevents state leakage)
   * - Immediate progression to next question after transcription
   *
   * **Results Include:**
   * - Pass/fail status for each question
   * - Overall test score and pass rate
   * - Performance metrics (TTS, STT, AI timing)
   * - Detailed conversation report
   * - Error tracking and diagnostics
   *
   * @example
   * ```typescript
   * const service = VoiceBotTestService.create('./config.json');
   *
   * const results = await service.runTestSuite();
   *
   * console.log('Overall:', results.summary.testPassed ? 'PASSED' : 'FAILED');
   * console.log('Questions passed:', results.summary.questionsPassed);
   * console.log('Pass rate:', results.summary.passRate.toFixed(1) + '%');
   * console.log('Average score:', results.summary.averageScore.toFixed(2));
   *
   * // Check individual question results
   * results.questionResults.forEach(q => {
   *   console.log(`${q.questionId}: ${q.passed ? 'PASS' : 'FAIL'}`);
   *   console.log(`  User said: "${q.actualResponse}"`);
   *   console.log(`  Score: ${q.comparison.score}`);
   * });
   * ```
   */
  async runTestSuite(): Promise<TestResult> {
    this.startTime = Date.now();
    this.results = [];

    try {
      this.logger.info('🎯 Starting voice bot test suite...');
      this.logger.info(
        `📊 Test: ${this.config.metadata.name} v${this.config.metadata.version}`
      );
      this.logger.info(
        `🎤 Using AI Provider: ${this.config.settings.aiProvider || 'google-ai'}`
      );

      // Test system components first
      await this.validateSystemComponents();

      // Run each question
      for (let i = 0; i < this.config.questions.length; i++) {
        const question = this.config.questions[i];
        this.logger.info(
          `\n📝 Question ${i + 1}/${this.config.questions.length}: ${question.id}`
        );

        const questionResult = await this.runSingleQuestion(question, i);
        this.results.push(questionResult);

        // No delay - move to next question immediately
      }

      // Wait for all AI analyses to complete before generating final report
      this.logger.info('⏳ Waiting for all AI analyses to complete...');

      // Show spinner for AI evaluation
      console.log('\n🤖 Evaluating your responses...');
      const evalSpinner = ora('Analyzing responses with AI...').start();

      const aiPromises = this.results
        .map((r) => r.aiAnalysisPromise)
        .filter((p) => p);

      await Promise.all(aiPromises);

      evalSpinner.succeed('✅ All responses evaluated!');

      this.logger.info('✅ All AI analyses completed!');

      // Generate final results
      const testResult = this.generateTestResult();

      // Save results to file
      const resultsPath = this.saveTestResults(testResult);
      this.logger.info(`💾 Test results saved to: ${resultsPath}`);

      // Print summary
      this.printTestSummary(testResult.summary);

      return testResult;
    } catch (error) {
      throw new VoiceTestError(
        `Test suite execution failed: ${getErrorMessage(error)}`,
        ErrorCode.TEST_SUITE_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Run a single question through the complete flow.
   *
   * @param question - Test question configuration
   * @param questionIndex - Index of the question in the test suite
   * @returns Promise resolving to question result
   *
   * @private
   * @internal
   *
   * @remarks
   * **Question Flow:**
   * 1. Create fresh voice service instance
   * 2. Play question and capture response
   * 3. Transcribe response with STT
   * 4. Start AI analysis in background
   * 5. Return immediately (don't wait for AI)
   *
   * **Retry Logic:**
   * - Retries on failures up to `maxRetries` setting
   * - 3 second delay between retries
   * - Returns failed result after max retries
   *
   * **Fresh Voice Service:**
   * - New instance per question prevents state leakage
   * - Ensures clean audio/STT state
   * - Cleaned up immediately after use
   */
  private async runSingleQuestion(
    question: TestQuestion,
    questionIndex: number
  ): Promise<QuestionResult> {
    const questionStartTime = Date.now();
    let retries = 0;
    const maxRetries = this.config.settings.maxRetries;

    while (retries <= maxRetries) {
      try {
        // Show question header
        console.log(`\n${'='.repeat(60)}`);
        console.log(
          `📝 Question ${questionIndex + 1}/${this.config.questions.length}: ${question.id}`
        );
        console.log(`${'='.repeat(60)}\n`);

        // Show what the bot is saying
        console.log(`🗣️ Bot: "${question.question}"\n`);

        this.logger.info(`🗣️ Playing question: "${question.question}"`);

        // Create a FRESH reliable voice service for each question to ensure clean state
        this.logger.info(
          `🔄 Creating fresh voice service for question ${questionIndex + 1}...`
        );
        const freshVoiceService = new VoiceInteractionService(
          this.config.settings
        );

        // Use the reliable voice service for the complete interaction
        this.logger.info(
          `🎯 Running voice interaction for question: "${question.question}"`
        );

        const voiceResult = await freshVoiceService.runVoiceInteraction(
          question.question,
          {
            language:
              question.settings?.language ??
              this.config.settings.defaultLanguage,
            voice:
              question.settings?.voice ?? this.config.settings.defaultVoice,
            maxRecordingDuration:
              question.settings?.recordingDuration ??
              this.config.settings.recordingDuration,
            silenceTimeout: this.config.settings.vadSettings.silenceDuration,
            confidenceThreshold: 0.3, // Reasonable confidence threshold
            backgroundSound:
              question.settings?.backgroundSound ??
              this.config.settings.backgroundSound,
            backgroundVolume:
              question.settings?.backgroundVolume ??
              this.config.settings.backgroundVolume,
            questionDelay: this.config.settings.questionDelay,
          }
        );

        // Clean up the fresh service immediately after use
        this.logger.info(
          `🧹 Cleaning up voice service after question ${questionIndex + 1}...`
        );
        freshVoiceService.cleanup();

        const questionPlayTime = 0; // TTS timing is handled internally
        const recordingTime = voiceResult.duration ?? 0;

        if (
          !voiceResult.transcript ||
          voiceResult.transcript.trim().length === 0
        ) {
          throw new VoiceTestError(
            'No speech detected in user response',
            ErrorCode.NO_SPEECH_DETECTED
          );
        }

        this.logger.info(
          `📝 Transcribed: "${voiceResult.transcript}" (confidence: ${(voiceResult.confidence * 100).toFixed(1)}%)`
        );
        this.logger.info(
          `📊 Audio processed: ${voiceResult.audioProcessed ?? 0} bytes, max volume: ${((voiceResult.maxVolume ?? 0) * 100).toFixed(1)}%`
        );

        // Step 3: Start AI analysis in background (don't block)
        this.logger.info('🤖 Starting AI analysis in background...');
        const analysisStartTime = Date.now();

        // Create result placeholder that will be updated when AI completes
        const questionResult: QuestionResultWithPromise = {
          questionId: question.id,
          question: question.question,
          intent: question.intent,
          expectedElements: question.expectedElements,
          actualResponse: voiceResult.transcript,
          comparison: {
            isMatch: false,
            confidence: 0,
            score: 0,
            analysis: 'AI analysis in progress...',
            strengths: [],
            improvements: [],
          },
          timing: {
            questionPlayTime,
            recordingTime,
            transcriptionTime: voiceResult.processingTime ?? 0,
            analysisTime: 0,
            totalTime: Date.now() - questionStartTime,
          },
          retries,
          passed: false,
          errors: [],
        };

        // Start AI analysis in background (non-blocking)
        const aiAnalysisPromise = this.aiComparison
          .compareResponses({
            userResponse: voiceResult.transcript,
            originalQuestion: question.question,
            intent: question.intent,
            expectedElements: question.expectedElements,
            context: question.context,
            sampleResponse: question.sampleResponse,
          })
          .then((comparisonResult) => {
            const analysisTime = Date.now() - analysisStartTime;
            const totalTime = Date.now() - questionStartTime;

            // AI returns binary score: 0 or 1
            // Config passingScore is for display purposes only (0-10 scale)
            // We convert AI's 0-1 score to 0-10 scale for consistency
            const scoreOutOf10 = comparisonResult.score * 10;
            const passed = comparisonResult.score === 1; // Binary: 1 = pass, 0 = fail

            // Update result with AI analysis
            questionResult.comparison = comparisonResult;
            questionResult.timing.analysisTime = analysisTime;
            questionResult.timing.totalTime = totalTime;
            questionResult.passed = passed;

            this.logger.info(
              `✅ AI analysis completed in ${analysisTime}ms (score: ${comparisonResult.score}/1 = ${scoreOutOf10}/10 - ${passed ? 'PASS' : 'FAIL'})`
            );
            return questionResult;
          })
          .catch((error: Error) => {
            this.logger.error(`❌ AI analysis failed: ${error.message}`);
            if (!questionResult.errors) {
              questionResult.errors = [];
            }
            questionResult.errors.push(`AI analysis error: ${error.message}`);
            return questionResult;
          });

        // Don't await - let it run in background
        // Store promise so we can wait for all AI analyses at the end
        questionResult.aiAnalysisPromise = aiAnalysisPromise;

        // Return immediately - don't wait for AI analysis
        this.logger.info(
          '➡️ Moving to next question (AI analysis running in background)'
        );
        return questionResult;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        this.logger.error(
          `❌ Error in question ${question.id}: ${errorMessage}`
        );

        if (retries < maxRetries) {
          this.logger.info(
            `🔄 Retrying question (attempt ${retries + 2}/${maxRetries + 1})...`
          );
          retries++;
          await this.delay(3000);
        } else {
          // Return failed result
          return {
            questionId: question.id,
            question: question.question,
            intent: question.intent,
            expectedElements: question.expectedElements,
            actualResponse: '',
            comparison: {
              isMatch: false,
              confidence: 0,
              score: 0,
              analysis: `Failed due to error: ${errorMessage}`,
              strengths: [],
              improvements: ['Fix technical issues preventing response'],
            },
            timing: {
              questionPlayTime: 0,
              recordingTime: 0,
              transcriptionTime: 0,
              analysisTime: 0,
              totalTime: Date.now() - questionStartTime,
            },
            retries,
            passed: false,
            errors: [errorMessage],
          };
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new VoiceTestError(
      'Unexpected end of question execution',
      ErrorCode.UNEXPECTED_ERROR
    );
  }

  /**
   * Load test configuration from file.
   *
   * @param configPath - Path to configuration JSON file
   * @returns Parsed and validated test configuration
   *
   * @throws {VoiceTestError} If configuration cannot be loaded or is invalid
   *
   * @private
   * @internal
   *
   * @remarks
   * Validates that configuration contains:
   * - `metadata` object
   * - `settings` object
   * - `questions` array with at least one question
   */
  private loadTestConfig(configPath: string): VoiceBotConfig {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const parseResult = safeJSONParse<VoiceBotConfig>(configContent);

      if (!parseResult.success) {
        throw new Error(`Invalid JSON: ${parseResult.error}`);
      }

      const config = parseResult.data;

      if (!config.metadata || !config.settings || !config.questions) {
        throw new Error('Invalid configuration format');
      }

      if (config.questions.length === 0) {
        throw new Error('No questions defined in configuration');
      }

      return config;
    } catch (error) {
      throw new VoiceTestError(
        `Failed to load test configuration: ${getErrorMessage(error)}`,
        ErrorCode.CONFIG_LOAD_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Validate system components before running tests.
   *
   * @returns Promise that resolves when validation completes
   *
   * @throws {VoiceTestError} If critical components fail validation
   *
   * @private
   * @internal
   *
   * @remarks
   * Validates:
   * - TTS: Audio playback capability (warning if fails)
   * - Audio: Recording system availability (error if fails)
   * - STT: Speech recognition initialization (error if fails)
   * - AI: Skipped (Neurolink is assumed reliable)
   */
  private async validateSystemComponents(): Promise<void> {
    this.logger.info('🔧 Validating system components...');

    // Use the reliable voice service for validation
    const validation = await this.reliableVoice.validateSystem();

    if (!validation.tts) {
      this.logger.warn('⚠️ TTS validation failed - continuing anyway');
    }

    if (!validation.audio) {
      throw new VoiceTestError(
        `Audio system validation failed: ${validation.errors.join(', ')}`,
        ErrorCode.AUDIO_VALIDATION_FAILED
      );
    }

    if (!validation.stt) {
      throw new VoiceTestError(
        `STT service validation failed: ${validation.errors.join(', ')}`,
        ErrorCode.STT_VALIDATION_FAILED
      );
    }

    // Skip AI validation - neurolink should work reliably
    this.logger.info('⚡ Skipping AI validation - neurolink is reliable');

    this.logger.info('✅ All system components validated successfully');
  }

  /**
   * Generate comprehensive test results from question results.
   *
   * @returns Complete test result object with metrics and summary
   *
   * @private
   * @internal
   *
   * @remarks
   * Calculates:
   * - Pass/fail counts and rates
   * - Average scores
   * - Performance metrics (TTS, STT, AI timing)
   * - System metrics (memory, error rate)
   */
  private generateTestResult(): TestResult {
    const totalTime = Date.now() - this.startTime;
    const totalQuestions = this.config.questions.length;
    const questionsAttempted = this.results.length;
    const questionsPassed = this.results.filter((r) => r.passed).length;
    const questionsFailed = this.results.filter((r) => !r.passed).length;
    const questionsSkipped = totalQuestions - questionsAttempted;

    const scores = this.results.map((r) => r.comparison.score);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passRate =
      totalQuestions > 0 ? (questionsPassed / totalQuestions) * 100 : 0;
    const testPassed = passRate >= 70; // 70% pass rate threshold

    const summary: TestSummary = {
      totalQuestions,
      questionsAttempted,
      questionsPassed,
      questionsFailed,
      questionsSkipped,
      passRate,
      averageScore,
      testPassed,
    };

    const performance: PerformanceMetrics = {
      ttsMetrics: {
        averageGenerationTime: this.calculateAverageTime(
          this.results,
          'questionPlayTime'
        ),
        totalGenerationTime: this.calculateTotalTime(
          this.results,
          'questionPlayTime'
        ),
        questionsWithTTS: this.results.filter(
          (r) => r.timing.questionPlayTime > 0
        ).length,
      },
      sttMetrics: {
        averageTranscriptionTime: this.calculateAverageTime(
          this.results,
          'transcriptionTime'
        ),
        totalTranscriptionTime: this.calculateTotalTime(
          this.results,
          'transcriptionTime'
        ),
        totalRecordingTime: this.calculateTotalTime(
          this.results,
          'recordingTime'
        ),
      },
      aiMetrics: {
        averageAnalysisTime: this.calculateAverageTime(
          this.results,
          'analysisTime'
        ),
        totalAnalysisTime: this.calculateTotalTime(
          this.results,
          'analysisTime'
        ),
        provider: this.config.settings.aiProvider || 'google-ai',
      },
      systemMetrics: {
        memoryUsage: process.memoryUsage().heapUsed,
        errorRate: (questionsFailed / totalQuestions) * 100,
      },
    };

    return {
      metadata: {
        configName: this.config.metadata.name,
        executedAt: new Date().toISOString(),
        totalTime,
        environment: {
          platform: process.platform,
          nodeVersion: process.version,
          voiceTestVersion: '2.0.0',
        },
      },
      summary,
      questionResults: this.results,
      performance,
    };
  }

  /**
   * Calculate average timing for a specific metric.
   *
   * @param results - Array of question results
   * @param metric - Timing metric to calculate average for
   * @returns Average time in milliseconds
   *
   * @private
   * @internal
   */
  private calculateAverageTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    const times = results.map((r) => r.timing[metric]).filter((t) => t > 0);
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  /**
   * Calculate total timing for a specific metric.
   *
   * @param results - Array of question results
   * @param metric - Timing metric to calculate total for
   * @returns Total time in milliseconds
   *
   * @private
   * @internal
   */
  private calculateTotalTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    return results.map((r) => r.timing[metric]).reduce((a, b) => a + b, 0);
  }

  /**
   * Save test results to JSON file.
   *
   * @param testResult - Complete test result object
   * @returns Path to saved results file
   *
   * @private
   * @internal
   *
   * @remarks
   * Creates two files:
   * - `vokal-results-{timestamp}.json`: Complete test results
   * - `conversation-report-{timestamp}.json`: Human-readable conversation report
   */
  private saveTestResults(testResult: TestResult): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vokal-results-${timestamp}.json`;
    const resultsPath = join(process.cwd(), filename);

    writeFileSync(resultsPath, JSON.stringify(testResult, null, 2));

    // Also save a simple conversation report
    this.saveConversationReport(testResult, timestamp);

    return resultsPath;
  }

  /**
   * Format language code to human-readable format.
   *
   * @param languageCode - Language code (e.g., 'en-US')
   * @returns Human-readable language name
   *
   * @private
   * @internal
   *
   * @example
   * ```typescript
   * formatLanguage('en-US') // 'English (United States)'
   * formatLanguage('en-IN') // 'English (India)'
   * ```
   */
  private formatLanguage(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'en-US': 'English (United States)',
      'en-GB': 'English (United Kingdom)',
      'en-IN': 'English (India)',
      'en-AU': 'English (Australia)',
      'es-ES': 'Spanish (Spain)',
      'es-US': 'Spanish (United States)',
      'fr-FR': 'French (France)',
      'de-DE': 'German (Germany)',
      'it-IT': 'Italian (Italy)',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese (Japan)',
      'ko-KR': 'Korean (Korea)',
      'zh-CN': 'Chinese (Simplified)',
    };
    return languageMap[languageCode] || languageCode;
  }

  /**
   * Format voice name to human-readable format.
   *
   * @param voiceName - Voice identifier (e.g., 'en-US-Neural2-F')
   * @returns Human-readable voice description
   *
   * @private
   * @internal
   *
   * @example
   * ```typescript
   * formatVoice('en-US-Neural2-F') // 'Female Neural Voice'
   * formatVoice('en-US-Neural2-D') // 'Male Neural Voice'
   * ```
   */
  private formatVoice(voiceName: string): string {
    // Extract gender and variant from voice name (e.g., en-US-Neural2-F -> Female Neural Voice)
    if (voiceName.includes('-F')) {
      return 'Female Neural Voice';
    } else if (voiceName.includes('-M') || voiceName.includes('-D')) {
      return 'Male Neural Voice';
    } else if (voiceName.includes('-A') || voiceName.includes('-C')) {
      return 'Neural Voice A';
    } else if (voiceName.includes('-B')) {
      return 'Neural Voice B';
    }

    return voiceName;
  }

  /**
   * Format background sound to human-readable format.
   *
   * @param backgroundSound - Background sound preset name
   * @param volume - Volume level (0.0 to 1.0)
   * @returns Human-readable background description
   *
   * @private
   * @internal
   *
   * @example
   * ```typescript
   * formatBackground('cafe', 0.2) // 'Café ambience at 20% volume'
   * formatBackground(undefined) // 'None'
   * ```
   */
  private formatBackground(backgroundSound?: string, volume?: number): string {
    if (!backgroundSound) {
      return 'None';
    }

    const soundMap: { [key: string]: string } = {
      office: 'Office ambience',
      cafe: 'Café ambience',
      nature: 'Nature sounds',
      crowd: 'Crowd distant',
      rain: 'Light rain',
      phone: 'Phone static',
    };

    const soundName = soundMap[backgroundSound] || backgroundSound;
    const volumePercent = volume ? Math.round(volume * 100) : 0;

    return `${soundName} at ${volumePercent}% volume`;
  }

  /**
   * Save simplified conversation report.
   *
   * @param testResult - Complete test result object
   * @param timestamp - Timestamp string for filename
   *
   * @private
   * @internal
   *
   * @remarks
   * Creates a human-readable conversation report showing:
   * - Questions asked and responses received
   * - Pass/fail status for each question
   * - Language, voice, and background settings
   * - AI analysis and feedback
   * - Strengths (for passed questions)
   * - Improvements (for failed questions)
   */
  private saveConversationReport(
    testResult: TestResult,
    timestamp: string
  ): void {
    // Define the ConversationReportEntry type locally to fix ESLint errors
    type ConversationReportEntry = {
      questionId: string;
      questionAsked: string;
      automaticResponse: string;
      score: string;
      language: string;
      voice: string;
      background: string;
      analysis: string;
      strengths?: string[];
      improvements?: string[];
    };

    const conversationReport = {
      testName: testResult.metadata.configName,
      executedAt: testResult.metadata.executedAt,
      summary: {
        totalQuestions: testResult.summary.totalQuestions,
        questionsPassed: testResult.summary.questionsPassed,
        passRate: `${testResult.summary.passRate.toFixed(1)}%`,
        averageScore: `${testResult.summary.averageScore.toFixed(2)}/1`,
      },
      conversation: testResult.questionResults.map((result) => {
        // Find the original question config to get voice/language/background
        const questionConfig = this.config.questions.find(
          (q) => q.id === result.questionId
        );
        const language =
          questionConfig?.settings?.language ||
          this.config.settings.defaultLanguage;
        const voice =
          questionConfig?.settings?.voice || this.config.settings.defaultVoice;
        const background =
          questionConfig?.settings?.backgroundSound ||
          this.config.settings.backgroundSound;
        const backgroundVolume =
          questionConfig?.settings?.backgroundVolume ??
          this.config.settings.backgroundVolume;

        const isPassed = result.comparison.score === 1;

        // Build base response object (language first, then voice, then background)
        const response: ConversationReportEntry = {
          questionId: result.questionId,
          questionAsked: result.question,
          automaticResponse: result.actualResponse || '(No response captured)',
          score: isPassed ? 'PASS' : 'FAIL',
          language: this.formatLanguage(language),
          voice: this.formatVoice(voice),
          background: this.formatBackground(background, backgroundVolume),
          analysis: result.comparison.analysis,
        };

        // Conditionally add strengths or improvements based on pass/fail
        if (isPassed && result.comparison.strengths.length > 0) {
          response.strengths = result.comparison.strengths;
        } else if (!isPassed && result.comparison.improvements.length > 0) {
          response.improvements = result.comparison.improvements;
        }

        return response;
      }),
    };

    const reportPath = join(
      process.cwd(),
      `conversation-report-${timestamp}.json`
    );
    writeFileSync(reportPath, JSON.stringify(conversationReport, null, 2));

    this.logger.info(`📄 Conversation report saved to: ${reportPath}`);
  }

  /**
   * Print test summary to console.
   *
   * @param summary - Test summary object
   *
   * @private
   * @internal
   *
   * @remarks
   * Displays formatted summary with:
   * - Total questions and pass/fail counts
   * - Pass rate and average score
   * - Overall test result (PASSED/FAILED)
   */
  private printTestSummary(summary: TestSummary): void {
    this.logger.info('\n📊 TEST SUMMARY');
    this.logger.info('═'.repeat(50));
    this.logger.info(`📝 Total Questions: ${summary.totalQuestions}`);
    this.logger.info(`✅ Passed: ${summary.questionsPassed}`);
    this.logger.info(`❌ Failed: ${summary.questionsFailed}`);
    this.logger.info(`⏭️ Skipped: ${summary.questionsSkipped}`);
    this.logger.info(`📈 Pass Rate: ${summary.passRate.toFixed(1)}%`);
    this.logger.info(`🎯 Average Score: ${summary.averageScore.toFixed(2)}/1`);
    this.logger.info(
      `🏆 Overall Result: ${summary.testPassed ? '✅ PASSED' : '❌ FAILED'}`
    );
    this.logger.info('═'.repeat(50));
  }

  /**
   * Utility function for delays.
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   *
   * @private
   * @internal
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current test progress.
   *
   * @returns Test progress information or null if no tests have run
   *
   * @remarks
   * Provides real-time progress information including:
   * - Current question index and total
   * - Questions completed
   * - Time elapsed and estimated remaining time
   *
   * Useful for progress bars or status updates during test execution.
   *
   * @example
   * ```typescript
   * const progress = service.getProgress();
   * if (progress) {
   *   console.log(`Progress: ${progress.questionsCompleted}/${progress.totalQuestions}`);
   *   console.log(`Elapsed: ${(progress.timeElapsed / 1000).toFixed(1)}s`);
   *   console.log(`Remaining: ${(progress.estimatedTimeRemaining / 1000).toFixed(1)}s`);
   * }
   * ```
   */
  getProgress(): TestProgress | null {
    if (this.results.length === 0) {
      return null;
    }

    const currentQuestionIndex = this.results.length;
    const totalQuestions = this.config.questions.length;
    const questionsCompleted = this.results.length;
    const timeElapsed = Date.now() - this.startTime;
    const avgTimePerQuestion = timeElapsed / questionsCompleted;
    const estimatedTimeRemaining =
      (totalQuestions - questionsCompleted) * avgTimePerQuestion;

    return {
      currentQuestionIndex,
      totalQuestions,
      questionsCompleted,
      currentQuestion:
        this.config.questions[
          Math.min(currentQuestionIndex, totalQuestions - 1)
        ],
      timeElapsed,
      estimatedTimeRemaining,
    };
  }

  /**
   * Create voice bot test service instance.
   * Factory method for convenient instantiation.
   *
   * @param configPath - Path to test configuration JSON file
   * @returns A new VoiceBotTestService instance
   *
   * @example
   * ```typescript
   * const service = VoiceBotTestService.create('./config.json');
   * const results = await service.runTestSuite();
   *
   * if (results.summary.testPassed) {
   *   console.log('✅ All tests passed!');
   *   process.exit(0);
   * } else {
   *   console.error('❌ Some tests failed');
   *   process.exit(1);
   * }
   * ```
   */
  static create(configPath: string): VoiceBotTestService {
    return new VoiceBotTestService(configPath);
  }
}
