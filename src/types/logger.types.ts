/**
 * Logger Types
 * All logging-related type definitions
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
  USER = 5, // User-facing messages only
}

/**
 * Log entry structure
 */
export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: Date;
  component?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
};

/**
 * Logger configuration
 */
export type LoggerConfig = {
  level: LogLevel;
  component?: string;
  enableColors?: boolean;
  enableTimestamp?: boolean;
  outputStream?: NodeJS.WritableStream;
};
