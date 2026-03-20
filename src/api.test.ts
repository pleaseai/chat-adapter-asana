import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAsanaApiClient } from './api'

describe('asanaApiClient', () => {
  const mockFetch = vi.fn()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const client = createAsanaApiClient('test-token', 'https://app.asana.com/api/1.0')

  function mockResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    })
  }

  describe('fetchTask', () => {
    it('sends correct request', async () => {
      mockResponse({ data: { gid: '123', name: 'Test Task' } })
      const task = await client.fetchTask('123')
      expect(task.gid).toBe('123')
      expect(task.name).toBe('Test Task')
      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/tasks/123')
      expect(opts.headers.Authorization).toBe('Bearer test-token')
    })
  })

  describe('fetchStories', () => {
    it('sends correct request', async () => {
      const stories = [{ gid: '456', text: 'Hello', type: 'comment' }]
      mockResponse({ data: stories, next_page: null })
      const result = await client.fetchStories('123')
      expect(result.data).toHaveLength(1)
      expect(result.data[0].gid).toBe('456')
    })

    it('passes offset parameter', async () => {
      mockResponse({ data: [], next_page: null })
      await client.fetchStories('123', { offset: 'abc123' })
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('offset=abc123')
    })

    it('uses custom limit', async () => {
      mockResponse({ data: [], next_page: null })
      await client.fetchStories('123', { limit: 10 })
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('limit=10')
    })
  })

  describe('postStory', () => {
    it('sends text in body', async () => {
      mockResponse({ data: { gid: '789', text: 'New comment' } })
      const story = await client.postStory('123', 'New comment')
      expect(story.gid).toBe('789')
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.method).toBe('POST')
      const body = JSON.parse(opts.body)
      expect(body.data.text).toBe('New comment')
    })

    it('sets is_pinned to false by default', async () => {
      mockResponse({ data: { gid: '789', text: 'Comment' } })
      await client.postStory('123', 'Comment')
      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.data.is_pinned).toBe(false)
    })

    it('supports isPinned option', async () => {
      mockResponse({ data: { gid: '789', text: 'Pinned' } })
      await client.postStory('123', 'Pinned', { isPinned: true })
      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.data.is_pinned).toBe(true)
    })
  })

  describe('updateStory', () => {
    it('sends PUT with text', async () => {
      mockResponse({ data: { gid: '789', text: 'Updated' } })
      const story = await client.updateStory('789', 'Updated')
      expect(story.text).toBe('Updated')
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.method).toBe('PUT')
    })
  })

  describe('deleteStory', () => {
    it('sends DELETE', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}), text: async () => '' })
      await client.deleteStory('789')
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.method).toBe('DELETE')
    })
  })

  describe('likeStory', () => {
    it('sends POST to addHeart', async () => {
      mockResponse({})
      await client.likeStory('789')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/789/addHeart')
      expect(opts.method).toBe('POST')
    })
  })

  describe('unlikeStory', () => {
    it('sends POST to removeHeart', async () => {
      mockResponse({})
      await client.unlikeStory('789')
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/stories/789/removeHeart')
      expect(opts.method).toBe('POST')
    })
  })

  describe('error handling', () => {
    it('throws on 401 response', async () => {
      mockResponse({}, 401)
      await expect(client.fetchTask('123')).rejects.toThrow(/401/)
    })

    it('throws on 403 response', async () => {
      mockResponse({}, 403)
      await expect(client.fetchTask('123')).rejects.toThrow(/403/)
    })

    it('throws on 404 response', async () => {
      mockResponse({}, 404)
      await expect(client.fetchTask('123')).rejects.toThrow(/not found/)
    })

    it('throws on 500 response', async () => {
      mockResponse({ error: 'Internal Server Error' }, 500)
      await expect(client.fetchTask('123')).rejects.toThrow(/500/)
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))
      await expect(client.fetchTask('123')).rejects.toThrow(/Request failed/)
    })
  })
})
