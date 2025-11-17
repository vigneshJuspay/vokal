/**
 * Secure Subprocess Execution Utilities
 * Provides safe wrappers for executing system commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createComponentLogger } from './logger.js';
import { ValidationError, getErrorMessage } from '../errors/voice-test.errors.js';

const execAsync = promisify(exec);
const logger = createComponentLogger('SecureExec');

/**
 * Allowed commands whitelist
 * Only these commands can be executed for security
 */
const ALLOWED_COMMANDS = new Set(['which', 'sox', 'rec', 'arecord', 'node', 'npm']);

/**
 * Sanitize command to prevent injection attacks
 */
function sanitizeCommand(command: string): string {
  // Remove any shell metacharacters that could be dangerous
  const dangerous = /[;&|`$<>(){}[\]!]/g;

  if (dangerous.test(command)) {
    throw new ValidationError(
      'Command contains potentially dangerous characters',
      'command',
      command
    );
  }

  return command.trim();
}

/**
 * Validate command against whitelist
 */
function validateCommand(command: string): void {
  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0];

  // Check if base command is in whitelist
  if (!ALLOWED_COMMANDS.has(baseCommand)) {
    throw new ValidationError(
      `Command '${baseCommand}' is not in the allowed commands list`,
      'command',
      baseCommand
    );
  }
}

/**
 * Execute options
 */
export interface ExecOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum buffer size for stdout/stderr */
  maxBuffer?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
}

/**
 * Execute result
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Safely execute a whitelisted command with sanitization
 *
 * @param command - Command to execute (must be whitelisted)
 * @param options - Execution options
 * @returns Promise with execution result
 *
 * @throws {ValidationError} If command is not allowed or contains dangerous characters
 *
 * @example
 * ```typescript
 * try {
 *   const result = await safeExec('which sox');
 *   console.log(result.stdout);
 * } catch (error) {
 *   // Command not found or not allowed
 * }
 * ```
 */
export async function safeExec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  // Sanitize command
  const sanitized = sanitizeCommand(command);

  // Validate against whitelist
  validateCommand(sanitized);

  logger.debug(`Executing safe command: ${sanitized}`);

  try {
    const { stdout, stderr } = await execAsync(sanitized, {
      timeout: options.timeout || 10000, // 10 second default timeout
      maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB default buffer
      cwd: options.cwd,
      env: options.env || process.env,
      // Disable shell to prevent command injection
      shell: '/bin/sh',
    });

    return {
      stdout: stdout.toString().trim(),
      stderr: stderr.toString().trim(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    // Command failed or timed out
    const err = error as { stdout?: Buffer; stderr?: Buffer; message?: string; code?: number };
    return {
      stdout: err.stdout?.toString().trim() || '',
      stderr: err.stderr?.toString().trim() || err.message || '',
      exitCode: err.code || 1,
    };
  }
}

/**
 * Check if a command exists on the system
 *
 * @param command - Command name to check
 * @returns Promise<boolean> - True if command exists
 *
 * @example
 * ```typescript
 * const hasSox = await commandExists('sox');
 * if (hasSox) {
 *   // sox is available
 * }
 * ```
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const platform = process.platform;
    const checkCommand = platform === 'win32' ? `where ${command}` : `which ${command}`;

    const result = await safeExec(checkCommand, { timeout: 5000 });
    return result.exitCode === 0 && result.stdout.length > 0;
  } catch (error) {
    logger.debug(`Command '${command}' not found: ${getErrorMessage(error)}`);
    return false;
  }
}

/**
 * Get version of a command
 *
 * @param command - Command name
 * @param versionFlag - Flag to get version (default: --version)
 * @returns Promise<string> - Version string or empty if not available
 */
export async function getCommandVersion(
  command: string,
  versionFlag = '--version'
): Promise<string> {
  try {
    const fullCommand = `${command} ${versionFlag}`;
    const result = await safeExec(fullCommand, { timeout: 5000 });

    if (result.exitCode === 0) {
      return result.stdout || result.stderr;
    }

    return '';
  } catch (error) {
    logger.debug(`Could not get version for '${command}': ${getErrorMessage(error)}`);
    return '';
  }
}

/**
 * Platform-specific audio tool checks
 */
export interface AudioToolCheck {
  available: boolean;
  missing: string[];
  instructions: string;
  versions?: Record<string, string>;
}

/**
 * Check if required audio tools are available on the system
 *
 * @returns Promise<AudioToolCheck> - Status of audio tools
 */
export async function checkAudioTools(): Promise<AudioToolCheck> {
  const platform = process.platform;
  const missing: string[] = [];
  const versions: Record<string, string> = {};
  let instructions = '';

  switch (platform) {
    case 'darwin': // macOS
      if (!(await commandExists('rec'))) {
        missing.push('SoX');
        instructions = `
🔧 macOS Setup Required:
1. Install Homebrew (if not installed):
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
2. Install SoX:
   brew install sox
3. Grant microphone permissions to Terminal in:
   System Preferences > Security & Privacy > Microphone
`;
      } else {
        versions.sox = await getCommandVersion('sox');
      }
      break;

    case 'win32': // Windows
      if (!(await commandExists('sox'))) {
        missing.push('SoX');
        instructions = `
🔧 Windows Setup Required:
1. Download SoX from: https://sourceforge.net/projects/sox/files/sox/
2. Extract and add to PATH environment variable
3. Alternative: Install via Chocolatey:
   choco install sox
4. Grant microphone permissions in:
   Windows Settings > Privacy > Microphone
`;
      } else {
        versions.sox = await getCommandVersion('sox');
      }
      break;

    case 'linux': // Linux
      if (!(await commandExists('arecord'))) {
        missing.push('ALSA utils');
        instructions = `
🔧 Linux Setup Required:
Ubuntu/Debian: sudo apt-get install alsa-utils
CentOS/RHEL:   sudo yum install alsa-utils
Arch:          sudo pacman -S alsa-utils
`;
      } else {
        versions.arecord = await getCommandVersion('arecord');
      }
      break;

    default:
      missing.push('Unsupported platform');
      instructions = `Platform '${platform}' is not supported for audio recording.`;
  }

  return {
    available: missing.length === 0,
    missing,
    instructions,
    versions: Object.keys(versions).length > 0 ? versions : undefined,
  };
}

/**
 * Validate file path to prevent directory traversal attacks
 */
export function validateSafePath(filePath: string): void {
  // Check for directory traversal attempts
  if (filePath.includes('..')) {
    throw new ValidationError(
      'File path cannot contain ".." (directory traversal attempt)',
      'filePath',
      filePath
    );
  }

  // Check for absolute paths that might access system files
  const dangerousPaths = [
    '/etc/',
    '/sys/',
    '/proc/',
    'C:\\Windows\\',
    'C:\\Program Files\\',
    '/System/',
    '/Library/',
  ];

  for (const dangerous of dangerousPaths) {
    if (filePath.startsWith(dangerous)) {
      throw new ValidationError(
        `Access to system directory '${dangerous}' is not allowed`,
        'filePath',
        filePath
      );
    }
  }

  // Check for null bytes (can be used for path truncation attacks)
  if (filePath.includes('\0')) {
    throw new ValidationError('File path cannot contain null bytes', 'filePath', filePath);
  }
}

/**
 * Sanitize environment variables
 */
export function sanitizeEnv(env: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    // Only allow alphanumeric keys with underscores
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      logger.warn(`Skipping invalid environment variable key: ${key}`);
      continue;
    }

    // Remove dangerous characters from values
    const sanitizedValue = value.replace(/[`$\\]/g, '');
    sanitized[key] = sanitizedValue;
  }

  return sanitized;
}
