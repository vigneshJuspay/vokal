#!/usr/bin/env node

/**
 * Vokal CLI
 *
 * Command-line interface for text-to-speech with background audio mixing.
 * Provides a comprehensive set of commands for generating speech, managing voices,
 * testing audio playback, and running voice bot test suites.
 *
 * @module cli/index
 * @since 1.0.0
 *
 * * @example
 * ```bash
 * # Generate speech with background audio
 * vokal voice generate "Hello world" --voice en-US-Neural2-D --lang en-US --bg cafe
 *
 * # List available voices
 * vokal voices en-US
 *
 * # Run voice bot tests
 * vokal test ./config.json --provider google-ai
 * ```
 */

// External dependencies
import yargs, { ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { config as dotenvConfig } from 'dotenv';

// Node.js built-in modules
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Internal services
import { VoiceTestService } from '../services/voice-test.js';
import { VoiceBotTestService } from '../services/voice-bot-test.js';

// Internal types and errors
import { VoiceTestError, SAMPLE_TEST_CONFIG } from '../types/index.js';
import type {
  PackageJson,
  GenerateCommandArgs,
  VoicesCommandArgs,
  TestAudioCommandArgs,
  PlayCommandArgs,
  TestCommandArgs,
  Voice,
  BackgroundSound,
} from '../types/index.js';

// Load environment variables from .env file
dotenvConfig();

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_JSON_PATH = join(__dirname, '../../../package.json');

// Vokal ASCII banner
const VOKAL_BANNER = `
${chalk.cyan('╔══════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                  ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.green('██╗   ██╗ ██████╗ ██╗  ██╗ █████╗ ██╗')}      ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.green('██║   ██║██╔═══██╗██║ ██╔╝██╔══██╗██║')}      ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.green('██║   ██║██║   ██║█████╔╝ ███████║██║')}      ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.green('╚██╗ ██╔╝██║   ██║██╔═██╗ ██╔══██║██║')}      ${chalk.cyan('║')}
${chalk.cyan('║')}    ${chalk.bold.green('╚████╔╝ ╚██████╔╝██║  ██╗██║  ██╗███████╗')} ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.bold.green('╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝')} ${chalk.cyan('║')}
${chalk.cyan('║')}                                                  ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════╝')}
`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely parses the package.json file and extracts version information.
 *
 * @param content - Raw JSON string content from package.json file
 * @returns Parsed package.json object with version information
 *
 * @throws {Error} If the JSON is invalid or doesn't conform to expected structure
 *
 * @example
 * ```typescript
 * const content = readFileSync('./package.json', 'utf-8');
 * const pkg = parsePackageJson(content);
 * console.log(pkg.version); // "1.0.0"
 * ```
 */
function parsePackageJson(content: string): PackageJson {
  const obj: unknown = JSON.parse(content);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Invalid package.json format');
  }
  return {
    version: String(Reflect.get(obj, 'version') || '1.0.0'),
  };
}

/**
 * Type guard to check if an unknown value is an Error instance.
 *
 * @param error - The value to check
 * @returns True if the value is an Error instance, false otherwise
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Test');
 * } catch (err) {
 *   if (isError(err)) {
 *     console.log(err.message);
 *   }
 * }
 * ```
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely converts an unknown value to an Error instance.
 * If the value is already an Error, returns it as-is.
 * Otherwise, creates a new Error with the string representation.
 *
 * @param error - The unknown value to convert
 * @returns An Error instance
 *
 * @example
 * ```typescript
 * const err1 = toError(new Error('Test')); // Returns the Error as-is
 * const err2 = toError('String error'); // Returns new Error('String error')
 * const err3 = toError(42); // Returns new Error('42')
 * ```
 */
function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Type guard to validate if an unknown object conforms to the Voice interface.
 * Checks for required properties: name, gender, type, and languageCode.
 *
 * @param item - The value to validate
 * @returns True if the item is a valid Voice object, false otherwise
 *
 * @example
 * ```typescript
 * const voice = { name: 'en-US-Neural2-D', gender: 'MALE', type: 'NEURAL', languageCode: 'en-US' };
 * if (isVoice(voice)) {
 *   console.log(voice.name); // TypeScript knows it's a Voice
 * }
 * ```
 */
function isVoice(item: unknown): item is Voice {
  return (
    item !== null &&
    typeof item === 'object' &&
    'name' in item &&
    'gender' in item &&
    'type' in item &&
    'languageCode' in item &&
    typeof item.name === 'string' &&
    typeof item.gender === 'string' &&
    typeof item.type === 'string' &&
    typeof item.languageCode === 'string'
  );
}

/**
 * Global error handler with consistent formatting and proper exit codes.
 * Handles both VoiceTestError instances and generic Error objects.
 * Always exits the process with code 1 after logging the error.
 *
 * @param error - The error to handle (can be any type)
 * @param context - Optional context string to prefix the error message (default: 'Vokal')
 * @returns Never returns (exits process)
 *
 * @remarks
 * This function provides centralized error handling with:
 * - Consistent error formatting using chalk colors
 * - Special handling for VoiceTestError with error codes
 * - Automatic process termination with appropriate exit code
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, 'Speech Generation');
 * }
 * ```
 */
function handleError(error: unknown, context: string = 'Vokal'): never {
  const err = toError(error);
  if (err instanceof VoiceTestError) {
    console.error(chalk.red(`❌ ${context} Error [${err.code}]: ${err.message}`));
  } else {
    console.error(chalk.red(`❌ ${context} Error: ${err.message}`));
  }
  process.exit(1);
}

/**
 * Safe spinner handler that stops a spinner with success or failure state.
 * Handles null spinners gracefully for quiet mode operation.
 *
 * @param spinner - The Ora spinner instance to stop (can be null)
 * @param success - Whether the operation succeeded
 * @param message - Message to display when stopping the spinner
 *
 * @remarks
 * This function safely handles both active and null spinners, making it
 * suitable for use in quiet mode where spinners are not initialized.
 *
 * @example
 * ```typescript
 * const spinner = ora('Processing...').start();
 * try {
 *   await someOperation();
 *   stopSpinner(spinner, true, 'Operation completed');
 * } catch (error) {
 *   stopSpinner(spinner, false, 'Operation failed');
 * }
 * ```
 */
function stopSpinner(spinner: Ora | null, success: boolean, message: string): void {
  if (!spinner) {
    return;
  }

  if (success) {
    spinner.succeed(chalk.green(message));
  } else {
    spinner.fail(chalk.red(message));
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Handler for the 'voice generate' subcommand.
 * Generates text-to-speech audio with optional background audio mixing and playback.
 *
 * @param argv - Command-line arguments parsed by yargs
 *
 * @throws {VoiceTestError} If speech generation fails or API errors occur
 *
 * @remarks
 * This command supports:
 * - Multiple voice options and languages
 * - Adjustable speaking rate and pitch
 * - Background audio mixing with volume control
 * - Optional audio playback after generation
 * - Debug mode for detailed operation insights
 * - Quiet mode for minimal output
 *
 * @example
 * ```bash
 * # Basic usage
 * vokal voice generate "Hello world" --voice en-US-Neural2-D --lang en-US
 *
 * # With background audio
 * vokal voice generate "Welcome" --voice en-US-Neural2-F --lang en-US --bg cafe --bgvol 0.2
 *
 * # Advanced settings
 * vokal voice generate "Fast speech" --voice en-US-Neural2-A --rate 1.5 --pitch 5.0 --debug
 * ```
 */
async function handleGenerateCommand(argv: ArgumentsCamelCase<GenerateCommandArgs>): Promise<void> {
  const spinner = argv.quiet ? null : ora('🎤 Generating speech...').start();

  try {
    const voiceTest = new VoiceTestService(argv.apiKey);

    if (argv.debug) {
      console.info(chalk.yellow('\n🔍 Debug - Input:'));
      console.info(
        JSON.stringify(
          {
            text: argv.text.substring(0, 50) + '...',
            languageCode: argv.lang,
            voiceName: argv.voice,
            audioEncoding: argv.encoding,
            speakingRate: argv.rate,
            pitch: argv.pitch,
            backgroundSound: argv.bg,
            backgroundVolume: argv.bgvol,
          },
          null,
          2
        )
      );
    }

    const response = await voiceTest.generateSpeechDetailed({
      text: argv.text,
      languageCode: argv.lang,
      voiceName: argv.voice,
      audioEncoding: argv.encoding,
      speakingRate: argv.rate,
      pitch: argv.pitch,
      output: argv.output,
      backgroundSound: argv.bg,
      backgroundVolume: argv.bg ? argv.bgvol : undefined,
      play: argv.play,
    });

    stopSpinner(spinner, true, '✅ Speech generation completed!');

    if (!argv.quiet) {
      console.log(`\n📁 Audio file: ${response.filePath}`);
      console.log(`📊 File size: ${(response.fileSize / 1024).toFixed(2)} KB`);
      console.log(`⏱️ Generation time: ${response.generationTime}ms`);
      if (response.mixedAudio) {
        console.log(`🎵 Background audio: Mixed`);
      }
      if (response.wasPlayed) {
        console.log(`🔊 Audio: Played successfully`);
      }
    }

    if (argv.debug) {
      console.info(chalk.yellow('\n🔍 Debug - Response:'));
      console.info(JSON.stringify(response.metadata, null, 2));
    }
  } catch (error) {
    stopSpinner(spinner, false, '❌ Speech generation failed');
    handleError(error, 'Speech Generation');
  }
}

/**
 * Handler for the 'voices' command.
 * Lists all available voices, optionally filtered by language code.
 *
 * @param argv - Command-line arguments parsed by yargs
 *
 * @remarks
 * Supports two output formats:
 * - `text`: Human-readable formatted list with colors (default)
 * - `json`: Machine-readable JSON output for scripting
 *
 * The command displays voice details including:
 * - Voice name and identifier
 * - Gender (MALE/FEMALE/NEUTRAL)
 * - Voice type (NEURAL/STANDARD/WAVENET)
 * - Language code
 *
 * @example
 * ```bash
 * # List all voices
 * vokal voices
 *
 * # Filter by language
 * vokal voices en-US
 *
 * # JSON output for scripting
 * vokal voices en-IN --format json
 * ```
 */
function handleVoicesCommand(argv: ArgumentsCamelCase<VoicesCommandArgs>): void {
  const spinner = argv.quiet ? null : ora('🔍 Fetching available voices...').start();

  try {
    const voiceTest = new VoiceTestService(argv.apiKey);
    const voicesResult: unknown = voiceTest.getAvailableVoices(argv.language);

    // Type-safe voice filtering
    const voices: Voice[] = Array.isArray(voicesResult) ? voicesResult.filter(isVoice) : [];

    stopSpinner(
      spinner,
      true,
      `✅ Found ${voices.length} voices${argv.language ? ` for ${argv.language}` : ''}`
    );

    if (argv.format === 'json') {
      console.log(JSON.stringify(voices, null, 2));
      return;
    }

    // Text format output
    if (!argv.quiet) {
      console.log(
        chalk.blue(`\n🎤 Available Voices${argv.language ? ` (${argv.language})` : ''}:`)
      );
      console.log('='.repeat(50));
    }

    voices.forEach((voice: Voice) => {
      const genderColor = voice.gender === 'MALE' ? chalk.cyan : chalk.magenta;
      const typeColor = voice.type === 'NEURAL' ? chalk.green : chalk.yellow;

      console.log(
        `${chalk.bold(voice.name)} - ${genderColor(voice.gender)} ${typeColor(voice.type)} (${voice.languageCode})`
      );
    });

    if (!argv.quiet && voices.length > 0) {
      console.log(
        chalk.gray(
          `\n💡 Use with: vokal generate "text" --language ${voices[0].languageCode} --voice ${voices[0].name}`
        )
      );
    }
  } catch (error) {
    stopSpinner(spinner, false, '❌ Failed to fetch voices');
    handleError(error, 'Voice Listing');
  }
}

/**
 * Handler for the 'backgrounds' command.
 * Lists all available background sound presets with descriptions and settings.
 *
 * @remarks
 * Displays information about each background sound:
 * - Name and identifier
 * - Description of the sound environment
 * - Default volume level
 * - Whether the sound loops continuously
 *
 * Available background sounds typically include:
 * - Office ambience
 * - Cafe environment
 * - Nature sounds
 * - Rain effects
 * - Phone static
 * - Crowd noise
 *
 * @example
 * ```bash
 * vokal backgrounds
 * ```
 */
function handleBackgroundsCommand(): void {
  try {
    const voiceTest = new VoiceTestService();
    const backgrounds = voiceTest.getAvailableBackgroundSounds();

    console.log(chalk.blue('\n🎵 Available Background Sounds:'));
    console.log('='.repeat(50));

    backgrounds.forEach((bg: BackgroundSound) => {
      console.log(`${chalk.bold(bg.name)}: ${bg.description}`);
      console.log(`   Volume: ${bg.defaultVolume} | Loop: ${bg.loop ? 'Yes' : 'No'}`);
      console.log('');
    });

    if (backgrounds.length > 0) {
      console.log(
        chalk.gray(
          `💡 Use with: vokal generate "text" -l en-US -v en-US-Neural2-D --background ${backgrounds[0].name}`
        )
      );
    }
  } catch (error) {
    handleError(error, 'Background Sounds');
  }
}

/**
 * Handler for the 'test-audio' command.
 * Tests the system's audio playback capability and displays system information.
 *
 * @param argv - Command-line arguments parsed by yargs
 *
 * @remarks
 * This command performs the following checks:
 * - Tests audio playback support on the current platform
 * - Displays system information (OS, Node.js version, TTS provider)
 * - Verifies audio device availability
 *
 * Useful for troubleshooting audio issues before generating speech.
 *
 * @example
 * ```bash
 * vokal test-audio
 * ```
 */
async function handleTestAudioCommand(
  argv: ArgumentsCamelCase<TestAudioCommandArgs>
): Promise<void> {
  const spinner = ora('🔧 Testing audio playback...').start();

  try {
    const voiceTest = new VoiceTestService(argv.apiKey);
    const isSupported = await voiceTest.testAudioPlayback();

    if (isSupported) {
      stopSpinner(spinner, true, '✅ Audio playback is supported');
    } else {
      stopSpinner(spinner, false, '❌ Audio playback is not supported');
    }

    // Display system information
    const systemInfoRaw: unknown = voiceTest.getSystemInfo();
    const systemInfo = {
      platform: String(
        typeof systemInfoRaw === 'object' && systemInfoRaw !== null
          ? Reflect.get(systemInfoRaw, 'platform')
          : 'unknown'
      ),
      nodeVersion: String(
        typeof systemInfoRaw === 'object' && systemInfoRaw !== null
          ? Reflect.get(systemInfoRaw, 'nodeVersion')
          : 'unknown'
      ),
      ttsProvider: String(
        typeof systemInfoRaw === 'object' && systemInfoRaw !== null
          ? Reflect.get(systemInfoRaw, 'ttsProvider')
          : 'unknown'
      ),
    };

    console.log('\n📊 System Information:');
    console.log(`Platform: ${systemInfo.platform}`);
    console.log(`Node.js: ${systemInfo.nodeVersion}`);
    console.log(`TTS Provider: ${systemInfo.ttsProvider}`);
  } catch (error) {
    stopSpinner(spinner, false, '❌ Audio test failed');
    handleError(error, 'Audio Test');
  }
}

/**
 * Handler for the 'play' command.
 * Plays an existing audio file through the system's default audio output.
 *
 * @param argv - Command-line arguments parsed by yargs
 *
 * @throws {VoiceTestError} If the file doesn't exist or playback fails
 *
 * @remarks
 * Supports common audio formats:
 * - MP3
 * - WAV
 * - OGG
 *
 * The command uses the system's default audio player for playback.
 *
 * @example
 * ```bash
 * vokal play ./output.wav
 * vokal play /path/to/audio.mp3
 * ```
 */
async function handlePlayCommand(argv: ArgumentsCamelCase<PlayCommandArgs>): Promise<void> {
  const spinner = ora(`🔊 Playing audio: ${argv.file}`).start();

  try {
    const voiceTest = new VoiceTestService(argv.apiKey);
    await voiceTest.playAudio(argv.file);
    stopSpinner(spinner, true, '✅ Audio played successfully');
  } catch (error) {
    stopSpinner(spinner, false, '❌ Audio playback failed');
    handleError(error, 'Audio Playback');
  }
}

/**
 * Handler for the 'test' command.
 * Runs a comprehensive voice bot test suite or saves a sample configuration.
 *
 * @param argv - Command-line arguments parsed by yargs
 *
 * @throws {VoiceTestError} If test configuration is invalid or tests fail
 *
 * @remarks
 * This command provides two modes of operation:
 *
 * 1. **Save Sample Mode** (`--save-sample`):
 *    - Creates a sample test configuration file
 *    - Exits after saving the configuration
 *
 * 2. **Test Execution Mode** (default):
 *    - Loads test configuration from specified file
 *    - Runs the complete test suite
 *    - Generates detailed test results and metrics
 *    - Exits with code 0 on success, 1 on failure
 *
 * Test results include:
 * - Pass/fail status for each test scenario
 * - Overall test score (0-10 scale)
 * - Performance metrics (response times, accuracy)
 * - Detailed transcription and analysis
 *
 * @example
 * ```bash
 * # Create sample configuration
 * vokal test --save-sample
 *
 * # Run tests with default config
 * vokal test
 *
 * # Run tests with custom config and specific provider
 * vokal test ./my-config.json --provider vertex --debug
 *
 * # Quiet mode for CI/CD
 * vokal test --quiet
 * ```
 */
async function handleTestCommand(argv: ArgumentsCamelCase<TestCommandArgs>): Promise<void> {
  // Print banner
  console.log(VOKAL_BANNER);

  // Handle saving sample configuration
  if (argv.saveSample) {
    try {
      const configPath = argv.config || './vokal-config.json';
      writeFileSync(configPath, JSON.stringify(SAMPLE_TEST_CONFIG, null, 2));
      console.log(chalk.green(`✅ Sample configuration saved to: ${configPath}`));
      console.log(chalk.yellow('💡 Edit the configuration file and run: vokal test'));
      return;
    } catch (error) {
      handleError(error, 'Configuration Save');
    }
  }

  // Set log level based on verbose flag
  if (!argv.verbose) {
    process.env.VOKAL_LOG_LEVEL = 'USER';
  } else {
    process.env.VOKAL_LOG_LEVEL = 'VERBOSE';
  }

  const spinner = argv.quiet ? null : ora('🤖 Initializing voice bot test suite...').start();

  try {
    const testService = VoiceBotTestService.create(argv.config);

    // Stop spinner before test execution to avoid interference with conversation display
    if (spinner) {
      spinner.succeed('✅ Initialization complete');
    }

    if (!argv.quiet) {
      console.log(chalk.blue('\n🎤 Voice Bot Test Suite'));
      console.log('='.repeat(50));
      console.log(`📋 Configuration: ${argv.config}`);
      console.log(`🤖 AI Provider: ${argv.provider}`);
      console.log('='.repeat(50));
    }

    const testResult = await testService.runTestSuite();

    stopSpinner(spinner, true, '✅ Voice bot test suite completed!');

    if (!argv.quiet) {
      console.log(chalk.blue('\n📈 Final Results:'));
      console.log(
        `🎯 Score: ${testResult.summary.questionsPassed}/${testResult.summary.totalQuestions} questions correct`
      );
      console.log(`📊 Average Score: ${(testResult.summary.averageScore * 100).toFixed(0)}%`);
      console.log(`⏱️ Total Time: ${(testResult.metadata.totalTime / 1000).toFixed(1)}s`);
    }

    if (argv.debug) {
      console.info(chalk.yellow('\n🔍 Debug - Performance Metrics:'));
      console.info(JSON.stringify(testResult.performance, null, 2));
    }

    // Exit with code 0 always - we just show the score, no pass/fail
    process.exit(0);
  } catch (error) {
    stopSpinner(spinner, false, '❌ Voice bot test suite failed');
    handleError(error, 'Voice Bot Test');
  }
}

/**
 * Handler for the 'example' command.
 * Displays comprehensive usage examples and help documentation.
 *
 * @remarks
 * Shows examples for all major CLI commands including:
 * - Basic TTS generation
 * - Background audio mixing
 * - Voice and language selection
 * - Testing and playback operations
 * - Voice bot test suite usage
 * - Environment variable configuration
 *
 * @example
 * ```bash
 * vokal example
 * ```
 */
function handleExampleCommand(): void {
  console.log(`
${chalk.blue('🎤 Vokal CLI Examples:')}

${chalk.yellow('Basic TTS generation:')}
  vokal generate "Hello, world!" --language en-US --voice en-US-Neural2-D

${chalk.yellow('With background sound:')}
  vokal generate "Welcome to our cafe" -l en-US -v en-US-Neural2-F -b cafe --play

${chalk.yellow('Custom settings:')}
  vokal generate "Fast speech" -l en-US -v en-US-Neural2-A -r 1.5 -p 5.0 -o speech.mp3

${chalk.yellow('List available voices:')}
  vokal voices en-US

${chalk.yellow('List background sounds:')}
  vokal backgrounds

${chalk.yellow('Test audio playback:')}
  vokal test-audio

${chalk.yellow('Play existing audio file:')}
  vokal play /path/to/audio.mp3

${chalk.yellow('Voice Bot Testing:')}
  vokal test --save-sample              # Create sample config
  vokal test ./config.json              # Run test suite
  vokal test --provider vertex --debug  # Run with Vertex AI

${chalk.blue('Environment Variables:')}
  GOOGLE_AI_API_KEY    Google AI API key for TTS
  GEMINI_API_KEY       Alternative name for the API key

${chalk.gray('For more help on any command:')}
  vokal <command> --help
`);
}

// ============================================================================
// CLI Configuration
// ============================================================================

/**
 * Initializes and configures the yargs CLI parser with all commands and options.
 *
 * @returns Configured yargs instance ready for parsing arguments
 *
 * @remarks
 * This function sets up the complete CLI structure including:
 *
 * **Commands:**
 * - `voice generate`: Text-to-Speech generation
 * - `voices`: List available voices
 * - `backgrounds`: List background sounds
 * - `test-audio`: Test audio playback
 * - `play`: Play audio files
 * - `test`: Run voice bot tests
 * - `example`: Show usage examples
 *
 * **Global Options:**
 * - `--help, -h`: Show help information
 * - `--version, -V`: Show version number
 *
 * **Features:**
 * - Strict option and command validation
 * - Command recommendations for typos
 * - Automatic help display on failure
 * - Custom error handling
 * - Rich help documentation
 *
 * @example
 * ```typescript
 * const cli = initializeCliParser();
 * await cli.parse();
 * ```
 */
function initializeCliParser(): ReturnType<typeof yargs> {
  const packageJson = parsePackageJson(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));

  return (
    yargs(hideBin(process.argv))
      .scriptName('vokal')
      .usage('Usage: $0 <command> [options]')
      .version(packageJson.version)
      .help()
      .alias('h', 'help')
      .alias('V', 'version')
      .strictOptions()
      .strictCommands()
      .demandCommand(1, '')
      .recommendCommands()
      .epilogue('For more info: https://github.com/your-org/vokal')
      .showHelpOnFail(true, 'Specify --help for available options')
      .fail((msg, err, yargsInstance) => {
        if (msg) {
          console.error(chalk.red(msg));
          yargsInstance.showHelp('log');
        } else if (err) {
          handleError(err, 'CLI');
        }
        process.exit(1);
      })
      // Voice command with generate subcommand
      .command({
        command: 'voice <subcommand>',
        describe: 'Text-to-Speech generation with background audio mixing',
        builder: (yargs) => {
          return yargs
            .command(
              'generate <text>',
              'Generate speech from text with optional background audio',
              (y) => {
                return y
                  .positional('text', {
                    type: 'string',
                    description: 'Text to convert to speech',
                    demandOption: true,
                  })
                  .options({
                    voice: {
                      type: 'string',
                      description: 'Voice name (e.g., en-US-Neural2-D, en-IN-Neural2-B)',
                      demandOption: true,
                    },
                    lang: {
                      type: 'string',
                      description: 'Language code (e.g., en-US, en-IN)',
                      default: 'en-US',
                    },
                    encoding: {
                      type: 'string',
                      choices: ['MP3', 'WAV', 'OGG'],
                      default: 'WAV',
                      description: 'Audio encoding format',
                    },
                    rate: {
                      type: 'number',
                      default: 1.0,
                      description: 'Speaking rate (0.25 to 4.0)',
                    },
                    pitch: {
                      type: 'number',
                      default: 0.0,
                      description: 'Voice pitch (-20.0 to 20.0)',
                    },
                    output: {
                      type: 'string',
                      description: 'Output file path',
                    },
                    bg: {
                      type: 'string',
                      description:
                        'Background sound preset (office, cafe, nature, rain, phone, crowd)',
                    },
                    bgvol: {
                      type: 'number',
                      default: 0.15,
                      description: 'Background volume (0.0 to 1.0)',
                    },
                    play: {
                      type: 'boolean',
                      default: false,
                      description: 'Play audio after generation',
                    },
                    'api-key': {
                      type: 'string',
                      description: 'API key (overrides environment variable)',
                    },
                    quiet: {
                      type: 'boolean',
                      alias: 'q',
                      default: false,
                      description: 'Suppress non-essential output',
                    },
                    debug: {
                      type: 'boolean',
                      default: false,
                      description: 'Enable debug mode with verbose output',
                    },
                  });
              },
              handleGenerateCommand
            )
            .demandCommand(1, 'Please specify a voice subcommand')
            .example(
              '$0 voice generate "Hello world" --voice en-US-Neural2-D --lang en-US',
              'Generate basic speech'
            )
            .example(
              '$0 voice generate "Hello" --voice en-IN-Neural2-B --lang en-IN --bg nature --bgvol 0.5',
              'Generate with background'
            );
        },
        handler: () => {}, // No-op handler as subcommands handle everything
      })
      // Voices command
      .command({
        command: 'voices [language]',
        describe: 'List available voices',
        builder: (yargs) => {
          return yargs
            .positional('language', {
              type: 'string',
              description: 'Filter by language code (optional)',
            })
            .options({
              'api-key': {
                type: 'string',
                description: 'API key (overrides environment variable)',
              },
              format: {
                type: 'string',
                choices: ['text', 'json'],
                default: 'text',
                description: 'Output format',
              },
              quiet: {
                type: 'boolean',
                alias: 'q',
                default: false,
                description: 'Suppress non-essential output',
              },
            });
        },
        handler: handleVoicesCommand,
      })
      // Backgrounds command
      .command({
        command: 'backgrounds',
        aliases: ['bg'],
        describe: 'List available background sounds',
        handler: handleBackgroundsCommand,
      })
      // Test audio command
      .command({
        command: 'test-audio',
        describe: 'Test audio playback capability',
        builder: (yargs) => {
          return yargs.options({
            'api-key': {
              type: 'string',
              description: 'API key (overrides environment variable)',
            },
          });
        },
        handler: handleTestAudioCommand,
      })
      // Play command
      .command({
        command: 'play <file>',
        describe: 'Play an audio file',
        builder: (yargs) => {
          return yargs
            .positional('file', {
              type: 'string',
              description: 'Audio file path to play',
              demandOption: true,
            })
            .options({
              'api-key': {
                type: 'string',
                description: 'API key (overrides environment variable)',
              },
            });
        },
        handler: handlePlayCommand,
      })
      // Test command
      // @ts-expect-error - Yargs type inference creates complex types that don't exactly match TestCommandArgs, but runtime behavior is correct
      .command({
        command: 'test [config]',
        describe: 'Run voice bot test suite',
        builder: (yargs) => {
          return yargs
            .positional('config', {
              type: 'string',
              description: 'Path to test configuration JSON file',
              default: './vokal-config.json',
            })
            .options({
              'save-sample': {
                type: 'boolean',
                description: 'Save a sample configuration file and exit',
                default: false,
              },
              'api-key': {
                type: 'string',
                description: 'API key (overrides environment variable)',
              },
              provider: {
                type: 'string',
                choices: ['bedrock', 'vertex', 'openai', 'google-ai'],
                default: 'google-ai',
                description: 'AI provider for response analysis',
              },
              quiet: {
                type: 'boolean',
                alias: 'q',
                default: false,
                description: 'Suppress non-essential output',
              },
              verbose: {
                type: 'boolean',
                alias: 'v',
                default: false,
                description: 'Enable verbose logging',
              },
              debug: {
                type: 'boolean',
                default: false,
                description: 'Enable debug mode with verbose output',
              },
            });
        },
        handler: handleTestCommand,
      })
      // Example command
      .command({
        command: 'example',
        describe: 'Show usage examples',
        handler: handleExampleCommand,
      })
  );
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main CLI execution entry point.
 * Initializes the CLI parser and processes command-line arguments.
 *
 * @remarks
 * This is the primary entry point for the Vokal CLI application.
 * It performs the following operations:
 *
 * 1. Loads environment variables from .env file
 * 2. Initializes the yargs CLI parser
 * 3. Parses command-line arguments
 * 4. Executes the appropriate command handler
 * 5. Handles any errors that occur during execution
 *
 * The function uses global error handling to ensure proper error
 * reporting and process exit codes.
 *
 * @throws {Error} Any unhandled errors are caught and passed to handleError
 *
 * @example
 * ```typescript
 * // Executed automatically when the script runs
 * void main();
 * ```
 */
async function main(): Promise<void> {
  try {
    const cli = initializeCliParser();
    await cli.parse();
  } catch (error) {
    handleError(error, 'CLI');
  }
}

// Run CLI
void main();

// ============================================================================
// Process Signal Handlers
// ============================================================================

/**
 * Graceful shutdown handler for SIGINT (Ctrl+C).
 * Ensures clean exit when user interrupts the process.
 */
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️ Process interrupted by user'));
  console.log(chalk.gray('Cleaning up...'));
  process.exit(130); // Standard exit code for SIGINT
});

/**
 * Graceful shutdown handler for SIGTERM.
 * Ensures clean exit when process receives termination signal.
 */
process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n⚠️ Process terminated'));
  console.log(chalk.gray('Cleaning up...'));
  process.exit(143); // Standard exit code for SIGTERM
});
