/**
 * STT Handler Manager
 *
 * Centralized manager for STT providers with caching and fallback support.
 * Provides a clean API for accessing different STT handlers.
 *
 * @module providers/stt-handler-manager
 * @since 2.0.0
 */

import type { STTHandler, STTProviderName } from '../types/stt-provider.types.js';
import { GoogleAISTTHandler } from './google-ai-stt.handler.js';
import { VoiceTestError, ErrorCode } from '../errors/voice-test.errors.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('STTHandlerManager');

/**
 * STT Handler factory function type
 */
type STTHandlerFactory = (apiKey?: string) => STTHandler;

/**
 * STT Handler registry entry
 */
interface STTHandlerEntry {
  factory: STTHandlerFactory;
  singleton?: STTHandler;
}

/**
 * STT Handler Manager
 *
 * Manages STT handler instances with caching and provider registration.
 */
export class STTHandlerManager {
  private static handlers = new Map<STTProviderName, STTHandlerEntry>();
  private static defaultProvider: STTProviderName = 'google-ai';

  /**
   * Initialize with default providers
   */
  static {
    // Register Google AI STT handler by default
    this.registerHandler('google-ai', () => new GoogleAISTTHandler());
  }

  /**
   * Register a new STT handler
   *
   * @param name - Provider name
   * @param factory - Handler factory function
   *
   * @example
   * ```typescript
   * STTHandlerManager.registerHandler('custom-stt', (apiKey) => new CustomSTTHandler(apiKey));
   * ```
   */
  static registerHandler(name: STTProviderName, factory: STTHandlerFactory): void {
    this.handlers.set(name, { factory });
    logger.info(`📝 Registered STT handler: ${name}`);
  }

  /**
   * Get or create an STT handler instance
   *
   * @param provider - Provider name (defaults to 'google-ai')
   * @param apiKey - Optional API key
   * @returns STT handler instance
   * @throws {VoiceTestError} If provider is not registered
   *
   * @example
   * ```typescript
   * const handler = STTHandlerManager.getHandler('google-ai', process.env.GOOGLE_AI_API_KEY);
   * const result = await handler.transcribe({
   *   audio: audioBuffer,
   *   encoding: 'LINEAR16',
   *   sampleRate: 16000,
   *   languageCode: 'en-US'
   * });
   * ```
   */
  static getHandler(provider: STTProviderName = this.defaultProvider, apiKey?: string): STTHandler {
    const entry = this.handlers.get(provider);

    if (!entry) {
      // Try fallback to default provider
      if (provider !== this.defaultProvider && this.handlers.has(this.defaultProvider)) {
        logger.warn(
          `⚠️ Provider '${provider}' not found, falling back to '${this.defaultProvider}'`
        );
        return this.getHandler(this.defaultProvider, apiKey);
      }

      throw new VoiceTestError(
        `STT provider '${provider}' is not registered`,
        ErrorCode.INVALID_PROVIDER
      );
    }

    // Return cached singleton if available and configured
    if (entry.singleton?.isConfigured()) {
      return entry.singleton;
    }

    // Create new instance
    const handler = entry.factory(apiKey);

    // Cache as singleton if configured
    if (handler.isConfigured()) {
      entry.singleton = handler;
    }

    return handler;
  }

  /**
   * Check if a provider is registered
   *
   * @param provider - Provider name
   * @returns True if provider is registered
   */
  static hasHandler(provider: STTProviderName): boolean {
    return this.handlers.has(provider);
  }

  /**
   * Get list of registered provider names
   *
   * @returns Array of registered provider names
   */
  static getRegisteredProviders(): STTProviderName[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Set the default provider
   *
   * @param provider - Provider name
   * @throws {VoiceTestError} If provider is not registered
   */
  static setDefaultProvider(provider: STTProviderName): void {
    if (!this.handlers.has(provider)) {
      throw new VoiceTestError(
        `Cannot set default provider: '${provider}' is not registered`,
        ErrorCode.INVALID_PROVIDER
      );
    }
    this.defaultProvider = provider;
    logger.info(`✅ Default STT provider set to: ${provider}`);
  }

  /**
   * Get the current default provider name
   *
   * @returns Default provider name
   */
  static getDefaultProvider(): STTProviderName {
    return this.defaultProvider;
  }

  /**
   * Clear all handler singletons
   * Useful for testing or reconfiguration
   */
  static clearCache(): void {
    logger.info('🧹 Clearing STT handler cache');
    for (const entry of this.handlers.values()) {
      entry.singleton = undefined;
    }
  }

  /**
   * Unregister a handler
   *
   * @param provider - Provider name
   */
  static unregisterHandler(provider: STTProviderName): void {
    this.handlers.delete(provider);
    logger.info(`🗑️ Unregistered STT handler: ${provider}`);
  }
}
