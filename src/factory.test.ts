import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAsanaAdapter } from './factory'

describe('createAsanaAdapter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('creates adapter from explicit config', () => {
    const adapter = createAsanaAdapter({
      accessToken: 'test-token-123',
    })
    expect(adapter.name).toBe('asana')
    expect(adapter.userName).toBe('asana-bot')
  })

  it('creates adapter with custom userName', () => {
    const adapter = createAsanaAdapter({
      accessToken: 'test-token-123',
      userName: 'my-bot',
    })
    expect(adapter.userName).toBe('my-bot')
  })

  it('reads ASANA_ACCESS_TOKEN from environment', () => {
    process.env.ASANA_ACCESS_TOKEN = 'env-token-456'
    const adapter = createAsanaAdapter()
    expect(adapter.name).toBe('asana')
  })

  it('throws when access token is missing', () => {
    delete process.env.ASANA_ACCESS_TOKEN
    expect(() => createAsanaAdapter()).toThrow('access token')
  })

  it('explicit config overrides environment', () => {
    process.env.ASANA_ACCESS_TOKEN = 'env-token'
    const adapter = createAsanaAdapter({ accessToken: 'explicit-token' })
    expect(adapter.name).toBe('asana')
  })
})
