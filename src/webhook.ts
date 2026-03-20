import { createHmac } from 'node:crypto'
import type { AsanaWebhookEvent, AsanaWebhookPayload } from './types'

/**
 * Check if the request is an Asana webhook handshake.
 * During establishment, Asana sends X-Hook-Secret header.
 */
export function isHandshake(request: Request): string | null {
  return request.headers.get('x-hook-secret')
}

/**
 * Create the handshake response that echoes back the secret.
 */
export function createHandshakeResponse(secret: string): Response {
  return new Response('', {
    status: 200,
    headers: { 'X-Hook-Secret': secret },
  })
}

/**
 * Verify the HMAC-SHA256 signature of an Asana webhook payload.
 */
export function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  const expected = hmac.digest('hex')
  return expected === signature
}

/**
 * Extract story-added events from a webhook payload.
 * Returns events where a comment (story) was added to a task.
 */
export function extractStoryEvents(payload: AsanaWebhookPayload): AsanaWebhookEvent[] {
  if (!Array.isArray(payload.events)) return []
  return payload.events.filter(
    e => e.resource.resource_type === 'story' && e.action === 'added' && e.parent?.resource_type === 'task',
  )
}
