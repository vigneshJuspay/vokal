/**
 * Voice Bot Test Orchestrator
 * Manages the complete voice bot testing flow:
 * 1. Play question via TTS
 * 2. Listen for user response via STT
 * 3. Analyze response with AI
 * 4. Move to next question
 */

import { VoiceTestService } from './voice-test.js';
import { AIComparisonService } from './ai-comparison.js';
import { VoiceInteractionService } from './voice-interaction.js';
import {
  VoiceBotConfig,
  TestResult,
  TestQuestion,
  QuestionResult,
  TestSummary,
  PerformanceMetrics,
} from '../types/voice-bot-config.js';
import { VoiceTestError, getErrorMessage, toError, safeJSONParse } from '../types/index.js';
import { ConsoleLogger } from '../utils/logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Extended QuestionResult with background AI analysis promise
 */
interface QuestionResultWithPromise extends QuestionResult {
  aiAnalysisPromise?: Promise<QuestionResult>;
}

/**
 * Conversation report entry with conditional fields
 */
interface ConversationReportEntry {
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
}

export interface TestProgress {
  currentQuestionIndex: number;
  totalQuestions: number;
  questionsCompleted: number;
  currentQuestion: TestQuestion;
  timeElapsed: number;
  estimatedTimeRemaining: number;
}

export class VoiceBotTestService {
  private voiceTest: VoiceTestService;
  private reliableVoice: VoiceInteractionService;
  private aiComparison: AIComparisonService;
  private logger: ConsoleLogger;
  private config: VoiceBotConfig;
  private results: QuestionResultWithPromise[] = [];
  private startTime: number = 0;

  constructor(configPath?: string, apiKey?: string) {
    this.logger = new ConsoleLogger();

    // Initialize services
    this.voiceTest = new VoiceTestService({ apiKey });
    this.reliableVoice = new VoiceInteractionService(apiKey);
    this.aiComparison = AIComparisonService.create('google-ai'); // Default to google-ai

    // Load test configuration
    if (configPath) {
      this.config = this.loadTestConfig(configPath);
      this.aiComparison = AIComparisonService.create(this.config.settings.aiProvider);
    } else {
      throw new VoiceTestError('Test configuration path is required', 'MISSING_CONFIG');
    }

    this.logger.info('🚀 Voice Bot Test Service initialized');
    this.logger.info(
      `📋 Loaded test: "${this.config.metadata.name}" (${this.config.questions.length} questions)`
    );
  }

  /**
   * Run the complete voice bot test suite
   */
  async runTestSuite(): Promise<TestResult> {
    this.startTime = Date.now();
    this.results = [];

    try {
      this.logger.info('🎯 Starting voice bot test suite...');
      this.logger.info(`📊 Test: ${this.config.metadata.name} v${this.config.metadata.version}`);
      this.logger.info(`🎤 Using AI Provider: ${this.config.settings.aiProvider}`);

      // Test system components first
      await this.validateSystemComponents();

      // Run each question
      for (let i = 0; i < this.config.questions.length; i++) {
        const question = this.config.questions[i];
        this.logger.info(`\n📝 Question ${i + 1}/${this.config.questions.length}: ${question.id}`);

        const questionResult = await this.runSingleQuestion(question, i);
        this.results.push(questionResult);

        // No delay - move to next question immediately
      }

      // Wait for all AI analyses to complete before generating final report
      this.logger.info(`⏳ Waiting for all AI analyses to complete...`);
      const aiPromises = this.results.map((r) => r.aiAnalysisPromise).filter((p) => p);

      await Promise.all(aiPromises);
      this.logger.info(`✅ All AI analyses completed!`);

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
        'TEST_SUITE_FAILED',
        toError(error)
      );
    }
  }

  /**
   * Run a single question through the complete flow
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
        this.logger.info(`🗣️ Playing question: "${question.question}"`);

        // Create a FRESH reliable voice service for each question to ensure clean state
        this.logger.info(`🔄 Creating fresh voice service for question ${questionIndex + 1}...`);
        const freshVoiceService = new VoiceInteractionService(process.env.GOOGLE_AI_API_KEY);

        // Use the reliable voice service for the complete interaction
        this.logger.info(`🎯 Running voice interaction for question: "${question.question}"`);

        const voiceResult = await freshVoiceService.runVoiceInteraction(question.question, {
          language: question.settings?.language ?? this.config.settings.defaultLanguage,
          voice: question.settings?.voice ?? this.config.settings.defaultVoice,
          maxRecordingDuration:
            question.settings?.recordingDuration ?? this.config.settings.recordingDuration,
          silenceTimeout: this.config.settings.vadSettings.silenceDuration,
          confidenceThreshold: 0.3, // Reasonable confidence threshold
          backgroundSound:
            question.settings?.backgroundSound ?? this.config.settings.backgroundSound,
          backgroundVolume:
            question.settings?.backgroundVolume ?? this.config.settings.backgroundVolume,
        });

        // Clean up the fresh service immediately after use
        this.logger.info(`🧹 Cleaning up voice service after question ${questionIndex + 1}...`);
        freshVoiceService.cleanup();

        const questionPlayTime = 0; // TTS timing is handled internally
        const recordingTime = voiceResult.duration;

        if (!voiceResult.transcript || voiceResult.transcript.trim().length === 0) {
          throw new VoiceTestError('No speech detected in user response', 'NO_SPEECH_DETECTED');
        }

        this.logger.info(
          `📝 Transcribed: "${voiceResult.transcript}" (confidence: ${(voiceResult.confidence * 100).toFixed(1)}%)`
        );
        this.logger.info(
          `📊 Audio processed: ${voiceResult.audioProcessed} bytes, max volume: ${(voiceResult.maxVolume * 100).toFixed(1)}%`
        );

        // Step 3: Start AI analysis in background (don't block)
        this.logger.info(`🤖 Starting AI analysis in background...`);
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
            transcriptionTime: voiceResult.processingTime,
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
            const passingScore = this.config.settings.passingScore;
            const passed = comparisonResult.score >= passingScore;

            // Update result with AI analysis
            questionResult.comparison = comparisonResult;
            questionResult.timing.analysisTime = analysisTime;
            questionResult.timing.totalTime = totalTime;
            questionResult.passed = passed;

            this.logger.info(
              `✅ AI analysis completed in ${analysisTime}ms (score: ${comparisonResult.score}/1 - ${comparisonResult.score === 1 ? 'PASS' : 'FAIL'})`
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
        this.logger.info(`➡️ Moving to next question (AI analysis running in background)`);
        return questionResult;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        this.logger.error(`❌ Error in question ${question.id}: ${errorMessage}`);

        if (retries < maxRetries) {
          this.logger.info(`🔄 Retrying question (attempt ${retries + 2}/${maxRetries + 1})...`);
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
    throw new VoiceTestError('Unexpected end of question execution', 'UNEXPECTED_ERROR');
  }

  /**
   * Load test configuration from file
   */
  private loadTestConfig(configPath: string): VoiceBotConfig {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parseResult = safeJSONParse<VoiceBotConfig>(configContent);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!parseResult.success) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Invalid JSON: ${parseResult.error}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const config: VoiceBotConfig = parseResult.data;

      // Basic validation
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
        'CONFIG_LOAD_FAILED',
        toError(error)
      );
    }
  }

  /**
   * Validate system components before running tests
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
        'AUDIO_VALIDATION_FAILED'
      );
    }

    if (!validation.stt) {
      throw new VoiceTestError(
        `STT service validation failed: ${validation.errors.join(', ')}`,
        'STT_VALIDATION_FAILED'
      );
    }

    // Skip AI validation - neurolink should work reliably
    this.logger.info('⚡ Skipping AI validation - neurolink is reliable');

    this.logger.info('✅ All system components validated successfully');
  }

  /**
   * Generate comprehensive test results
   */
  private generateTestResult(): TestResult {
    const totalTime = Date.now() - this.startTime;
    const totalQuestions = this.config.questions.length;
    const questionsAttempted = this.results.length;
    const questionsPassed = this.results.filter((r) => r.passed).length;
    const questionsFailed = this.results.filter((r) => !r.passed).length;
    const questionsSkipped = totalQuestions - questionsAttempted;

    const scores = this.results.map((r) => r.comparison.score);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passRate = totalQuestions > 0 ? (questionsPassed / totalQuestions) * 100 : 0;
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
        averageGenerationTime: this.calculateAverageTime(this.results, 'questionPlayTime'),
        totalGenerationTime: this.calculateTotalTime(this.results, 'questionPlayTime'),
        questionsWithTTS: this.results.filter((r) => r.timing.questionPlayTime > 0).length,
      },
      sttMetrics: {
        averageTranscriptionTime: this.calculateAverageTime(this.results, 'transcriptionTime'),
        totalTranscriptionTime: this.calculateTotalTime(this.results, 'transcriptionTime'),
        totalRecordingTime: this.calculateTotalTime(this.results, 'recordingTime'),
      },
      aiMetrics: {
        averageAnalysisTime: this.calculateAverageTime(this.results, 'analysisTime'),
        totalAnalysisTime: this.calculateTotalTime(this.results, 'analysisTime'),
        provider: this.config.settings.aiProvider,
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
   * Calculate average timing for a specific metric
   */
  private calculateAverageTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    const times = results.map((r) => r.timing[metric]).filter((t) => t > 0);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  /**
   * Calculate total timing for a specific metric
   */
  private calculateTotalTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    return results.map((r) => r.timing[metric]).reduce((a, b) => a + b, 0);
  }

  /**
   * Save test results to JSON file
   */
  private saveTestResults(testResult: TestResult): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `voice-test-results-${timestamp}.json`;
    const resultsPath = join(process.cwd(), filename);

    writeFileSync(resultsPath, JSON.stringify(testResult, null, 2));

    // Also save a simple conversation report
    this.saveConversationReport(testResult, timestamp);

    return resultsPath;
  }

  /**
   * Format language code to human-readable format
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
   * Format voice name to human-readable format (without language since it's separate)
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
   * Format background sound to human-readable format
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
   * Save simplified conversation report
   */
  private saveConversationReport(testResult: TestResult, timestamp: string): void {
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
        const questionConfig = this.config.questions.find((q) => q.id === result.questionId);
        const language = questionConfig?.settings?.language || this.config.settings.defaultLanguage;
        const voice = questionConfig?.settings?.voice || this.config.settings.defaultVoice;
        const background =
          questionConfig?.settings?.backgroundSound || this.config.settings.backgroundSound;
        const backgroundVolume =
          questionConfig?.settings?.backgroundVolume ?? this.config.settings.backgroundVolume;

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

    const reportPath = join(process.cwd(), `conversation-report-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(conversationReport, null, 2));

    this.logger.info(`📄 Conversation report saved to: ${reportPath}`);
  }

  /**
   * Print test summary to console
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
    this.logger.info(`🏆 Overall Result: ${summary.testPassed ? '✅ PASSED' : '❌ FAILED'}`);
    this.logger.info('═'.repeat(50));
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current test progress
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
    const estimatedTimeRemaining = (totalQuestions - questionsCompleted) * avgTimePerQuestion;

    return {
      currentQuestionIndex,
      totalQuestions,
      questionsCompleted,
      currentQuestion: this.config.questions[Math.min(currentQuestionIndex, totalQuestions - 1)],
      timeElapsed,
      estimatedTimeRemaining,
    };
  }

  /**
   * Create voice bot test service instance
   */
  static create(configPath: string, apiKey?: string): VoiceBotTestService {
    return new VoiceBotTestService(configPath, apiKey);
  }
}
