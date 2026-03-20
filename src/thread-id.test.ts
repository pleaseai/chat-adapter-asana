import { describe, it, expect } from 'vitest'
import { AsanaAdapter } from './adapter'

const adapter = new AsanaAdapter({
  accessToken: 'test-token',
})

describe('thread ID encoding', () => {
  it('roundtrips a task GID', () => {
    const data = { taskGid: '1234567890' }
    const encoded = adapter.encodeThreadId(data)
    const decoded = adapter.decodeThreadId(encoded)
    expect(decoded.taskGid).toBe(data.taskGid)
    expect(encoded).toBe('asana:1234567890')
  })

  it('encodes to expected format', () => {
    const encoded = adapter.encodeThreadId({ taskGid: '9876543210' })
    expect(encoded).toBe('asana:9876543210')
  })

  it('throws on invalid format — missing prefix', () => {
    expect(() => adapter.decodeThreadId('invalid')).toThrow()
  })

  it('throws on invalid format — wrong prefix', () => {
    expect(() => adapter.decodeThreadId('slack:C123:ts')).toThrow()
  })

  it('throws on invalid format — too many parts', () => {
    expect(() => adapter.decodeThreadId('asana:123:extra')).toThrow()
  })

  it('throws on invalid format — empty task GID', () => {
    expect(() => adapter.decodeThreadId('asana:')).toThrow()
  })

  it('channelIdFromThreadId returns the threadId itself', () => {
    const threadId = 'asana:1234567890'
    expect(adapter.channelIdFromThreadId(threadId)).toBe(threadId)
  })
})
