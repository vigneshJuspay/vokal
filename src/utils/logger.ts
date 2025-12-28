/**
 * Professional Logger Implementation
 *
 * Provides structured logging with levels, timestamps, colors, and context.
 * Implements the Logger interface for consistent logging across the application.
 *
 * @module utils/logger
 * @since 1.0.0
 *
 * @remarks
 * This module provides:
 * - **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
 * - **Colored Output**: ANSI color codes for terminal
 * - **Contextual Logging**: Component-specific loggers
 * - **Timestamp Support**: ISO 8601 timestamps
 * - **Silent Mode**: For testing or quiet operation
 *
 * @example
 * ```typescript
 * import { ConsoleLogger, LogLevel } from './utils/logger.js';
 *
 * // Basic logger
 * const logger = new ConsoleLogger();
 * logger.info('Application started');
 * logger.warn('This is a warning');
 *
 * // Component logger with context
 * const audioLogger = new ConsoleLogger('Audio', { level: LogLevel.DEBUG });
 * audioLogger.debug('Audio system initialized');
 *
 * // Silent logger for testing
 * const testLogger = new SilentLogger();
 * testLogger.error('This will not be printed');
 * ```
 */

import { Logger, LogLevel, LoggerConfig } from '../types/index.js';

export { LogLevel } from '../types/index.js';

/**
 * ANSI color codes for terminal output.
 *
 * @constant
 * @internal
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

/**
 * Console Logger with advanced features.
 *
 * @class
 * @implements {Logger}
 *
 * @remarks
 * Implements structured logging with:
 * - Configurable minimum log level
 * - Optional ANSI color output
 * - Contextual information
 * - ISO 8601 timestamps
 * - Automatic argument formatting (JSON for objects)
 */
export class ConsoleLogger implements Logger {
  private context?: string;
  private minLevel: LogLevel;
  private enableColors: boolean;

  /**
   * Creates a new ConsoleLogger instance.
   *
   * @param context - Optional context label for the logger (e.g., component name)
   * @param config - Optional logger configuration
   * @param config.level - Minimum log level to display (default: INFO)
   * @param config.enableColors - Enable ANSI color codes (default: true)
   *
   * @example
   * ```typescript
   * // Basic logger
   * const logger = new ConsoleLogger();
   *
   * // Component logger
   * const audioLogger = new ConsoleLogger('AudioRecording');
   *
   * // Debug logger without colors
   * const debugLogger = new ConsoleLogger('Debug', {
   *   level: LogLevel.DEBUG,
   *   enableColors: false
   * });
   * ```
   */
  constructor(context?: string, config: Partial<LoggerConfig> = {}) {
    this.context = context;

    // Check for VOKAL_LOG_LEVEL environment variable
    // Default to USER level (only user-facing messages) unless verbose is enabled
    const envLogLevel = process.env.VOKAL_LOG_LEVEL;
    if (envLogLevel === 'VERBOSE') {
      this.minLevel = config.level ?? LogLevel.DEBUG;
    } else {
      // Default to USER level - only show user-facing messages
      this.minLevel = LogLevel.USER;
    }

    this.enableColors = config.enableColors ?? true;
  }

  /**
   * Check if a log level should be displayed.
   *
   * @param level - Log level to check
   * @returns True if level should be logged, false otherwise
   *
   * @private
   * @internal
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  /**
   * Get human-readable name for log level.
   *
   * @param level - Log level
   * @returns String representation of log level
   *
   * @private
   * @internal
   */
  private getLevelName(level: LogLevel): string {
    const levelValue = level as number;
    switch (levelValue) {
      case 0: // DEBUG
        return 'DEBUG';
      case 1: // INFO
        return 'INFO';
      case 2: // WARN
        return 'WARN';
      case 3: // ERROR
        return 'ERROR';
      case 5: // USER
        return 'USER';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Format log message with timestamp, level, context, and colors.
   *
   * @param level - Log level
   * @param message - Main log message
   * @param args - Additional arguments to include
   * @returns Formatted log message string
   *
   * @private
   * @internal
   *
   * @remarks
   * Format: `{timestamp} [{level}][{context}] {message} {args}`
   * - Objects are JSON.stringify'd
   * - Colors applied based on log level
   * - Context included if set
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: unknown[]
  ): string {
    const timestamp = new Date().toISOString();
    const levelStr = this.getLevelName(level);
    const contextStr = this.context ? `[${this.context}]` : '';

    // Format additional arguments
    const argsStr =
      args.length > 0
        ? ' ' +
          args
            .map((arg: unknown) => {
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            })
            .join(' ')
        : '';

    let colorCode = '';
    let resetCode = '';

    if (this.enableColors) {
      resetCode = COLORS.reset;
      const levelValue = level as number;
      switch (levelValue) {
        case 0: // DEBUG
          colorCode = COLORS.dim;
          break;
        case 1: // INFO
          colorCode = COLORS.cyan;
          break;
        case 2: // WARN
          colorCode = COLORS.yellow;
          break;
        case 3: // ERROR
          colorCode = COLORS.red;
          break;
      }
    }

    return `${colorCode}${timestamp} [${levelStr}]${contextStr} ${message}${argsStr}${resetCode}`;
  }

  /**
   * Log a debug message.
   *
   * @param message - Debug message
   * @param args - Additional arguments
   *
   * @remarks
   * Debug messages are typically used for detailed diagnostic information.
   * Only displayed if log level is DEBUG or lower.
   *
   * @example
   * ```typescript
   * logger.debug('Processing audio chunk', { size: 1024, format: 'wav' });
   * ```
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }

  /**
   * Log an info message.
   *
   * @param message - Info message
   * @param args - Additional arguments
   *
   * @remarks
   * Info messages are used for general informational messages.
   * Default log level.
   *
   * @example
   * ```typescript
   * logger.info('Server started on port 3000');
   * logger.info('Processing request', { userId: 123 });
   * ```
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, ...args));
    }
  }

  /**
   * Log a warning message.
   *
   * @param message - Warning message
   * @param args - Additional arguments
   *
   * @remarks
   * Warning messages indicate potential issues that don't prevent operation.
   *
   * @example
   * ```typescript
   * logger.warn('API rate limit approaching', { remaining: 10 });
   * logger.warn('Deprecated function used');
   * ```
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
    }
  }

  /**
   * Log an error message.
   *
   * @param message - Error message
   * @param args - Additional arguments
   *
   * @remarks
   * Error messages indicate failures or critical issues.
   * Always displayed regardless of log level.
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed', error);
   * logger.error('Invalid configuration', { field: 'apiKey' });
   * ```
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
    }
  }
}

/**
 * Silent Logger for testing or quiet mode.
 *
 * @class
 * @implements {Logger}
 *
 * @remarks
 * Implements Logger interface but produces no output.
 * Useful for:
 * - Unit tests where output is unwanted
 * - Silent/headless operation
 * - Production environments with external logging
 *
 * @example
 * ```typescript
 * const logger = new SilentLogger();
 * logger.info('This will not be printed');
 * logger.error('Neither will this');
 * ```
 */
export class SilentLogger implements Logger {
  /**
   * Silent debug method (no-op).
   * @param _message - Ignored
   * @param _args - Ignored
   */
  debug(): void {}

  /**
   * Silent info method (no-op).
   * @param _message - Ignored
   * @param _args - Ignored
   */
  info(): void {}

  /**
   * Silent warn method (no-op).
   * @param _message - Ignored
   * @param _args - Ignored
   */
  warn(): void {}

  /**
   * Silent error method (no-op).
   * @param _message - Ignored
   * @param _args - Ignored
   */
  error(): void {}

  /**
   * Silent logError method (no-op).
   */
  logError(): void {}
}

/**
 * Global logger instance.
 *
 * @internal
 */
let globalLogger: Logger = new ConsoleLogger();

/**
 * Get the global logger instance.
 *
 * @returns The current global logger
 *
 * @example
 * ```typescript
 * const logger = getLogger();
 * logger.info('Using global logger');
 * ```
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Set the global logger instance.
 *
 * @param logger - Logger instance to set as global
 *
 * @remarks
 * Useful for replacing the default logger with a custom implementation
 * or switching to silent mode for testing.
 *
 * @example
 * ```typescript
 * // Use silent logger for tests
 * setLogger(new SilentLogger());
 *
 * // Use custom logger
 * const customLogger = new ConsoleLogger('App', { level: LogLevel.DEBUG });
 * setLogger(customLogger);
 * ```
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Create a new logger with configuration.
 *
 * @param config - Optional logger configuration
 * @returns A new logger instance
 *
 * @example
 * ```typescript
 * const debugLogger = createLogger({ level: LogLevel.DEBUG });
 * const silentLogger = createLogger({ level: LogLevel.ERROR });
 * ```
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new ConsoleLogger(undefined, config);
}

/**
 * Create a logger for a specific component/service.
 *
 * @param componentName - Name of the component (appears in log context)
 * @param config - Optional logger configuration
 * @returns A new component logger instance
 *
 * @remarks
 * Component loggers include the component name in all log messages,
 * making it easy to trace logs from specific parts of the application.
 *
 * @example
 * ```typescript
 * const audioLogger = createComponentLogger('AudioRecording');
 * audioLogger.info('Recording started');
 * // Output: 2025-12-20T10:00:00.000Z [INFO][AudioRecording] Recording started
 *
 * const sttLogger = createComponentLogger('StreamingSTT', { level: LogLevel.DEBUG });
 * sttLogger.debug('Processing audio chunk');
 * ```
 */
export function createComponentLogger(
  componentName: string,
  config?: Partial<LoggerConfig>
): Logger {
  return new ConsoleLogger(componentName, config);
}
