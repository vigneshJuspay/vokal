/**
 * AI Comparison Service
 *
 * Advanced AI-powered response evaluation using Neurolink with Google AI (Gemini).
 * Provides semantic analysis of voice bot responses with detailed scoring and feedback.
 *
 * @module services/ai-comparison
 * @since 1.0.0
 *
 * @remarks
 * This service uses advanced LLMs to evaluate voice bot responses:
 * - **Semantic Analysis**: Evaluates meaning, not exact wording
 * - **Intent Matching**: Checks if response fulfills question intent
 * - **Binary Scoring**: Clear pass/fail (0 or 1) evaluation
 * - **Detailed Feedback**: Provides strengths and improvement suggestions
 * - **Multiple Providers**: Supports Google AI, Bedrock, Vertex, OpenAI
 *
 * The evaluation focuses on whether a human would consider the response correct,
 * not on pattern matching or exact phrase comparison.
 *
 * @example
 * ```typescript
 * const aiService = AIComparisonService.create('google-ai');
 *
 * const result = await aiService.compareResponses({
 *   userResponse: 'Paris is the capital',
 *   originalQuestion: 'What is the capital of France?',
 *   intent: 'Provide the capital city name',
 *   expectedElements: ['Paris', 'capital of France'],
 *   context: 'Geography question'
 * });
 *
 * console.log('Score:', result.score); // 0 or 1
 * console.log('Analysis:', result.analysis);
 * ```
 */

import { generateText } from '@juspay/neurolink';
import {
  ErrorCode,
  VoiceTestError,
  getErrorMessage,
  toError,
} from '../types/index.js';
import { ConsoleLogger } from '../utils/logger.js';
import type {
  AIProvider,
  ComparisonInput,
  ComparisonResult,
  ParsedAIResponse,
} from '../types/index.js';

/**
 * Parse AI response JSON string safely.
 *
 * @param json - JSON string from AI response
 * @returns Parsed AI response object
 * @throws {Error} If JSON is invalid or doesn't conform to expected structure
 *
 * @internal
 */
function parseAIResponse(json: string): ParsedAIResponse {
  const obj: unknown = JSON.parse(json);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('Invalid AI response: not an object');
  }
  // Helper to safely access properties using Reflect API
  function getProp(o: object, key: string): unknown {
    return Reflect.get(o, key);
  }

  const strengthsProp = getProp(obj, 'strengths');
  const improvementsProp = getProp(obj, 'improvements');

  return {
    isMatch: Boolean(getProp(obj, 'isMatch')),
    score: Number(getProp(obj, 'score')) || 0,
    confidence: Number(getProp(obj, 'confidence')) || 0,
    analysis:
      getProp(obj, 'analysis') !== undefined
        ? String(getProp(obj, 'analysis'))
        : undefined,
    strengths: Array.isArray(strengthsProp) ? strengthsProp : undefined,
    improvements: Array.isArray(improvementsProp)
      ? improvementsProp
      : undefined,
  };
}

/**
 * AI Comparison Service for evaluating voice bot responses.
 *
 * @class
 *
 * @remarks
 * Uses Neurolink's generateText API with configurable AI providers.
 * Optimized for conversational AI evaluation with semantic understanding.
 */
export class AIComparisonService {
  private logger: ConsoleLogger;
  private provider: AIProvider;
  private apiKey?: string;

  /**
   * Creates a new AIComparisonService instance.
   *
   * @param provider - AI provider to use (default: 'google-ai')
   * @param apiKey - API key for the provider (optional, will use env vars if not provided)
   *
   * @remarks
   * Supported providers:
   * - `google-ai`: Google AI (Gemini) - High quality, recommended
   * - `vertex`: Google Vertex AI
   * - `bedrock`: AWS Bedrock (Claude)
   * - `openai`: OpenAI GPT models
   *
   * API keys are resolved in this order:
   * 1. Passed apiKey parameter
   * 2. Environment variables (GOOGLE_API_KEY, OPENAI_API_KEY, etc.)
   *
   * @example
   * ```typescript
   * const service1 = new AIComparisonService('google-ai', 'your-api-key');
   * const service2 = new AIComparisonService('google-ai'); // Uses env var
   * ```
   */
  constructor(provider: string = 'google-ai', apiKey?: string) {
    this.logger = new ConsoleLogger();
    this.provider = provider as AIProvider;
    this.apiKey = apiKey || this.getApiKeyFromEnv(provider);
    this.logger.info(
      `AI Comparison Service initialized with provider: ${provider}`
    );
  }

  /**
   * Get API key from environment variables based on provider.
   *
   * @param provider - AI provider name
   * @returns API key from environment or undefined
   *
   * @private
   * @internal
   */
  private getApiKeyFromEnv(provider: string): string | undefined {
    switch (provider.toLowerCase()) {
      case 'google-ai':
        return process.env.GOOGLE_API_KEY;
      case 'vertex':
        return process.env.GOOGLE_CLOUD_API_KEY || process.env.VERTEX_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'bedrock':
        return process.env.AWS_ACCESS_KEY_ID; // Bedrock uses AWS credentials
      default:
        return undefined;
    }
  }

  /**
   * Compare user response with expected response using AI semantic analysis.
   *
   * @param input - Comparison input with question, response, and evaluation criteria
   * @returns Promise resolving to detailed comparison result
   *
   * @throws {VoiceTestError} If AI comparison fails or times out
   *
   * @remarks
   * **Evaluation Process:**
   * 1. Builds comprehensive prompt with question context
   * 2. Sends to AI provider for semantic analysis
   * 3. Receives structured evaluation (JSON format)
   * 4. Parses and validates response
   * 5. Returns binary score with detailed feedback
   *
   * **Input Fields:**
   * - `userResponse`: The actual response to evaluate
   * - `originalQuestion`: The question that was asked
   * - `intent`: What the correct answer should accomplish
   * - `expectedElements`: Key elements that should be present
   * - `context`: Additional context (optional)
   * - `sampleResponse`: Example correct answer (optional)
   *
   * **Result Fields:**
   * - `score`: Binary score (0=fail, 1=pass)
   * - `confidence`: AI's confidence in evaluation (0-1)
   * - `isMatch`: Boolean indicating if response matches intent
   * - `analysis`: Detailed text analysis
   * - `strengths`: What the response did well
   * - `improvements`: What could be better
   * - `processingTime`: Time taken for evaluation in ms
   *
   * **Scoring Philosophy:**
   * - Focus on semantic meaning, not exact wording
   * - Accept natural language variations
   * - Consider transcription errors
   * - Evaluate like a human would
   *
   * @example
   * ```typescript
   * const result = await service.compareResponses({
   *   userResponse: 'New York City',
   *   originalQuestion: 'What is the largest city in the USA?',
   *   intent: 'User should name the largest US city by population',
   *   expectedElements: [
   *     'New York',
   *     'NYC',
   *     'Clear identification as largest city'
   *   ],
   *   context: 'US geography question',
   *   sampleResponse: 'New York City is the largest city in the USA'
   * });
   *
   * if (result.score === 1) {
   *   console.log('✓ Response passed');
   *   console.log('Strengths:', result.strengths);
   * } else {
   *   console.log('✗ Response failed');
   *   console.log('Improvements:', result.improvements);
   * }
   * console.log('Confidence:', result.confidence);
   * console.log('Time:', result.processingTime, 'ms');
   * ```
   */
  async compareResponses(input: ComparisonInput): Promise<ComparisonResult> {
    const startTime = Date.now();

    try {
      this.logger.info('🤖 Analyzing user response with AI...');
      this.logger.info(
        `📝 User said: "${input.userResponse.substring(0, 100)}..."`
      );

      // Create detailed prompt for AI comparison
      const comparisonPrompt = this.buildComparisonPrompt(input);

      // Prepare Neurolink options - cast provider to match Neurolink's expected type
      const neurolinkOptions = {
        prompt: comparisonPrompt,
        provider: this
          .provider as unknown as import('@juspay/neurolink').AIProviderName,
        model: this.getOptimalModel(this.provider),
        temperature: 0.3,
        maxTokens: 2048,
        timeout: '30s',
        ...(this.apiKey && { apiKey: this.apiKey }),
      };

      // Use Neurolink with proper options
      const result = await generateText(neurolinkOptions);

      this.logger.info(
        `🔍 AI Raw Response Length: ${result.content?.length || 0}`
      );
      this.logger.info(
        `🔍 AI Raw Response (FULL): ${result.content || 'EMPTY'}`
      );

      // Parse the AI response
      const analysisResult = this.parseAIResponse(result.content);
      const processingTime = Date.now() - startTime;

      const comparisonResult: ComparisonResult = {
        ...analysisResult,
        processingTime,
      };

      this.logger.info(`✅ AI analysis completed in ${processingTime}ms`);
      this.logger.info(
        `📊 Score: ${comparisonResult.score} (${comparisonResult.score === 1 ? 'PASS' : 'FAIL'}) | Confidence: ${(comparisonResult.confidence * 100).toFixed(0)}%`
      );

      return comparisonResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      throw new VoiceTestError(
        `AI comparison failed after ${processingTime}ms: ${getErrorMessage(error)}`,
        ErrorCode.AI_COMPARISON_FAILED,
        toError(error)
      );
    }
  }

  /**
   * Build comprehensive prompt for AI comparison using semantic evaluation.
   *
   * @param input - Comparison input data
   * @returns Formatted prompt string for AI evaluation
   *
   * @private
   * @internal
   *
   * @remarks
   * Creates a detailed prompt that instructs the AI to:
   * - Evaluate semantic meaning, not exact words
   * - Focus on intent fulfillment
   * - Provide binary scoring (0 or 1)
   * - Include detailed analysis and feedback
   * - Return structured JSON response
   */
  private buildComparisonPrompt(input: ComparisonInput): string {
    return `
You are an expert voice bot testing analyst. Evaluate whether the user's response correctly answers the question based on semantic meaning, NOT exact word matching.

**QUESTION ASKED:**
"${input.originalQuestion}"

**QUESTION INTENT:**
${input.intent}

**KEY ELEMENTS EXPECTED IN A CORRECT RESPONSE:**
${input.expectedElements.map((element, index) => `${index + 1}. ${element}`).join('\n')}

**USER'S ACTUAL RESPONSE:**
"${input.userResponse}"

**CONTEXT:**
${input.context || 'No additional context provided'}

${
  input.sampleResponse
    ? `**SAMPLE RESPONSE (for reference only, NOT for pattern matching):**
"${input.sampleResponse}"`
    : ''
}

**ANALYSIS TASK:**
Evaluate whether the user's response successfully addresses the question's intent and contains the expected elements. Focus on SEMANTIC MEANING, not exact wording.

Provide your evaluation in this JSON format:

{
  "isMatch": boolean,
  "confidence": number (0.0 to 1.0),
  "score": number (0 or 1),
  "analysis": "detailed analysis text",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}

**EVALUATION CRITERIA:**
1. **Intent Fulfillment**: Does the response fulfill the question's intent?
2. **Element Coverage**: Are the expected elements present (regardless of exact wording)?
3. **Semantic Accuracy**: Is the core meaning correct?
4. **Completeness**: Is sufficient information provided?
5. **Relevance**: Does it directly address what was asked?

**SCORING GUIDE (Binary):**
- **1 (PASS)**: Response fulfills the intent and contains the key expected elements. The answer is correct and addresses the question adequately, even if phrasing differs.
- **0 (FAIL)**: Response does not fulfill the intent, missing critical elements, or provides incorrect information.

**IMPORTANT GUIDELINES:**
- Focus on MEANING, not exact words or phrases
- Accept different ways of expressing the same concept
- Consider natural speech variations and casual language
- Account for potential transcription errors
- Evaluate based on whether a human would consider this a good answer
- Don't penalize for creative or unexpected but correct responses
- Be lenient: If the core answer is correct, give score 1

**RESPONSE FORMAT:**
You MUST respond with ONLY a valid, complete JSON object. Requirements:
- Keep analysis text SHORT (max 100 characters)
- Keep strengths and improvements arrays SHORT (max 2 items each, max 50 chars per item)
- NO markdown code blocks
- NO extra text before or after the JSON
- Ensure the JSON is COMPLETE and properly closed

Example format:
{"isMatch": true, "confidence": 0.9, "score": 1, "analysis": "Addresses question intent", "strengths": ["clear answer"], "improvements": ["more detail"]}
`;
  }

  /**
   * Parse AI response and extract structured data.
   *
   * @param aiResponse - Raw response string from AI
   * @returns Parsed comparison result (without processingTime)
   *
   * @private
   * @internal
   *
   * @remarks
   * Handles various AI response formats:
   * - Removes markdown code blocks
   * - Extracts JSON from response
   * - Repairs incomplete JSON when possible
   * - Falls back to similarity scoring if parsing fails
   */
  private parseAIResponse(
    aiResponse: string
  ): Omit<ComparisonResult, 'processingTime'> {
    try {
      // Clean up the response and extract JSON
      let jsonStr = aiResponse.trim();

      // Remove any markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to find and extract a complete JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Clean up common issues
      jsonStr = jsonStr.trim();

      // Check if JSON seems incomplete (unterminated strings)
      if (!jsonStr.endsWith('}')) {
        this.logger.warn('⚠️ JSON appears incomplete, attempting to fix...');
        // Try to close any open strings and the object
        if (
          !jsonStr.includes('"analysis"') ||
          !jsonStr.includes('"strengths"')
        ) {
          throw new Error('JSON is too incomplete to parse');
        }
        // Simple fix: close unterminated string and add missing fields
        if (
          jsonStr.includes('"analysis": "') &&
          !jsonStr.match(/"analysis": "[^"]*"/)
        ) {
          jsonStr = jsonStr.replace(
            /"analysis": "([^"]*)$/,
            '"analysis": "$1"'
          );
        }
        if (!jsonStr.includes('"strengths"')) {
          jsonStr += ', "strengths": [], "improvements": []}';
        } else if (!jsonStr.endsWith('}')) {
          jsonStr += '}';
        }
      }

      const parsed = parseAIResponse(jsonStr);

      this.logger.info(
        `🔍 Parsed Object: isMatch=${parsed.isMatch}, score=${parsed.score}, confidence=${parsed.confidence}`
      );

      const strengths: string[] = [];
      if (Array.isArray(parsed.strengths)) {
        for (const item of parsed.strengths) {
          if (typeof item === 'string') {
            strengths.push(item);
          }
        }
      }

      const improvements: string[] = [];
      if (Array.isArray(parsed.improvements)) {
        for (const item of parsed.improvements) {
          if (typeof item === 'string') {
            improvements.push(item);
          }
        }
      }

      const result = {
        isMatch: Boolean(parsed.isMatch),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        score: Number(parsed.score) === 1 ? 1 : 0, // Binary: 0 or 1 only
        analysis: String(parsed.analysis || 'No analysis provided'),
        strengths,
        improvements,
      };

      this.logger.info(
        `🔍 Final Result: isMatch=${result.isMatch}, score=${result.score}, confidence=${result.confidence}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Failed to parse AI response: ${getErrorMessage(error)}`
      );
      this.logger.error(
        `❌ Problematic JSON: ${aiResponse.substring(0, 200)}...`
      );

      // Fallback analysis based on simple similarity
      const similarity = this.calculateSimpleSimilarity(
        aiResponse.toLowerCase(),
        'expected response'
      );

      return {
        isMatch: similarity > 0.6,
        confidence: similarity,
        score: similarity > 0.6 ? 1 : 0, // Binary scoring
        analysis: `Fallback analysis: Response similarity score ${similarity.toFixed(2)}`,
        strengths: similarity > 0.7 ? ['Response shows some relevance'] : [],
        improvements:
          similarity < 0.7 ? ['Response needs significant improvement'] : [],
      };
    }
  }

  /**
   * Calculate simple text similarity (fallback method).
   *
   * @param text1 - First text to compare
   * @param text2 - Second text to compare
   * @returns Similarity score from 0 to 1
   *
   * @private
   * @internal
   *
   * @remarks
   * Uses word-based Jaccard similarity as a fallback when AI parsing fails.
   * Not as sophisticated as AI evaluation but provides reasonable baseline.
   */
  private calculateSimpleSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Get optimal model for each provider using proper Neurolink model names.
   *
   * @param provider - AI provider name
   * @returns Model identifier string
   *
   * @private
   * @internal
   *
   * @remarks
   * Selects high-quality models optimized for reasoning and evaluation:
   * - Google AI / Vertex: gemini-2.5-pro
   * - Bedrock: claude-3-sonnet
   * - OpenAI: gpt-4
   */
  private getOptimalModel(provider: AIProvider): string {
    switch (provider.toLowerCase()) {
      case 'google-ai':
        return 'gemini-2.5-pro'; // Higher quality model for better evaluation
      case 'bedrock':
        return 'claude-3-sonnet';
      case 'vertex':
        return 'gemini-2.5-pro';
      case 'openai':
        return 'gpt-4';
      default:
        return 'gemini-2.5-pro'; // Default to high-quality Gemini model
    }
  }

  /**
   * Test the AI comparison service with a simple example.
   *
   * @returns Promise resolving to true if test passed, false otherwise
   *
   * @remarks
   * Runs a basic geography question test to verify the service is working.
   * Useful for system health checks and configuration validation.
   *
   * @example
   * ```typescript
   * const passed = await service.testService();
   * if (!passed) {
   *   console.error('AI comparison service test failed');
   * }
   * ```
   */
  async testService(): Promise<boolean> {
    try {
      const testInput: ComparisonInput = {
        userResponse: 'The capital of France is Paris',
        originalQuestion: 'What is the capital of France?',
        intent: 'User should provide the correct capital city of France',
        expectedElements: [
          'Name of a city (Paris)',
          'Clear indication this is the capital of France',
        ],
        context: 'Geography test question',
        sampleResponse: 'Paris is the capital of France',
      };

      const result = await this.compareResponses(testInput);

      this.logger.info('✅ AI Comparison service test completed successfully');
      return result.score === 1; // Binary scoring: 1 = pass, 0 = fail
    } catch (error) {
      this.logger.error(
        `❌ AI Comparison service test failed: ${getErrorMessage(error)}`
      );
      return false;
    }
  }

  /**
   * Get list of supported AI providers.
   *
   * @returns Array of provider names
   *
   * @example
   * ```typescript
   * const providers = service.getSupportedProviders();
   * console.log('Available:', providers);
   * // ['bedrock', 'vertex', 'openai', 'google-ai']
   * ```
   */
  getSupportedProviders(): string[] {
    return ['bedrock', 'vertex', 'openai', 'google-ai'];
  }

  /**
   * Create AI comparison service instance.
   * Factory method for convenient instantiation.
   *
   * @param provider - AI provider to use (default: 'google-ai')
   * @param apiKey - API key for the provider (optional)
   * @returns A new AIComparisonService instance
   *
   * @example
   * ```typescript
   * const service = AIComparisonService.create('google-ai', 'your-api-key');
   * const result = await service.compareResponses({ ... });
   * ```
   */
  static create(
    provider: string = 'google-ai',
    apiKey?: string
  ): AIComparisonService {
    return new AIComparisonService(provider, apiKey);
  }
}
