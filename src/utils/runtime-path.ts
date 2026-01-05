/**
 * Runtime Path Resolution Utility
 *
 * Provides CJS/ESM-compatible directory resolution for asset loading.
 * This helper works in both CommonJS and ES Module environments.
 *
 * @module utils/runtime-path
 * @since 1.0.0
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get the runtime directory in a CJS/ESM-safe way.
 *
 * @param metaUrl - import.meta.url (required for ESM)
 * @returns The directory path of the current module
 *
 * @remarks
 * This function works in both module systems:
 * - CommonJS: Uses __dirname
 * - ESM: Uses import.meta.url with fileURLToPath
 *
 * @example
 * ```typescript
 * // CommonJS output
 * const dir = getRuntimeDir(); // Uses __dirname
 *
 * // ESM output
 * const dir = getRuntimeDir(import.meta.url); // Uses fileURLToPath
 * ```
 */
export function getRuntimeDir(metaUrl?: string): string {
  // CommonJS environment
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // ESM environment
  if (!metaUrl) {
    throw new Error(
      'getRuntimeDir: metaUrl required for ESM environments. Pass import.meta.url as argument.'
    );
  }

  return dirname(fileURLToPath(metaUrl));
}
