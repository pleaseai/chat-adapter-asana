import type { AsanaAdapterConfig } from './types'
import process from 'node:process'
import { AsanaAdapter } from './adapter'

/**
 * Create an Asana adapter for Chat SDK.
 *
 * @param config - Adapter configuration. Falls back to environment variables.
 * @returns Configured AsanaAdapter instance
 *
 * @example
 * ```typescript
 * const adapter = createAsanaAdapter({
 *   accessToken: process.env.ASANA_ACCESS_TOKEN!,
 * });
 * ```
 */
export function createAsanaAdapter(config?: Partial<AsanaAdapterConfig>): AsanaAdapter {
  const accessToken = config?.accessToken ?? process.env.ASANA_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('Asana adapter requires an access token. Set ASANA_ACCESS_TOKEN or pass accessToken in config.')
  }

  return new AsanaAdapter({
    accessToken,
    baseUrl: config?.baseUrl,
    userName: config?.userName,
    logger: config?.logger,
  })
}
