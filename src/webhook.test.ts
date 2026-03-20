import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createHandshakeResponse, extractStoryEvents, isHandshake, verifySignature } from './webhook'

describe('webhook handshake', () => {
  it('detects handshake request', () => {
    const request = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: { 'X-Hook-Secret': 'secret123' },
    })
    expect(isHandshake(request)).toBe('secret123')
  })

  it('returns null for non-handshake request', () => {
    const request = new Request('https://example.com/webhook', {
      method: 'POST',
    })
    expect(isHandshake(request)).toBeNull()
  })

  it('creates handshake response with correct header', () => {
    const response = createHandshakeResponse('secret123')
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Hook-Secret')).toBe('secret123')
  })
})

describe('signature verification', () => {
  it('accepts valid signature', () => {
    const secret = 'my-webhook-secret'
    const body = '{"events":[]}'
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const signature = hmac.digest('hex')
    expect(verifySignature(body, signature, secret)).toBe(true)
  })

  it('rejects invalid signature', () => {
    expect(verifySignature('body', 'invalid-sig', 'secret')).toBe(false)
  })

  it('rejects tampered body', () => {
    const secret = 'my-webhook-secret'
    const body = '{"events":[]}'
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const signature = hmac.digest('hex')
    expect(verifySignature('{"events":[{}]}', signature, secret)).toBe(false)
  })
})

describe('extractStoryEvents', () => {
  it('extracts story added events', () => {
    const payload = {
      events: [
        {
          action: 'added',
          resource: { gid: '111', resource_type: 'story' },
          parent: { gid: '222', resource_type: 'task' },
        },
      ],
    }
    const events = extractStoryEvents(payload)
    expect(events).toHaveLength(1)
    expect(events[0].resource.gid).toBe('111')
  })

  it('filters out non-story events', () => {
    const payload = {
      events: [
        {
          action: 'added',
          resource: { gid: '111', resource_type: 'task' },
          parent: { gid: '222', resource_type: 'project' },
        },
      ],
    }
    expect(extractStoryEvents(payload)).toHaveLength(0)
  })

  it('filters out non-added actions', () => {
    const payload = {
      events: [
        {
          action: 'changed',
          resource: { gid: '111', resource_type: 'story' },
          parent: { gid: '222', resource_type: 'task' },
        },
      ],
    }
    expect(extractStoryEvents(payload)).toHaveLength(0)
  })

  it('handles empty events array', () => {
    expect(extractStoryEvents({ events: [] })).toHaveLength(0)
  })

  it('handles missing events', () => {
    expect(extractStoryEvents({} as any)).toHaveLength(0)
  })
})
