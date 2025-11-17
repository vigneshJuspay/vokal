/**
 * Professional Logger Implementation
 * Provides structured logging with levels, timestamps, and context
 */

import { Logger } from '../types/index.js';

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  context?: Record<string, unknown>;
  args?: unknown[];
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  prefix?: string;
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  timestamp: '\x1b[90m', // Gray
} as const;

/**
 * Console Logger with advanced features
 * Implements structured logging with configurable levels and formatting
 */
export class ConsoleLogger implements Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? LogLevel.INFO,
      enableTimestamps: config?.enableTimestamps ?? true,
      enableColors: config?.enableColors ?? true,
      prefix: config?.prefix,
    };
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Format timestamp for log entry
   */
  private formatTimestamp(): string {
    const now = new Date();
    const time = now.toISOString();
    return this.config.enableColors ? `${COLORS.timestamp}${time}${COLORS.reset}` : time;
  }

  /**
   * Format log message with level and optional prefix
   */
  private formatMessage(level: string, message: string, color?: string): string {
    const parts: string[] = [];

    if (this.config.enableTimestamps) {
      parts.push(this.formatTimestamp());
    }

    const levelStr =
      this.config.enableColors && color ? `${color}[${level}]${COLORS.reset}` : `[${level}]`;

    parts.push(levelStr);

    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    levelName: string,
    color: string,
    message: string,
    ...args: unknown[]
  ): void {
    if (level < this.config.level) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, color);
    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
          ? console.warn
          : level === LogLevel.DEBUG
            ? console.debug
            : console.log;

    if (args.length > 0) {
      consoleMethod(formattedMessage, ...args);
    } else {
      consoleMethod(formattedMessage);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', COLORS.debug, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'INFO', COLORS.info, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, 'WARN', COLORS.warn, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, 'ERROR', COLORS.error, message, ...args);
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): ConsoleLogger {
    return new ConsoleLogger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /**
   * Log an error object with stack trace
   */
  logError(error: Error, context?: Record<string, unknown>): void {
    this.error(error.message);

    if (error.stack) {
      this.debug('Stack trace:', error.stack);
    }

    if (context) {
      this.debug('Error context:', context);
    }
  }
}

/**
 * Silent Logger for testing or quiet mode
 * Implements Logger interface but produces no output
 */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  logError(): void {}
}

/**
 * Global logger instance
 */
let globalLogger: Logger = new ConsoleLogger();

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Set the global logger instance
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Create a new logger with configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new ConsoleLogger(config);
}

/**
 * Create a logger for a specific component/service
 */
export function createComponentLogger(
  componentName: string,
  config?: Partial<LoggerConfig>
): Logger {
  return new ConsoleLogger({
    ...config,
    prefix: componentName,
  });
}
