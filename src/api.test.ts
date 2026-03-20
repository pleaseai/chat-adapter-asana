import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('fetchTask sends correct request', async () => {
    mockResponse({ data: { gid: '123', name: 'Test Task' } })
    const task = await client.fetchTask('123')
    expect(task.gid).toBe('123')
    expect(task.name).toBe('Test Task')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/tasks/123')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  it('fetchStories sends correct request', async () => {
    const stories = [{ gid: '456', text: 'Hello', type: 'comment' }]
    mockResponse({ data: stories, next_page: null })
    const result = await client.fetchStories('123')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].gid).toBe('456')
  })

  it('postStory sends text in body', async () => {
    mockResponse({ data: { gid: '789', text: 'New comment' } })
    const story = await client.postStory('123', 'New comment')
    expect(story.gid).toBe('789')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.data.text).toBe('New comment')
  })

  it('updateStory sends PUT with text', async () => {
    mockResponse({ data: { gid: '789', text: 'Updated' } })
    const story = await client.updateStory('789', 'Updated')
    expect(story.text).toBe('Updated')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('PUT')
  })

  it('deleteStory sends DELETE', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
      text: async () => '',
    })
    await client.deleteStory('789')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('DELETE')
  })

  it('throws on 401 response', async () => {
    mockResponse({}, 401)
    await expect(client.fetchTask('123')).rejects.toThrow(/401/)
  })

  it('throws on 404 response', async () => {
    mockResponse({}, 404)
    await expect(client.fetchTask('123')).rejects.toThrow(/not found/)
  })
})
