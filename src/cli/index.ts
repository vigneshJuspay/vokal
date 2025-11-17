#!/usr/bin/env node

/**
 * Voice Test CLI
 * Command-line interface for text-to-speech with background audio mixing
 * Following Neurolink's CLI pattern with yargs
 *
 * Note: Yargs has complex type inference that results in some unavoidable type safety issues.
 * The yargs builder pattern infers types from the options definition, but TypeScript cannot
 * always properly narrow these types in handler functions. We've added proper type definitions
 * for all command arguments, but some unsafe member access warnings remain due to yargs' internal
 * type system. These are safe in practice as yargs validates the structure at runtime.
 */

import yargs, { ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import ora from 'ora';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VoiceTestService } from '../services/voice-test.js';
import { VoiceBotTestService } from '../services/voice-bot-test.js';
import { BrowserVoiceTestService } from '../services/browser-voice-test.js';
import { VoiceTestError, SAMPLE_TEST_CONFIG } from '../types/index.js';
import { writeFileSync } from 'fs';

// Load environment variables from .env file
dotenvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
}

function parsePackageJson(content: string): PackageJson {
  const obj: unknown = JSON.parse(content);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Invalid package.json format');
  }
  return {
    version: String(Reflect.get(obj, 'version') || '1.0.0'),
  };
}

const packageJson = parsePackageJson(
  readFileSync(join(__dirname, '../../../package.json'), 'utf-8')
);

/** Type definitions for command arguments */
interface GenerateCommandArgs {
  text: string;
  voice: string;
  lang: string;
  encoding: 'MP3' | 'WAV' | 'OGG';
  rate: number;
  pitch: number;
  output?: string;
  bg?: string;
  bgvol: number;
  play: boolean;
  apiKey?: string;
  quiet: boolean;
  debug: boolean;
}

interface VoicesCommandArgs {
  language?: string;
  apiKey?: string;
  format: string;
  quiet: boolean;
}

interface TestAudioCommandArgs {
  apiKey?: string;
}

interface PlayCommandArgs {
  file: string;
  apiKey?: string;
}

interface TestCommandArgs {
  config: string;
  saveSample: boolean;
  apiKey?: string;
  provider: string;
  quiet: boolean;
  debug: boolean;
}

interface BrowserTestCommandArgs {
  url: string;
  config: string;
  iterations: number;
  headless: boolean;
  timeout: number;
  delay: number;
  profile?: string;
  quiet: boolean;
}

interface Voice {
  name: string;
  gender: string;
  type: string;
  languageCode: string;
}

interface BackgroundSound {
  name: string;
  description: string;
  defaultVolume: number;
  loop: boolean;
}

/**
 * Type guard to check if value is an Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely convert unknown to Error
 */
function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Type guard for Voice
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

// Global error handler
function handleError(error: unknown, context: string = 'Voice Test'): void {
  const err = toError(error);
  if (err instanceof VoiceTestError) {
    console.error(chalk.red(`❌ ${context} Error [${err.code}]: ${err.message}`));
  } else {
    console.error(chalk.red(`❌ ${context} Error: ${err.message}`));
  }
  process.exit(1);
}

// Initialize CLI parser
function initializeCliParser(): ReturnType<typeof yargs> {
  return (
    yargs(hideBin(process.argv))
      .scriptName('voice-test')
      .usage('Usage: $0 <command> [options]')
      .version(packageJson.version)
      .help()
      .alias('h', 'help')
      .alias('V', 'version')
      .strictOptions()
      .strictCommands()
      .demandCommand(1, '')
      .recommendCommands()
      .epilogue('For more info: https://github.com/your-org/voice-test')
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
              async (argv: ArgumentsCamelCase<GenerateCommandArgs>) => {
                const spinner = argv.quiet ? null : ora('🎤 Generating speech...').start();

                try {
                  const voiceTest = new VoiceTestService({
                    apiKey: argv.apiKey,
                    defaultOutputDir: process.cwd(),
                  });

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

                  if (spinner) {
                    spinner.succeed(chalk.green('✅ Speech generation completed!'));
                  }

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
                  if (spinner) {
                    spinner.fail('Speech generation failed');
                  }
                  handleError(error, 'Speech Generation');
                }
              }
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
        handler: async (argv: ArgumentsCamelCase<VoicesCommandArgs>) => {
          const spinner = argv.quiet ? null : ora('🔍 Fetching available voices...').start();

          try {
            const voiceTest = new VoiceTestService({ apiKey: argv.apiKey });
            const voicesResult: unknown = await voiceTest.getAvailableVoices(argv.language);
            const voices: Voice[] = [];
            if (Array.isArray(voicesResult)) {
              for (const item of voicesResult) {
                if (isVoice(item)) {
                  voices.push(item);
                }
              }
            }

            if (spinner) {
              spinner.succeed(
                chalk.green(
                  `✅ Found ${voices.length} voices${argv.language ? ` for ${argv.language}` : ''}`
                )
              );
            }

            if (argv.format === 'json') {
              console.log(JSON.stringify(voices, null, 2));
            } else {
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
                    `\n💡 Use with: voice-test generate "text" --language ${voices[0].languageCode} --voice ${voices[0].name}`
                  )
                );
              }
            }
          } catch (error) {
            if (spinner) {
              spinner.fail('Failed to fetch voices');
            }
            handleError(error, 'Voice Listing');
          }
        },
      })
      .command({
        command: 'backgrounds',
        aliases: ['bg'],
        describe: 'List available background sounds',
        handler: () => {
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

            console.log(
              chalk.gray(
                `💡 Use with: voice-test generate "text" -l en-US -v en-US-Neural2-D --background ${backgrounds[0].name}`
              )
            );
          } catch (error) {
            handleError(error, 'Background Sounds');
          }
        },
      })
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
        handler: async (argv: ArgumentsCamelCase<TestAudioCommandArgs>) => {
          const spinner = ora('🔧 Testing audio playback...').start();

          try {
            const voiceTest = new VoiceTestService({ apiKey: argv.apiKey });
            const isSupported = await voiceTest.testAudioPlayback();

            if (isSupported) {
              spinner.succeed(chalk.green('✅ Audio playback is supported'));
            } else {
              spinner.fail(chalk.red('❌ Audio playback is not supported'));
            }

            interface SystemInfo {
              platform: string;
              nodeVersion: string;
              ttsProvider: string;
            }

            const systemInfoRaw: unknown = voiceTest.getSystemInfo();
            const systemInfo: SystemInfo = {
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
            spinner.fail('Audio test failed');
            handleError(error, 'Audio Test');
          }
        },
      })
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
        handler: async (argv: ArgumentsCamelCase<PlayCommandArgs>) => {
          const spinner = ora(`🔊 Playing audio: ${argv.file}`).start();

          try {
            const voiceTest = new VoiceTestService({ apiKey: argv.apiKey });
            await voiceTest.playAudio(argv.file);
            spinner.succeed(chalk.green('✅ Audio played successfully'));
          } catch (error) {
            spinner.fail('Audio playback failed');
            handleError(error, 'Audio Playback');
          }
        },
      })
      // @ts-expect-error - Yargs type inference creates complex types that don't exactly match TestCommandArgs, but runtime behavior is correct
      .command({
        command: 'test [config]',
        describe: 'Run voice bot test suite',
        builder: (yargs) => {
          return yargs
            .positional('config', {
              type: 'string',
              description: 'Path to test configuration JSON file',
              default: './voice-test-config.json',
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
              debug: {
                type: 'boolean',
                default: false,
                description: 'Enable debug mode with verbose output',
              },
            });
        },
        handler: async (argv: ArgumentsCamelCase<TestCommandArgs>) => {
          // Handle saving sample configuration
          if (argv.saveSample) {
            try {
              const configPath = argv.config || './voice-test-config.json';
              writeFileSync(configPath, JSON.stringify(SAMPLE_TEST_CONFIG, null, 2));
              console.log(chalk.green(`✅ Sample configuration saved to: ${configPath}`));
              console.log(chalk.yellow('💡 Edit the configuration file and run: voice-test test'));
              return;
            } catch (error) {
              handleError(error, 'Configuration Save');
            }
          }

          const spinner = argv.quiet
            ? null
            : ora('🤖 Initializing voice bot test suite...').start();

          try {
            const testService = VoiceBotTestService.create(argv.config, argv.apiKey);

            if (spinner) {
              spinner.text = '🎯 Running voice bot tests...';
            }

            if (!argv.quiet) {
              console.log(chalk.blue('\n🎤 Voice Bot Test Suite'));
              console.log('='.repeat(50));
              console.log(`📋 Configuration: ${argv.config}`);
              console.log(`🤖 AI Provider: ${argv.provider}`);
              console.log('='.repeat(50));
            }

            const testResult = await testService.runTestSuite();

            if (spinner) {
              spinner.succeed(chalk.green('✅ Voice bot test suite completed!'));
            }

            if (!argv.quiet) {
              // Additional result summary
              console.log(chalk.blue('\n📈 Final Results:'));
              console.log(
                `🎯 Overall: ${testResult.summary.testPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`
              );
              console.log(`📊 Score: ${testResult.summary.averageScore.toFixed(1)}/10`);
              console.log(`⏱️ Total Time: ${(testResult.metadata.totalTime / 1000).toFixed(1)}s`);
            }

            if (argv.debug) {
              console.info(chalk.yellow('\n🔍 Debug - Performance Metrics:'));
              console.info(JSON.stringify(testResult.performance, null, 2));
            }

            // Exit with appropriate code
            process.exit(testResult.summary.testPassed ? 0 : 1);
          } catch (error) {
            if (spinner) {
              spinner.fail('Voice bot test suite failed');
            }
            handleError(error, 'Voice Bot Test');
          }
        },
      })
      .command({
        command: 'browser-test <url> [config]',
        describe:
          'Run browser-based voice bot test (all questions in one session, repeated multiple times)',
        builder: (yargs) => {
          return yargs
            .positional('url', {
              type: 'string',
              description: 'URL of your voice assistant web app',
              demandOption: true,
            })
            .positional('config', {
              type: 'string',
              description: 'Path to test configuration JSON file',
              default: './voice-test-config.json',
            })
            .options({
              iterations: {
                type: 'number',
                description: 'Number of times to repeat all questions (default: 50)',
                default: 50,
              },
              headless: {
                type: 'boolean',
                description: 'Run browser in headless mode',
                default: false,
              },
              timeout: {
                type: 'number',
                description: 'Response timeout in milliseconds',
                default: 60000,
              },
              delay: {
                type: 'number',
                description: 'Delay before starting each question (ms)',
                default: 500,
              },
              profile: {
                type: 'string',
                description: 'Chrome user data directory (to use existing profile with login)',
              },
              quiet: {
                type: 'boolean',
                alias: 'q',
                default: false,
                description: 'Suppress non-essential output',
              },
            });
        },
        handler: async (argv: ArgumentsCamelCase<BrowserTestCommandArgs>) => {
          const spinner = argv.quiet ? null : ora('🌐 Initializing browser-based test...').start();

          try {
            // Load configuration to get questions
            const configContent = readFileSync(argv.config, 'utf-8');
            const configObj: unknown = JSON.parse(configContent);
            if (
              typeof configObj !== 'object' ||
              configObj === null ||
              !Array.isArray(Reflect.get(configObj, 'questions'))
            ) {
              throw new Error(
                'Invalid configuration file format: must be an object with a questions array'
              );
            }

            // Extract questions array for display
            const questions: unknown = Reflect.get(configObj, 'questions');
            const questionCount = Array.isArray(questions) ? questions.length : 0;

            if (spinner) {
              spinner.succeed(chalk.green('✅ Configuration loaded'));
            }

            if (!argv.quiet) {
              console.log(chalk.blue('\n🌐 Browser-Based Voice Bot Test'));
              console.log('='.repeat(60));
              console.log(`📋 Configuration: ${argv.config}`);
              console.log(`🔗 URL: ${argv.url}`);
              console.log(`📝 Questions per iteration: ${questionCount}`);
              console.log(`🔁 Iterations: ${argv.iterations}`);
              console.log(`📊 Total tests: ${questionCount * argv.iterations}`);
              console.log(`🖥️ Headless: ${argv.headless ? 'Yes' : 'No'}`);
              console.log(`⏱️ Timeout: ${argv.timeout}ms`);
              console.log(`⏸️ Question delay: ${argv.delay}ms`);
              console.log('='.repeat(60));
              console.log(chalk.yellow('\n💡 All questions will run in ONE session per iteration'));
              console.log(chalk.yellow(`💡 Browser will open/close ${argv.iterations} times`));
              console.log(
                chalk.yellow('💡 Make sure your voice assistant is running at the specified URL\n')
              );
            }

            // Create browser test service
            const browserTest = BrowserVoiceTestService.create(
              {
                url: argv.url,
                headless: argv.headless,
                questionDelay: argv.delay,
                iterations: argv.iterations,
              },
              argv.config
            );

            // Run the full test suite
            const testResult = await browserTest.runTestSuite();

            if (!argv.quiet) {
              // Additional result summary
              console.log(chalk.blue('\n📈 Final Results:'));
              console.log(
                `🎯 Overall: ${testResult.summary.testPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`
              );
              console.log(`📊 Score: ${testResult.summary.averageScore.toFixed(1)}/10`);
              console.log(`⏱️ Total Time: ${(testResult.metadata.totalTime / 1000).toFixed(1)}s`);
              console.log(
                `✅ Passed: ${testResult.summary.questionsPassed}/${testResult.summary.totalQuestions}`
              );
              console.log(
                `❌ Failed: ${testResult.summary.questionsFailed}/${testResult.summary.totalQuestions}`
              );
            }

            // Exit with appropriate code
            process.exit(testResult.summary.testPassed ? 0 : 1);
          } catch (error) {
            if (spinner) {
              spinner.fail('Browser-based test failed');
            }
            handleError(error, 'Browser Test');
          }
        },
      })
      .command({
        command: 'example',
        describe: 'Show usage examples',
        handler: () => {
          console.log(`
${chalk.blue('🎤 Voice Test CLI Examples:')}

${chalk.yellow('Basic TTS generation:')}
  voice-test generate "Hello, world!" --language en-US --voice en-US-Neural2-D

${chalk.yellow('With background sound:')}
  voice-test gen "Welcome to our cafe" -l en-US -v en-US-Neural2-F -b cafe --play

${chalk.yellow('Custom settings:')}
  voice-test gen "Fast speech" -l en-US -v en-US-Neural2-A -r 1.5 -p 5.0 -o speech.mp3

${chalk.yellow('List available voices:')}
  voice-test voices en-US

${chalk.yellow('List background sounds:')}
  voice-test backgrounds

${chalk.yellow('Test audio playback:')}
  voice-test test-audio

${chalk.yellow('Play existing audio file:')}
  voice-test play /path/to/audio.mp3

${chalk.yellow('Voice Bot Testing:')}
  voice-test test --save-sample              # Create sample config
  voice-test test ./config.json              # Run test suite
  voice-test test --provider vertex --debug  # Run with Vertex AI

${chalk.blue('Environment Variables:')}
  GOOGLE_AI_API_KEY    Google AI API key for TTS
  GEMINI_API_KEY       Alternative name for the API key

${chalk.gray('For more help on any command:')}
  voice-test <command> --help
`);
        },
      })
  );
}

// Initialize and run CLI
const cli = initializeCliParser();

// Parse and execute
void (async (): Promise<void> => {
  try {
    await cli.parse();
  } catch (error) {
    handleError(error, 'CLI');
  }
})();
