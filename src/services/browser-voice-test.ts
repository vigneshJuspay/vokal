/**
 * Browser-Based Voice Test Service
 * Opens browser for each question, uses existing voice test infrastructure
 * Simple approach: Puppeteer for UI, VoiceInteractionService for voice interaction
 */

import puppeteer, { Browser, Frame } from 'puppeteer';
import { ConsoleLogger } from '../utils/logger.js';
import { VoiceTestError, getErrorMessage, toError, safeJSONParse } from '../types/index.js';
import {
  TestResult,
  QuestionResult,
  TestQuestion,
  VoiceBotConfig,
  TestSummary,
  PerformanceMetrics,
} from '../types/voice-bot-config.js';
import { AIComparisonService } from './ai-comparison.js';
import { VoiceInteractionService } from './voice-interaction.js';
import { readFileSync, writeFileSync } from 'fs';
import { cwd } from 'process';
import { join } from 'path';
import { platform } from 'os';

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

export interface BrowserVoiceTestOptions {
  url: string;
  questionDelay?: number;
  headless?: boolean;
  iterations?: number;
}

export class BrowserVoiceTestService {
  private logger: ConsoleLogger;
  private options: BrowserVoiceTestOptions;
  private aiComparison: AIComparisonService;
  private reliableVoice: VoiceInteractionService;
  private config: VoiceBotConfig;
  private results: QuestionResultWithPromise[] = [];
  private startTime: number = 0;

  constructor(options: BrowserVoiceTestOptions, configPath?: string) {
    this.logger = new ConsoleLogger();
    this.options = {
      questionDelay: 500,
      headless: false,
      iterations: 50,
      ...options,
    };

    if (configPath) {
      this.config = this.loadTestConfig(configPath);
      this.aiComparison = AIComparisonService.create(this.config.settings.aiProvider);
      this.reliableVoice = new VoiceInteractionService(process.env.GOOGLE_AI_API_KEY);
    } else {
      throw new VoiceTestError('Test configuration path is required', 'MISSING_CONFIG');
    }

    this.logger.info('🚀 Browser Voice Test Service initialized');
    this.logger.info(
      `📋 Loaded test: "${this.config.metadata.name}" (${this.config.questions.length} questions)`
    );
  }

  /**
   * Run full test suite with multiple iterations
   */
  async runTestSuite(): Promise<TestResult> {
    this.startTime = Date.now();
    this.results = [];

    try {
      this.logger.info('🎯 Starting browser voice bot test suite...');
      this.logger.info(`📊 Test: ${this.config.metadata.name} v${this.config.metadata.version}`);
      this.logger.info(`📍 URL: ${this.options.url}`);
      this.logger.info(`🎤 Using AI Provider: ${this.config.settings.aiProvider}`);
      this.logger.info(`🔁 Iterations: ${this.options.iterations}`);
      this.logger.info(
        `🔄 All ${this.config.questions.length} questions will run in ONE session per iteration\n`
      );

      // Run multiple iterations
      for (let iteration = 1; iteration <= this.options.iterations!; iteration++) {
        this.logger.info(`\n${'='.repeat(70)}`);
        this.logger.info(`🔁 ITERATION ${iteration}/${this.options.iterations}`);
        this.logger.info(`${'='.repeat(70)}\n`);

        await this.runSingleIteration(iteration);

        if (iteration < this.options.iterations!) {
          this.logger.info(`\n⏸️ Waiting 3 seconds before next iteration...\n`);
          await this.delay(3000);
        }
      }

      // Wait for all AI analyses to complete
      this.logger.info(`\n⏳ Waiting for all AI analyses to complete...`);
      const aiPromises = this.results.map((r) => r.aiAnalysisPromise).filter((p) => p);
      await Promise.all(aiPromises);
      this.logger.info(`✅ All AI analyses completed!`);

      // Generate and save results
      const testResult = this.generateTestResult();
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
   * Run a single iteration: open browser, run all questions, close browser
   */
  private async runSingleIteration(iteration: number): Promise<void> {
    let browser: Browser | null = null;

    try {
      // Step 1: Open browser and start voice mode ONCE for this iteration
      this.logger.info(`🌐 Opening browser session for iteration ${iteration}...`);
      browser = await this.openBrowserAndStartVoiceMode();
      this.logger.info(
        `✅ Browser ready! Running all ${this.config.questions.length} questions in this session...\n`
      );

      // Step 2: Run all questions in the same session
      for (let i = 0; i < this.config.questions.length; i++) {
        const question = this.config.questions[i];
        this.logger.info(
          `📝 Question ${i + 1}/${this.config.questions.length}: ${question.question}`
        );
        this.logger.info(`${'='.repeat(60)}`);

        const questionResult = await this.runQuestionInSession(question, i, iteration);
        this.results.push(questionResult);

        if (i < this.config.questions.length - 1) {
          this.logger.info(`⏸️ Waiting ${this.options.questionDelay}ms before next question...\n`);
          await this.delay(this.options.questionDelay!);
        }
      }

      this.logger.info(`\n✅ All questions completed for iteration ${iteration}`);
    } catch (error) {
      this.logger.error(`❌ Error in iteration ${iteration}: ${getErrorMessage(error)}`);
      throw error;
    } finally {
      if (browser) {
        this.logger.info(`🧹 Closing browser session for iteration ${iteration}...`);
        await browser.close();
        this.logger.info(`✅ Browser closed`);
      }
    }
  }

  /**
   * Run a single question within an existing browser session
   */
  private async runQuestionInSession(
    question: TestQuestion,
    _questionIndex: number,
    iteration: number
  ): Promise<QuestionResult> {
    const questionStartTime = Date.now();
    let retries = 0;
    const maxRetries = this.config.settings.maxRetries;

    while (retries <= maxRetries) {
      try {
        this.logger.info(`🗣️ Testing: "${question.question}"`);

        // Use existing voice service for the interaction
        this.logger.info(`🎤 Running voice interaction...`);
        const voiceResult = await this.reliableVoice.runVoiceInteraction(question.question, {
          language: question.settings?.language ?? this.config.settings.defaultLanguage,
          voice: question.settings?.voice ?? this.config.settings.defaultVoice,
          maxRecordingDuration:
            question.settings?.recordingDuration ?? this.config.settings.recordingDuration,
          silenceTimeout: this.config.settings.vadSettings.silenceDuration,
          confidenceThreshold: 0.3,
          backgroundSound:
            question.settings?.backgroundSound ?? this.config.settings.backgroundSound,
          backgroundVolume:
            question.settings?.backgroundVolume ?? this.config.settings.backgroundVolume,
        });

        if (!voiceResult.transcript || voiceResult.transcript.trim().length === 0) {
          throw new VoiceTestError('No speech detected in bot response', 'NO_SPEECH_DETECTED');
        }

        this.logger.info(
          `📝 Transcribed bot response: "${voiceResult.transcript}" (confidence: ${(voiceResult.confidence * 100).toFixed(1)}%)`
        );

        // Create result placeholder with iteration info
        const questionResult: QuestionResultWithPromise = {
          questionId: `${question.id}_iter${iteration}`,
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
            questionPlayTime: 0,
            recordingTime: voiceResult.duration,
            transcriptionTime: voiceResult.processingTime,
            analysisTime: 0,
            totalTime: Date.now() - questionStartTime,
          },
          retries,
          passed: false,
          errors: [],
        };

        // Start AI analysis in background
        this.logger.info(`🤖 Starting AI analysis in background...`);
        const analysisStartTime = Date.now();

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

            questionResult.comparison = comparisonResult;
            questionResult.timing.analysisTime = analysisTime;
            questionResult.timing.totalTime = totalTime;
            questionResult.passed = passed;

            this.logger.info(
              `✅ AI analysis completed in ${analysisTime}ms (score: ${comparisonResult.score} - ${passed ? 'PASS' : 'FAIL'})`
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

        questionResult.aiAnalysisPromise = aiAnalysisPromise;

        this.logger.info(`➡️ Question completed (AI analysis running in background)\n`);
        return questionResult;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        this.logger.error(`❌ Error in question ${question.id}: ${errorMessage}`);

        if (retries < maxRetries) {
          this.logger.info(`🔄 Retrying question (attempt ${retries + 2}/${maxRetries + 1})...`);
          retries++;
          await this.delay(3000);
        } else {
          return {
            questionId: `${question.id}_iter${iteration}`,
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

    throw new VoiceTestError('Unexpected end of question execution', 'UNEXPECTED_ERROR');
  }

  /**
   * Open browser and click "Interactive Voice" button
   */
  private async openBrowserAndStartVoiceMode(): Promise<Browser> {
    this.logger.info(`🌐 Opening Chrome and starting voice mode...`);

    // Detect Chrome path based on OS
    const getChromePath = (): string | undefined => {
      if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
      }

      const platform = process.platform;
      if (platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else if (platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (platform === 'linux') {
        return '/usr/bin/google-chrome';
      }

      // Let Puppeteer use its default
      return undefined;
    };

    const chromePath = getChromePath();
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        `--user-data-dir=/tmp/puppeteer-chrome-profile`,
      ],
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(this.options.url, ['microphone']);

    this.logger.info(`📍 Navigating to: ${this.options.url}`);
    await page.goto(this.options.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.delay(this.options.questionDelay!);

    // Close popup if exists
    try {
      const closeDiv = await page.evaluate(() => {
        const div = document.querySelector('div[data-icon="new_popUpClose"]');
        if (div) {
          const rect = div.getBoundingClientRect();
          return { found: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return { found: false, x: 0, y: 0 };
      });

      if (closeDiv.found && closeDiv.x && closeDiv.y) {
        await page.mouse.click(closeDiv.x, closeDiv.y);
        this.logger.info(`✅ Closed popup`);
        await this.delay(2000);
      }
    } catch (error) {
      // Ignore popup errors
    }

    // Wait for and click "Interactive Voice" button
    this.logger.info(`⏳ Waiting for Interactive Voice button...`);
    let targetFrame: Frame | null = null;
    let buttonFound = false;
    const maxAttempts = 6;
    let attempts = 0;

    while (attempts < maxAttempts && !buttonFound) {
      const mainFrameCheck = await page.evaluate(() => {
        return { found: document.querySelector('button[data-pw="Interactive Voice"]') !== null };
      });

      if (mainFrameCheck.found) {
        targetFrame = page.mainFrame();
        buttonFound = true;
        break;
      }

      // Check iframes
      for (const frame of page.frames()) {
        try {
          const frameCheck = await frame.evaluate(() => {
            return {
              found: document.querySelector('button[data-pw="Interactive Voice"]') !== null,
            };
          });

          if (frameCheck.found) {
            targetFrame = frame;
            buttonFound = true;
            break;
          }
        } catch (frameError) {
          // Cross-origin frame
        }
      }

      if (!buttonFound) {
        attempts++;
        if (attempts < maxAttempts) {
          await this.delay(10000);
        }
      }
    }

    if (!buttonFound || !targetFrame) {
      throw new Error('Could not find Interactive Voice button');
    }

    const buttonElement = await targetFrame.waitForSelector('[data-pw="Interactive Voice"]', {
      visible: true,
      timeout: 5000,
    });

    if (!buttonElement) {
      throw new VoiceTestError('Interactive Voice button not found', 'BUTTON_NOT_FOUND');
    }

    await buttonElement.click();
    this.logger.info(`✅ Clicked Interactive Voice button!`);

    // Wait for voice mode to initialize
    this.logger.info(`⏳ Waiting 5 seconds for voice mode to initialize...`);
    await this.delay(5000);
    this.logger.info(`✅ Browser voice mode ready!`);

    return browser;
  }

  // Reuse all the existing helper methods from voice-bot-test.service.ts
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

  private generateTestResult(): TestResult {
    const totalTime = Date.now() - this.startTime;
    const totalQuestions = this.config.questions.length * this.options.iterations!;
    const questionsAttempted = this.results.length;

    // questionsPassed is now the SUM of all scores
    const scores = this.results.map((r) => r.comparison.score);
    const questionsPassed = scores.reduce((a, b) => a + b, 0);

    const questionsFailed = this.results.filter((r) => !r.passed).length;
    const questionsSkipped = totalQuestions - questionsAttempted;

    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passRate = totalQuestions > 0 ? (questionsPassed / (totalQuestions * 10)) * 100 : 0; // Assuming max score 10 per question
    // Test passes if total score meets threshold
    const testPassed = questionsPassed >= this.config.settings.passingScore;

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
          platform: platform(),
          nodeVersion: process.version,
          voiceTestVersion: '2.0.0',
        },
      },
      summary,
      questionResults: this.results,
      performance,
    };
  }

  private calculateAverageTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    const times = results.map((r) => r.timing[metric]).filter((t) => t > 0);
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateTotalTime(
    results: QuestionResult[],
    metric: keyof QuestionResult['timing']
  ): number {
    return results.map((r) => r.timing[metric]).reduce((a, b) => a + b, 0);
  }

  private saveTestResults(testResult: TestResult): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `browser-test-results-${timestamp}.json`;
    const resultsPath = join(cwd(), filename);

    writeFileSync(resultsPath, JSON.stringify(testResult, null, 2));
    this.saveConversationReport(testResult, timestamp);

    return resultsPath;
  }

  private formatLanguage(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'en-US': 'English (United States)',
      'en-GB': 'English (United Kingdom)',
      'en-IN': 'English (India)',
    };
    return languageMap[languageCode] || languageCode;
  }

  private formatVoice(voiceName: string): string {
    if (voiceName.includes('-F')) {
      return 'Female Neural Voice';
    }
    if (voiceName.includes('-M') || voiceName.includes('-D')) {
      return 'Male Neural Voice';
    }
    if (voiceName.includes('-A') || voiceName.includes('-C')) {
      return 'Neural Voice A';
    }
    if (voiceName.includes('-B')) {
      return 'Neural Voice B';
    }
    return voiceName;
  }

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

  private saveConversationReport(testResult: TestResult, timestamp: string): void {
    const conversationReport = {
      testName: testResult.metadata.configName,
      executedAt: testResult.metadata.executedAt,
      summary: {
        totalQuestions: testResult.summary.totalQuestions,
        questionsPassed: testResult.summary.questionsPassed,
        passedQuestionsDisplay: `${testResult.summary.questionsPassed}/${testResult.summary.totalQuestions}`,
        passRate: `${testResult.summary.passRate.toFixed(1)}%`,
        averageScore: testResult.summary.averageScore.toFixed(2),
      },
      conversation: testResult.questionResults.map((result) => {
        const questionConfig = this.config.questions.find((q) => q.id === result.questionId);
        const language = questionConfig?.settings?.language || this.config.settings.defaultLanguage;
        const voice = questionConfig?.settings?.voice || this.config.settings.defaultVoice;
        const background =
          questionConfig?.settings?.backgroundSound || this.config.settings.backgroundSound;
        const backgroundVolume =
          questionConfig?.settings?.backgroundVolume ?? this.config.settings.backgroundVolume;

        const isPassed = result.comparison.score >= this.config.settings.passingScore;

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

        if (isPassed && result.comparison.strengths.length > 0) {
          response.strengths = result.comparison.strengths;
        } else if (!isPassed && result.comparison.improvements.length > 0) {
          response.improvements = result.comparison.improvements;
        }

        return response;
      }),
    };

    const reportPath = join(cwd(), `browser-conversation-report-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(conversationReport, null, 2));

    this.logger.info(`📄 Conversation report saved to: ${reportPath}`);
  }

  private printTestSummary(summary: TestSummary): void {
    this.logger.info('\n📊 TEST SUMMARY');
    this.logger.info('═'.repeat(50));
    this.logger.info(`📝 Questions: ${summary.questionsPassed}/${summary.totalQuestions} passed`);
    this.logger.info(`✅ Passed: ${summary.questionsPassed}`);
    this.logger.info(`❌ Failed: ${summary.questionsFailed}`);
    this.logger.info(`⏭️ Skipped: ${summary.questionsSkipped}`);
    this.logger.info(`📈 Pass Rate: ${summary.passRate.toFixed(1)}%`);
    this.logger.info(`🎯 Average Score: ${summary.averageScore.toFixed(2)}`);
    this.logger.info(`🏆 Overall Result: ${summary.testPassed ? '✅ PASSED' : '❌ FAILED'}`);
    this.logger.info('═'.repeat(50));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static create(options: BrowserVoiceTestOptions, configPath: string): BrowserVoiceTestService {
    return new BrowserVoiceTestService(options, configPath);
  }
}
