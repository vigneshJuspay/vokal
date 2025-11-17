/**
 * Retry Logic Utilities
 * Implements exponential backoff and circuit breaker patterns for reliability
 */

import { createComponentLogger, LogLevel } from './logger.js';
import { toError } from '../errors/voice-test.errors.js';

const logger = createComponentLogger('RetryUtil', { level: LogLevel.INFO });

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to add jitter to delays */
  useJitter: boolean;
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 1,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  useJitter: true,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelay
  );

  if (options.useJitter) {
    // Add random jitter between 0% and 25% of the delay
    const jitter = exponentialDelay * 0.25 * Math.random();
    return exponentialDelay + jitter;
  }

  return exponentialDelay;
}

/**
 * Default predicate for retryable errors
 */
function defaultIsRetryable(error: Error): boolean {
  const retryablePatterns = [
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ENOTFOUND/i,
    /ECONNREFUSED/i,
    /socket hang up/i,
    /network/i,
    /rate limit/i,
    /429/,
    /503/,
    /504/,
  ];

  const errorMessage = error.message || '';
  return retryablePatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to function result
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchDataFromAPI(),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const isRetryable = opts.isRetryable || defaultIsRetryable;

  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = toError(error);

      // Check if we should retry
      const shouldRetry = attempt < opts.maxAttempts && isRetryable(lastError);

      if (!shouldRetry) {
        logger.error(
          `Attempt ${attempt}/${opts.maxAttempts} failed (not retryable): ${lastError.message}`
        );
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay.toFixed(0)}ms...`
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before attempting recovery */
  resetTimeout: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;
  /** Time window for counting failures (milliseconds) */
  windowSize: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  windowSize: 120000, // 2 minutes
};

/**
 * Circuit breaker pattern implementation
 * Prevents cascading failures by failing fast when a service is down
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private recentFailures: number[] = [];
  private options: CircuitBreakerOptions;
  private logger = createComponentLogger('CircuitBreaker');

  constructor(
    private name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Clean up old failures outside the window
    const now = Date.now();
    this.recentFailures = this.recentFailures.filter(
      (time) => now - time < this.options.windowSize
    );

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (now < this.nextAttempt) {
        throw new Error(
          `Circuit breaker '${this.name}' is OPEN. Service unavailable. ` +
            `Next attempt in ${Math.ceil((this.nextAttempt - now) / 1000)}s`
        );
      }
      // Move to half-open state to test
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.logger.info(`Circuit breaker '${this.name}' entering HALF_OPEN state`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.recentFailures.push(now);
    this.failureCount = this.recentFailures.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed while testing - go back to open
      this.open();
    } else if (this.failureCount >= this.options.failureThreshold) {
      // Too many failures - open the circuit
      this.open();
    }
  }

  /**
   * Open the circuit (reject requests)
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    this.logger.error(
      `Circuit breaker '${this.name}' is now OPEN after ${this.failureCount} failures. ` +
        `Will retry in ${this.options.resetTimeout / 1000}s`
    );
  }

  /**
   * Close the circuit (allow requests)
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.recentFailures = [];
    this.logger.info(`Circuit breaker '${this.name}' is now CLOSED`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttempt: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? this.nextAttempt : null,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.close();
  }
}

/**
 * Create a retryable function with circuit breaker
 */
export function createResilientFunction<T>(
  name: string,
  fn: () => Promise<T>,
  retryOptions: Partial<RetryOptions> = {},
  circuitOptions: Partial<CircuitBreakerOptions> = {}
): () => Promise<T> {
  const circuitBreaker = new CircuitBreaker(name, circuitOptions);

  return async () => {
    return circuitBreaker.execute(() => retry(fn, retryOptions));
  };
}

/**
 * Timeout wrapper - reject promise if it takes too long
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}
