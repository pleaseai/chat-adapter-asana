import type { AsanaRawMessage } from './types'
import { describe, expect, it } from 'vitest'
import { AsanaAdapter } from './adapter'

const adapter = new AsanaAdapter({
  accessToken: 'test-token',
})

describe('asanaAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('asana')
  })

  it('has default userName', () => {
    expect(adapter.userName).toBe('asana-bot')
  })

  describe('parseMessage', () => {
    const rawMessage: AsanaRawMessage = {
      gid: 'story-1',
      text: 'Hello world',
      type: 'comment',
      resource_type: 'story',
      created_at: '2024-01-15T10:00:00.000Z',
      created_by: {
        gid: 'user-1',
        name: 'Alice',
        resource_type: 'user',
      },
      target: { gid: 'task-123', resource_type: 'task' },
    }

    it('parses a plain text comment', () => {
      const message = adapter.parseMessage(rawMessage)
      expect(message.text).toBe('Hello world')
      expect(message.id).toBe('story-1')
      expect(message.threadId).toBe('asana:task-123')
    })

    it('extracts author info', () => {
      const message = adapter.parseMessage(rawMessage)
      expect(message.author.userId).toBe('user-1')
      expect(message.author.userName).toBe('Alice')
      expect(message.author.fullName).toBe('Alice')
      expect(message.author.isBot).toBe(false)
    })

    it('extracts metadata', () => {
      const message = adapter.parseMessage(rawMessage)
      expect(message.metadata.dateSent).toEqual(new Date('2024-01-15T10:00:00.000Z'))
      expect(message.metadata.edited).toBe(false)
    })

    it('detects edited messages', () => {
      const edited: AsanaRawMessage = { ...rawMessage, is_edited: true }
      const message = adapter.parseMessage(edited)
      expect(message.metadata.edited).toBe(true)
    })
  })

  describe('handleWebhook', () => {
    it('responds to handshake with X-Hook-Secret', async () => {
      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'X-Hook-Secret': 'my-secret' },
      })
      const response = await adapter.handleWebhook(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Hook-Secret')).toBe('my-secret')
    })

    it('returns 401 when signature header is missing', async () => {
      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        body: '{}',
      })
      const response = await adapter.handleWebhook(request)
      expect(response.status).toBe(401)
    })

    it('returns 401 for invalid signature on non-JSON body', async () => {
      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'X-Hook-Signature': 'some-sig' },
        body: 'not json',
      })
      const response = await adapter.handleWebhook(request)
      expect(response.status).toBe(401)
    })
  })

  describe('renderFormatted', () => {
    it('converts AST to markdown string', () => {
      const ast = { type: 'root' as const, children: [{ type: 'paragraph' as const, children: [{ type: 'text' as const, value: 'Hello' }] }] }
      const result = adapter.renderFormatted(ast)
      expect(result).toContain('Hello')
    })
  })

  describe('startTyping', () => {
    it('is a no-op', async () => {
      await expect(adapter.startTyping('asana:123')).resolves.toBeUndefined()
    })
  })
})
