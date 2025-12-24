/**
 * Retry and Circuit Breaker Types
 * All retry logic and reliability-related type definitions
 */

/**
 * Retry configuration options
 */
export type RetryOptions = {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays */
  useJitter?: boolean;
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback function called on each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
};

/**
 * Circuit breaker configuration
 */
export type CircuitBreakerOptions = {
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Time in milliseconds to wait before attempting recovery */
  resetTimeout?: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold?: number;
  /** Timeout for individual operations in milliseconds */
  timeout?: number;
  /** Callback when circuit state changes */
  onStateChange?: (state: string) => void;
  /** Predicate to determine if error should count towards failure threshold */
  shouldCountFailure?: (error: Error) => boolean;
};
