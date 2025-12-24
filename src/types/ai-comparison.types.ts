/**
 * AI Comparison Types
 * All AI comparison-related type definitions
 */

/** Supported AI providers for comparison (only google-ai supported currently) */
export type AIProvider = 'google-ai';

/**
 * AI Comparison Input
 */
export type ComparisonInput = {
  /** The user's transcribed response */
  userResponse: string;
  /** The original question/prompt */
  originalQuestion: string;
  /** What the question is trying to assess */
  intent: string;
  /** Key elements that should be present in a correct response */
  expectedElements: string[];
  /** Additional context for comparison */
  context?: string;
  /** Example response for reference (not for pattern matching) */
  sampleResponse?: string;
};

/**
 * AI Comparison Result
 */
export type ComparisonResult = {
  /** Whether the response matches expectations */
  isMatch: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detailed analysis */
  analysis: string;
  /** Binary score: 0 (FAIL) or 1 (PASS) */
  score: number;
  /** Areas where response was good */
  strengths: string[];
  /** Areas needing improvement */
  improvements: string[];
  /** Processing time in ms */
  processingTime: number;
};

/**
 * Parsed AI Response structure (internal)
 */
export type ParsedAIResponse = {
  isMatch: boolean;
  score: number;
  confidence: number;
  analysis?: string;
  strengths?: unknown[];
  improvements?: unknown[];
};
