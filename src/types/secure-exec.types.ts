/**
 * Secure Execution Types
 * All security and subprocess execution-related type definitions
 */

/**
 * Execution options
 */
export type ExecOptions = {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum buffer size for stdout/stderr */
  maxBuffer?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
};

/**
 * Execute result
 */
export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

/**
 * Platform-specific audio tool checks
 */
export type AudioToolCheck = {
  available: boolean;
  missing: string[];
  instructions: string;
  versions?: Record<string, string>;
};
