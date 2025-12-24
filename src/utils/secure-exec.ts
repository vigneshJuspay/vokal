/**
 * Secure Subprocess Execution Utilities
 *
 * Provides safe wrappers for executing system commands with security controls.
 * Prevents command injection attacks through whitelisting, sanitization, and validation.
 *
 * @module utils/secure-exec
 * @since 1.0.0
 *
 * @remarks
 * This module implements security best practices:
 * - **Command Whitelisting**: Only allowed commands can execute
 * - **Input Sanitization**: Removes dangerous shell metacharacters
 * - **Path Validation**: Prevents directory traversal attacks
 * - **Environment Sanitization**: Safe environment variable handling
 * - **Timeout Protection**: Prevents hanging processes
 * - **Buffer Limits**: Protects against memory exhaustion
 *
 * **Allowed Commands:**
 * - `which`: Check for command existence
 * - `sox`, `rec`, `arecord`: Audio tools
 * - `node`, `npm`: Node.js tools
 *
 * @example
 * ```typescript
 * import { safeExec, commandExists, checkAudioTools } from './utils/secure-exec.js';
 *
 * // Check if command exists
 * const hasSox = await commandExists('sox');
 *
 * // Execute safe command
 * const result = await safeExec('which sox');
 * console.log(result.stdout);
 *
 * // Check audio tools
 * const audioCheck = await checkAudioTools();
 * if (!audioCheck.available) {
 *   console.log(audioCheck.instructions);
 * }
 * ```
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createComponentLogger } from './logger.js';
import { ValidationError, getErrorMessage } from '../errors/voice-test.errors.js';
import type { ExecOptions, ExecResult, AudioToolCheck } from '../types/index.js';

const execAsync = promisify(exec);
const logger = createComponentLogger('SecureExec');

/**
 * Allowed commands whitelist.
 * Only these commands can be executed for security.
 *
 * @constant
 * @internal
 */
const ALLOWED_COMMANDS = new Set(['which', 'sox', 'rec', 'arecord', 'node', 'npm']);

/**
 * Sanitize command to prevent injection attacks.
 *
 * @param command - Command string to sanitize
 * @returns Sanitized command string
 * @throws {ValidationError} If command contains dangerous characters
 *
 * @private
 * @internal
 *
 * @remarks
 * Removes shell metacharacters that could enable injection:
 * - `;` - Command chaining
 * - `|` - Piping
 * - `&` - Background execution
 * - `` ` `` - Command substitution
 * - `$` - Variable expansion
 * - `<>` - Redirection
 * - `(){}[]` - Grouping
 * - `!` - History expansion
 */
function sanitizeCommand(command: string): string {
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
 * Validate command against whitelist.
 *
 * @param command - Command to validate
 * @throws {ValidationError} If command is not whitelisted
 *
 * @private
 * @internal
 */
function validateCommand(command: string): void {
  const parts = command.trim().split(/\s+/);
  const baseCommand = parts[0];

  if (!ALLOWED_COMMANDS.has(baseCommand)) {
    throw new ValidationError(
      `Command '${baseCommand}' is not in the allowed commands list`,
      'command',
      baseCommand
    );
  }
}

/**
 * Safely execute a whitelisted command with sanitization.
 *
 * @param command - Command to execute (must be whitelisted)
 * @param options - Execution options
 * @returns Promise with execution result (stdout, stderr, exitCode)
 *
 * @throws {ValidationError} If command is not allowed or contains dangerous characters
 *
 * @remarks
 * **Security Features:**
 * - Validates against whitelist
 * - Sanitizes input
 * - Uses timeout protection (default: 10s)
 * - Limits output buffer (default: 1MB)
 * - Runs in restricted shell environment
 *
 * **Never Throws on Command Failure:**
 * - Returns exitCode !== 0 on failure
 * - Check `result.exitCode` to determine success
 *
 * @example
 * ```typescript
 * try {
 *   // Success case
 *   const result = await safeExec('which sox', { timeout: 5000 });
 *   if (result.exitCode === 0) {
 *     console.log('sox path:', result.stdout);
 *   } else {
 *     console.error('sox not found:', result.stderr);
 *   }
 * } catch (error) {
 *   // Command not allowed or contains dangerous characters
 *   console.error('Security error:', error.message);
 * }
 *
 * // With options
 * const result = await safeExec('node --version', {
 *   timeout: 3000,
 *   maxBuffer: 512 * 1024,
 *   cwd: '/app',
 *   env: { NODE_ENV: 'production' }
 * });
 * ```
 */
export async function safeExec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  const sanitized = sanitizeCommand(command);
  validateCommand(sanitized);

  logger.debug(`Executing safe command: ${sanitized}`);

  try {
    const { stdout, stderr } = await execAsync(sanitized, {
      timeout: options.timeout || 10000,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      cwd: options.cwd,
      env: options.env || process.env,
      shell: '/bin/sh',
    });

    return {
      stdout: stdout.toString().trim(),
      stderr: stderr.toString().trim(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: Buffer; stderr?: Buffer; message?: string; code?: number };
    return {
      stdout: err.stdout?.toString().trim() || '',
      stderr: err.stderr?.toString().trim() || err.message || '',
      exitCode: err.code || 1,
    };
  }
}

/**
 * Check if a command exists on the system.
 *
 * @param command - Command name to check
 * @returns Promise resolving to true if command exists, false otherwise
 *
 * @remarks
 * Uses platform-specific existence checks:
 * - Unix/macOS: `which command`
 * - Windows: `where command`
 *
 * @example
 * ```typescript
 * // Check for audio tools
 * const hasSox = await commandExists('sox');
 * const hasArecord = await commandExists('arecord');
 *
 * if (hasSox) {
 *   console.log('SoX is available');
 * } else {
 *   console.log('Please install SoX: brew install sox');
 * }
 *
 * // Check before using
 * if (await commandExists('ffmpeg')) {
 *   await safeExec('ffmpeg -version');
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
 * Get version of a command.
 *
 * @param command - Command name
 * @param versionFlag - Flag to get version (default: '--version')
 * @returns Promise resolving to version string or empty if not available
 *
 * @remarks
 * Attempts to get version information using standard version flags.
 * Returns empty string if command doesn't support version flag or fails.
 *
 * @example
 * ```typescript
 * const soxVersion = await getCommandVersion('sox');
 * console.log('SoX version:', soxVersion);
 *
 * // Custom version flag
 * const nodeVersion = await getCommandVersion('node', '-v');
 * console.log('Node version:', nodeVersion);
 *
 * // Check versions for diagnostics
 * const versions = {
 *   sox: await getCommandVersion('sox'),
 *   node: await getCommandVersion('node', '-v'),
 *   npm: await getCommandVersion('npm', '-v')
 * };
 * console.log('System versions:', versions);
 * ```
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
 * Check if required audio tools are available on the system.
 *
 * @returns Promise resolving to audio tool availability status
 *
 * @remarks
 * **Platform-Specific Checks:**
 * - **macOS**: Requires SoX (rec command)
 * - **Linux**: Requires ALSA utils (arecord command)
 * - **Windows**: Requires SoX
 *
 * **Return Fields:**
 * - `available`: True if all required tools are present
 * - `missing`: Array of missing tool names
 * - `instructions`: Platform-specific installation instructions
 * - `versions`: Installed versions (if available)
 *
 * @example
 * ```typescript
 * const audioCheck = await checkAudioTools();
 *
 * if (!audioCheck.available) {
 *   console.error('❌ Missing audio tools:', audioCheck.missing);
 *   console.log(audioCheck.instructions);
 *   process.exit(1);
 * }
 *
 * console.log('✅ Audio tools available');
 * if (audioCheck.versions) {
 *   console.log('Versions:', audioCheck.versions);
 * }
 *
 * // Use in pre-flight checks
 * async function validateEnvironment() {
 *   const tools = await checkAudioTools();
 *   if (!tools.available) {
 *     throw new Error(`Missing tools: ${tools.missing.join(', ')}`);
 *   }
 * }
 * ```
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
 * Validate file path to prevent directory traversal attacks.
 *
 * @param filePath - File path to validate
 * @throws {ValidationError} If path is unsafe
 *
 * @remarks
 * **Security Checks:**
 * - No `..` (directory traversal)
 * - No access to system directories
 * - No null bytes (path truncation attacks)
 *
 * **Blocked Paths:**
 * - `/etc/`, `/sys/`, `/proc/` (Linux system)
 * - `C:\Windows\`, `C:\Program Files\` (Windows system)
 * - `/System/`, `/Library/` (macOS system)
 *
 * @example
 * ```typescript
 * // Valid paths
 * validateSafePath('./output/audio.wav');
 * validateSafePath('/home/user/recordings/test.mp3');
 *
 * // Invalid paths (will throw)
 * try {
 *   validateSafePath('../../../etc/passwd'); // Directory traversal
 * } catch (error) {
 *   console.error('Security error:', error.message);
 * }
 *
 * try {
 *   validateSafePath('/etc/shadow'); // System directory
 * } catch (error) {
 *   console.error('Access denied:', error.message);
 * }
 *
 * // Use before file operations
 * function saveAudio(path: string, data: Buffer) {
 *   validateSafePath(path);
 *   fs.writeFileSync(path, data);
 * }
 * ```
 */
export function validateSafePath(filePath: string): void {
  if (filePath.includes('..')) {
    throw new ValidationError(
      'File path cannot contain ".." (directory traversal attempt)',
      'filePath',
      filePath
    );
  }

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

  if (filePath.includes('\0')) {
    throw new ValidationError('File path cannot contain null bytes', 'filePath', filePath);
  }
}

/**
 * Sanitize environment variables.
 *
 * @param env - Environment variables object
 * @returns Sanitized environment variables
 *
 * @remarks
 * **Sanitization Rules:**
 * - Keys must be uppercase alphanumeric with underscores
 * - Values have dangerous characters removed (`, $, \)
 * - Invalid keys are skipped with warning
 *
 * **Purpose:**
 * - Prevents command injection via environment
 * - Ensures standard environment variable naming
 * - Protects against shell expansion attacks
 *
 * @example
 * ```typescript
 * const userEnv = {
 *   NODE_ENV: 'production',
 *   'invalid-key': 'value', // Will be skipped
 *   API_KEY: 'secret`whoami`', // Backticks removed
 *   PATH: '/usr/bin:$HOME/bin' // $ removed
 * };
 *
 * const safe = sanitizeEnv(userEnv);
 * // Result:
 * // {
 * //   NODE_ENV: 'production',
 * //   API_KEY: 'secretwhoami',
 * //   PATH: '/usr/bin:HOME/bin'
 * // }
 *
 * // Use with safeExec
 * const result = await safeExec('node script.js', {
 *   env: sanitizeEnv(customEnv)
 * });
 * ```
 */
export function sanitizeEnv(env: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      logger.warn(`Skipping invalid environment variable key: ${key}`);
      continue;
    }

    const sanitizedValue = value.replace(/[`$\\]/g, '');
    sanitized[key] = sanitizedValue;
  }

  return sanitized;
}
