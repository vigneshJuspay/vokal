/**
 * AI Comparison Service
 * Uses Neurolink with proper Google AI (Gemini) provider for response evaluation
 */
import { generateText } from '@juspay/neurolink';
import { VoiceTestError, getErrorMessage, toError } from '../types/index.js';
import { ConsoleLogger } from '../utils/logger.js';

/** Supported AI providers for comparison */
export type AIProvider = 'bedrock' | 'vertex' | 'openai' | 'google-ai';

/** AI Response structure */
interface ParsedAIResponse {
  isMatch: boolean;
  score: number;
  confidence: number;
  analysis?: string;
  strengths?: unknown[];
  improvements?: unknown[];
}

/**
 * Parse AI response JSON string
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
    analysis: getProp(obj, 'analysis') !== undefined ? String(getProp(obj, 'analysis')) : undefined,
    strengths: Array.isArray(strengthsProp) ? strengthsProp : undefined,
    improvements: Array.isArray(improvementsProp) ? improvementsProp : undefined,
  };
}

export interface ComparisonInput {
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
}

export interface ComparisonResult {
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
}

export class AIComparisonService {
  private logger: ConsoleLogger;
  private provider: AIProvider;

  constructor(provider: AIProvider = 'google-ai') {
    this.logger = new ConsoleLogger();
    this.provider = provider;
    this.logger.info(`AI Comparison Service initialized with provider: ${provider}`);
  }

  /**
   * Compare user response with expected response using AI
   */
  async compareResponses(input: ComparisonInput): Promise<ComparisonResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`🤖 Analyzing user response with AI...`);
      this.logger.info(`📝 User said: "${input.userResponse.substring(0, 100)}..."`);

      // Create detailed prompt for AI comparison
      const comparisonPrompt = this.buildComparisonPrompt(input);

      // Use Neurolink with proper options
      // Provider is validated at runtime by Neurolink
      const result = await generateText({
        prompt: comparisonPrompt,
        // @ts-expect-error - Our AIProvider type uses different string literals than neurolink's AIProviderName, but they map correctly at runtime
        provider: this.provider,
        model: this.getOptimalModel(this.provider),
        temperature: 0.3,
        maxTokens: 2048,
        timeout: '30s',
      });

      this.logger.info(`🔍 AI Raw Response Length: ${result.content?.length || 0}`);
      this.logger.info(`🔍 AI Raw Response (FULL): ${result.content || 'EMPTY'}`);

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
        'AI_COMPARISON_FAILED',
        toError(error)
      );
    }
  }

  /**
   * Build comprehensive prompt for AI comparison using semantic evaluation
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
   * Parse AI response and extract structured data
   */
  private parseAIResponse(aiResponse: string): Omit<ComparisonResult, 'processingTime'> {
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
        this.logger.warn(`⚠️ JSON appears incomplete, attempting to fix...`);
        // Try to close any open strings and the object
        if (!jsonStr.includes('"analysis"') || !jsonStr.includes('"strengths"')) {
          throw new Error('JSON is too incomplete to parse');
        }
        // Simple fix: close unterminated string and add missing fields
        if (jsonStr.includes('"analysis": "') && !jsonStr.match(/"analysis": "[^"]*"/)) {
          jsonStr = jsonStr.replace(/"analysis": "([^"]*)$/, '"analysis": "$1"');
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
      this.logger.error(`❌ Failed to parse AI response: ${getErrorMessage(error)}`);
      this.logger.error(`❌ Problematic JSON: ${aiResponse.substring(0, 200)}...`);

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
        improvements: similarity < 0.7 ? ['Response needs significant improvement'] : [],
      };
    }
  }

  /**
   * Calculate simple text similarity (fallback method)
   */
  private calculateSimpleSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Get optimal model for each provider using proper Neurolink model names
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
   * Test the AI comparison service
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
      this.logger.error(`❌ AI Comparison service test failed: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): string[] {
    return ['bedrock', 'vertex', 'openai', 'google-ai'];
  }

  /**
   * Create AI comparison service instance
   */
  static create(provider: AIProvider = 'google-ai'): AIComparisonService {
    return new AIComparisonService(provider);
  }
}
