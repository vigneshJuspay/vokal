/**
 * Retry Utilities for Handling Transient Failures
 *
 * Provides retry logic with exponential backoff and circuit breaker pattern implementation.
 * Essential for building resilient systems that can handle temporary failures gracefully.
 *
 * @module utils/retry
 * @since 1.0.0
 *
 * @remarks
 * This module provides:
 * - **Retry with Backoff**: Exponential backoff for transient failures
 * - **Timeout Support**: Execute operations with timeout limits
 * - **Circuit Breaker**: Prevent cascading failures in distributed systems
 * - **Resilient Functions**: Combine retry and circuit breaker patterns
 *
 * **Use Cases:**
 * - API calls that may fail temporarily
 * - Network operations with transient issues
 * - Database connections that may be briefly unavailable
 * - External service integrations
 *
 * @example
 * ```typescript
 * import { retry, CircuitBreaker, withTimeout } from './utils/retry.js';
 *
 * // Basic retry
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 *
 * // With circuit breaker
 * const breaker = new CircuitBreaker(() => callExternalAPI());
 * const data = await breaker.execute();
 *
 * // With timeout
 * const result = await withTimeout(
 *   longRunningOperation(),
 *   5000,
 *   'Operation timed out'
 * );
 * ```
 */

import type {
  RetryOptions,
  CircuitBreakerOptions,
} from '../types/retry.types.js';

/**
 * Default retry predicate - always retry.
 *
 * @param _error - Error that occurred (unused)
 * @returns Always true
 *
 * @internal
 */
const defaultIsRetryable = (_error: Error): boolean => true;

/**
 * Default retry callback - no-op.
 *
 * @param _error - Error that occurred (unused)
 * @param _attempt - Current attempt number (unused)
 * @param _delay - Delay before next retry (unused)
 *
 * @internal
 */
const defaultOnRetry = (
  _error: Error,
  _attempt: number,
  _delay: number
): void => {
  // No-op by default
};

/**
 * Retry a function with exponential backoff.
 *
 * @template T - Return type of the function
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 *
 * @throws The last error if all retry attempts fail
 *
 * @remarks
 * **Retry Strategy:**
 * - Attempts function execution up to `maxAttempts` times
 * - Waits between attempts with exponential backoff
 * - Delay doubles each attempt (multiplied by `backoffMultiplier`)
 * - Maximum delay capped at `maxDelay`
 * - Custom retry predicate to determine if error is retryable
 * - Callback for monitoring retry attempts
 *
 * **Default Options:**
 * - `maxAttempts`: 3
 * - `initialDelay`: 1000ms
 * - `maxDelay`: 10000ms
 * - `backoffMultiplier`: 2
 * - `isRetryable`: Always true
 * - `onRetry`: No-op
 *
 * @example
 * ```typescript
 * // Basic retry
 * const data = await retry(() => fetchAPI());
 *
 * // Custom configuration
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 500,
 *     maxDelay: 5000,
 *     backoffMultiplier: 1.5,
 *     isRetryable: (error) => {
 *       // Only retry on network errors
 *       return error.message.includes('network');
 *     },
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 10000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const isRetryable = options.isRetryable ?? defaultIsRetryable;
  const onRetry = options.onRetry ?? defaultOnRetry;

  let lastError: Error = new Error('Unknown error');
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !isRetryable(lastError)) {
        throw lastError;
      }

      onRetry(lastError, attempt, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Execute a function with a timeout.
 *
 * @template T - Return type of the promise
 * @param promise - Promise to execute with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message for timeout (default: 'Operation timed out')
 * @returns Promise resolving to the result or rejecting on timeout
 *
 * @throws Error if timeout is reached before promise resolves
 *
 * @remarks
 * Uses `Promise.race` to implement timeout behavior.
 * The promise continues executing even after timeout (JavaScript limitation).
 *
 * @example
 * ```typescript
 * // Basic timeout
 * const result = await withTimeout(
 *   fetchData(),
 *   5000
 * );
 *
 * // Custom error message
 * const data = await withTimeout(
 *   slowDatabaseQuery(),
 *   3000,
 *   'Database query timed out after 3 seconds'
 * );
 *
 * // Combine with retry
 * const result = await retry(
 *   () => withTimeout(apiCall(), 5000),
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Circuit breaker state enumeration.
 *
 * @enum
 *
 * @remarks
 * Circuit breaker states:
 * - **CLOSED**: Normal operation, requests pass through
 * - **OPEN**: Circuit is broken, requests are rejected immediately
 * - **HALF_OPEN**: Testing if service has recovered, allowing limited requests
 */
export enum CircuitState {
  /** Normal operation - all requests pass through */
  CLOSED = 'CLOSED',
  /** Circuit broken - rejecting all requests */
  OPEN = 'OPEN',
  /** Testing recovery - allowing test requests */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Default state change callback - no-op.
 *
 * @param _state - New circuit state (unused)
 *
 * @internal
 */
const defaultOnStateChange = (_state: CircuitState): void => {
  // No-op by default
};

/**
 * Default failure predicate - count all failures.
 *
 * @param _error - Error that occurred (unused)
 * @returns Always true
 *
 * @internal
 */
const defaultShouldCountFailure = (_error: Error): boolean => true;

/**
 * Circuit Breaker implementation for preventing cascading failures.
 *
 * @template T - Return type of the wrapped function
 * @class
 *
 * @remarks
 * **Circuit Breaker Pattern:**
 * Prevents cascading failures by stopping calls to failing services.
 *
 * **States:**
 * - **CLOSED**: Normal operation
 *   - Calls execute normally
 *   - Failures increment failure counter
 *   - Opens when failure threshold reached
 *
 * - **OPEN**: Circuit broken
 *   - All calls rejected immediately
 *   - After reset timeout, transitions to HALF_OPEN
 *
 * - **HALF_OPEN**: Testing recovery
 *   - Limited calls allowed through
 *   - Success moves back to CLOSED
 *   - Failure moves back to OPEN
 *
 * **Configuration:**
 * - `failureThreshold`: Failures before opening (default: 5)
 * - `successThreshold`: Successes in HALF_OPEN before closing (default: 2)
 * - `timeout`: Operation timeout in ms (default: 10000)
 * - `resetTimeout`: Time before attempting reset in ms (default: 60000)
 *
 * @example
 * ```typescript
 * // Basic circuit breaker
 * const breaker = new CircuitBreaker(
 *   () => callExternalAPI(),
 *   {
 *     failureThreshold: 5,
 *     resetTimeout: 30000
 *   }
 * );
 *
 * try {
 *   const result = await breaker.execute();
 *   console.log('Success:', result);
 * } catch (error) {
 *   console.error('Circuit breaker error:', error);
 * }
 *
 * // Monitor state changes
 * const monitoredBreaker = new CircuitBreaker(
 *   () => databaseQuery(),
 *   {
 *     onStateChange: (state) => {
 *       console.log(`Circuit breaker state: ${state}`);
 *       if (state === CircuitState.OPEN) {
 *         alertOpsTeam('Service is down!');
 *       }
 *     }
 *   }
 * );
 *
 * // Check metrics
 * const metrics = breaker.getMetrics();
 * console.log('State:', metrics.state);
 * console.log('Failures:', metrics.failureCount);
 * ```
 */
export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly onStateChange: (state: CircuitState) => void;
  private readonly shouldCountFailure: (error: Error) => boolean;

  /**
   * Creates a new CircuitBreaker instance.
   *
   * @param fn - Function to wrap with circuit breaker
   * @param options - Circuit breaker configuration
   *
   * @example
   * ```typescript
   * const breaker = new CircuitBreaker(
   *   async () => {
   *     const response = await fetch('https://api.example.com');
   *     return response.json();
   *   },
   *   {
   *     failureThreshold: 3,
   *     successThreshold: 2,
   *     timeout: 5000,
   *     resetTimeout: 30000,
   *     onStateChange: (state) => console.log('State:', state),
   *     shouldCountFailure: (error) => error.name !== 'ValidationError'
   *   }
   * );
   * ```
   */
  constructor(
    private readonly fn: () => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 10000;
    this.resetTimeout = options.resetTimeout ?? 60000;
    this.onStateChange = options.onStateChange ?? defaultOnStateChange;
    this.shouldCountFailure =
      options.shouldCountFailure ?? defaultShouldCountFailure;
  }

  /**
   * Execute the wrapped function through the circuit breaker.
   *
   * @returns Promise resolving to function result
   * @throws Error if circuit is OPEN or function execution fails
   *
   * @remarks
   * Behavior depends on circuit state:
   * - **CLOSED**: Execute function normally
   * - **OPEN**: Reject immediately (unless reset timeout passed)
   * - **HALF_OPEN**: Execute function as test
   */
  async execute(): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.changeState(CircuitState.HALF_OPEN);
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await this.executeWithTimeout();

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute function with timeout.
   *
   * @returns Promise resolving to function result
   *
   * @private
   * @internal
   */
  private async executeWithTimeout(): Promise<T> {
    return withTimeout(this.fn(), this.timeout, 'Circuit breaker timeout');
  }

  /**
   * Handle successful execution.
   *
   * @private
   * @internal
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution.
   *
   * @param error - Error that occurred
   *
   * @private
   * @internal
   */
  private onFailure(error: Error): void {
    if (this.shouldCountFailure(error)) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === CircuitState.HALF_OPEN) {
        this.changeState(CircuitState.OPEN);
        this.successCount = 0;
      } else if (
        this.state === CircuitState.CLOSED &&
        this.failureCount >= this.failureThreshold
      ) {
        this.changeState(CircuitState.OPEN);
      }
    }
  }

  /**
   * Change circuit state.
   *
   * @param newState - New state to transition to
   *
   * @private
   * @internal
   */
  private changeState(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange(newState);
    }
  }

  /**
   * Check if circuit should attempt reset.
   *
   * @returns True if reset timeout has passed
   *
   * @private
   * @internal
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false;
    }
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  /**
   * Get current circuit state.
   *
   * @returns Current circuit breaker state
   *
   * @example
   * ```typescript
   * if (breaker.getState() === CircuitState.OPEN) {
   *   console.log('Service is currently unavailable');
   * }
   * ```
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics.
   *
   * @returns Object containing state and counters
   *
   * @remarks
   * Useful for monitoring and diagnostics.
   *
   * @example
   * ```typescript
   * const metrics = breaker.getMetrics();
   * console.log('State:', metrics.state);
   * console.log('Failures:', metrics.failureCount);
   * console.log('Successes:', metrics.successCount);
   * if (metrics.lastFailureTime) {
   *   console.log('Last failure:', new Date(metrics.lastFailureTime));
   * }
   * ```
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to initial state.
   *
   * @remarks
   * Manually resets all counters and moves to CLOSED state.
   * Useful for administrative control or testing.
   *
   * @example
   * ```typescript
   * // Manually reset after fixing the issue
   * breaker.reset();
   * console.log('Circuit breaker manually reset');
   * ```
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Create a resilient function with retry and circuit breaker.
 *
 * @template T - Return type of the function
 * @param fn - Function to make resilient
 * @param retryOptions - Optional retry configuration
 * @param circuitBreakerOptions - Optional circuit breaker configuration
 * @returns Wrapped function with retry and circuit breaker
 *
 * @remarks
 * Combines both patterns for maximum resilience:
 * 1. Circuit breaker prevents calls to failing services
 * 2. Retry with backoff handles transient failures
 *
 * Best for critical operations that must succeed.
 *
 * @example
 * ```typescript
 * const resilientFetch = createResilientFunction(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 3,
 *     initialDelay: 1000
 *   },
 *   {
 *     failureThreshold: 5,
 *     resetTimeout: 60000
 *   }
 * );
 *
 * // Use like a normal async function
 * try {
 *   const result = await resilientFetch();
 *   console.log('Success:', result);
 * } catch (error) {
 *   console.error('All resilience mechanisms failed:', error);
 * }
 * ```
 */
export function createResilientFunction<T>(
  fn: () => Promise<T>,
  retryOptions?: Partial<RetryOptions>,
  circuitBreakerOptions?: Partial<CircuitBreakerOptions>
): () => Promise<T> {
  const breaker = new CircuitBreaker(fn, circuitBreakerOptions);

  return async (): Promise<T> => {
    return retry(() => breaker.execute(), retryOptions);
  };
}
