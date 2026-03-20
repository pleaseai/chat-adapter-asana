import type { AsanaRawMessage } from './types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AsanaAdapter } from './adapter'

function createMockStory(overrides: Partial<AsanaRawMessage> = {}): AsanaRawMessage {
  return {
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
    ...overrides,
  }
}

// Mock fetch globally for adapter methods that call the API
const mockFetch = vi.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = mockFetch
  mockFetch.mockReset()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

const adapter = new AsanaAdapter({ accessToken: 'test-token' })

describe('asanaAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('asana')
  })

  it('has default userName', () => {
    expect(adapter.userName).toBe('asana-bot')
  })

  describe('parseMessage', () => {
    it('parses a plain text comment', () => {
      const message = adapter.parseMessage(createMockStory())
      expect(message.text).toBe('Hello world')
      expect(message.id).toBe('story-1')
      expect(message.threadId).toBe('asana:task-123')
    })

    it('extracts author info', () => {
      const message = adapter.parseMessage(createMockStory())
      expect(message.author.userId).toBe('user-1')
      expect(message.author.userName).toBe('Alice')
      expect(message.author.fullName).toBe('Alice')
      expect(message.author.isBot).toBe(false)
    })

    it('extracts metadata', () => {
      const message = adapter.parseMessage(createMockStory())
      expect(message.metadata.dateSent).toEqual(new Date('2024-01-15T10:00:00.000Z'))
      expect(message.metadata.edited).toBe(false)
    })

    it('detects edited messages', () => {
      const message = adapter.parseMessage(createMockStory({ is_edited: true }))
      expect(message.metadata.edited).toBe(true)
    })

    it('handles missing target', () => {
      const message = adapter.parseMessage(createMockStory({ target: undefined }))
      expect(message.threadId).toBe('asana:unknown')
    })

    it('handles missing created_by', () => {
      const message = adapter.parseMessage(createMockStory({ created_by: undefined as any }))
      expect(message.author.userId).toBe('unknown')
      expect(message.author.userName).toBe('unknown')
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

    it('returns 200 for valid events payload without chat instance', async () => {
      // Create a fresh adapter without handshake secret to skip verification
      const freshAdapter = new AsanaAdapter({ accessToken: 'test-token' })
      const body = JSON.stringify({ events: [] })
      const request = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: { 'X-Hook-Signature': 'any-sig' },
        body,
      })
      const response = await freshAdapter.handleWebhook(request)
      expect(response.status).toBe(200)
    })
  })

  describe('postMessage', () => {
    it('posts a text message to a task', async () => {
      mockResponse({ data: { gid: 'new-story', text: 'Hello' } })
      const result = await adapter.postMessage('asana:task-123', 'Hello')
      expect(result.id).toBe('new-story')
      expect(result.threadId).toBe('asana:task-123')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/tasks/task-123/stories')
      expect(opts.method).toBe('POST')
    })
  })

  describe('editMessage', () => {
    it('updates a story', async () => {
      mockResponse({ data: { gid: 'story-1', text: 'Updated' } })
      const result = await adapter.editMessage('asana:task-123', 'story-1', 'Updated')
      expect(result.id).toBe('story-1')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/story-1')
      expect(opts.method).toBe('PUT')
    })
  })

  describe('deleteMessage', () => {
    it('deletes a story', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}), text: async () => '' })
      await adapter.deleteMessage('asana:task-123', 'story-1')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/story-1')
      expect(opts.method).toBe('DELETE')
    })
  })

  describe('fetchMessages', () => {
    it('fetches and filters comments', async () => {
      mockResponse({
        data: [
          createMockStory({ gid: 's1', type: 'comment', text: 'Comment' }),
          createMockStory({ gid: 's2', type: 'system', text: 'System msg' }),
          createMockStory({ gid: 's3', type: 'comment', text: 'Another comment' }),
        ],
        next_page: null,
      })
      const result = await adapter.fetchMessages('asana:task-123')
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].text).toBe('Comment')
      expect(result.messages[1].text).toBe('Another comment')
      expect(result.nextCursor).toBeUndefined()
    })

    it('passes cursor for pagination', async () => {
      mockResponse({
        data: [createMockStory()],
        next_page: { offset: 'next-offset' },
      })
      const result = await adapter.fetchMessages('asana:task-123', { cursor: 'prev-offset' })
      expect(result.nextCursor).toBe('next-offset')
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('offset=prev-offset')
    })

    it('uses custom limit', async () => {
      mockResponse({ data: [], next_page: null })
      await adapter.fetchMessages('asana:task-123', { limit: 10 })
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('limit=10')
    })
  })

  describe('fetchThread', () => {
    it('returns task info as ThreadInfo', async () => {
      mockResponse({
        data: { gid: 'task-123', name: 'My Task', notes: '', assignee: null, created_at: '2024-01-01', modified_at: '2024-01-02' },
      })
      const info = await adapter.fetchThread('asana:task-123')
      expect(info.id).toBe('asana:task-123')
      expect(info.channelId).toBe('asana:task-123')
      expect(info.channelName).toBe('My Task')
      expect(info.metadata.taskGid).toBe('task-123')
    })
  })

  describe('addReaction', () => {
    it('likes a story', async () => {
      mockResponse({})
      await adapter.addReaction('asana:task-123', 'story-1', 'heart')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/story-1/addHeart')
      expect(opts.method).toBe('POST')
    })
  })

  describe('removeReaction', () => {
    it('unlikes a story', async () => {
      mockResponse({})
      await adapter.removeReaction('asana:task-123', 'story-1', 'heart')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/story-1/removeHeart')
      expect(opts.method).toBe('POST')
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

  describe('initialize', () => {
    it('stores chat instance', async () => {
      const mockChat = {
        getLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() })),
        getState: vi.fn(),
        getUserName: vi.fn(),
        handleIncomingMessage: vi.fn(),
        processMessage: vi.fn(),
        processAction: vi.fn(),
        processReaction: vi.fn(),
        processSlashCommand: vi.fn(),
        processAppHomeOpened: vi.fn(),
        processAssistantContextChanged: vi.fn(),
        processAssistantThreadStarted: vi.fn(),
        processMemberJoinedChannel: vi.fn(),
        processModalClose: vi.fn(),
        processModalSubmit: vi.fn(),
      }
      await adapter.initialize(mockChat as any)
      expect(mockChat.getLogger).toHaveBeenCalledWith('asana')
    })
  })
})
