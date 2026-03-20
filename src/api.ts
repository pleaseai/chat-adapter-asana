import { NetworkError, AuthenticationError, ResourceNotFoundError } from '@chat-adapter/shared'
import type { AsanaRawMessage, AsanaTask } from './types'

const TIMEOUT_MS = 30_000
const ADAPTER_NAME = 'asana'

export interface AsanaApiClient {
  deleteStory(storyGid: string): Promise<void>
  fetchStories(taskGid: string, options?: { limit?: number, offset?: string }): Promise<{
    data: AsanaRawMessage[]
    next_page: { offset: string } | null
  }>
  fetchTask(taskGid: string): Promise<AsanaTask>
  likeStory(storyGid: string): Promise<void>
  postStory(taskGid: string, text: string, options?: { isPinned?: boolean }): Promise<AsanaRawMessage>
  unlikeStory(storyGid: string): Promise<void>
  updateStory(storyGid: string, text: string): Promise<AsanaRawMessage>
}

export function createAsanaApiClient(accessToken: string, baseUrl: string): AsanaApiClient {
  function headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${path}`
    let response: Response
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      response = await fetch(url, {
        method,
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
    }
    catch (cause) {
      throw new NetworkError(ADAPTER_NAME, `Request failed: ${method} ${path}`, cause instanceof Error ? cause : undefined)
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(ADAPTER_NAME, `${response.status} on ${method} ${path}`)
    }

    if (response.status === 404) {
      throw new ResourceNotFoundError(ADAPTER_NAME, 'resource', path)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new NetworkError(ADAPTER_NAME, `${response.status} on ${method} ${path}: ${text}`)
    }

    if (response.status === 204 || method === 'DELETE') {
      return undefined as T
    }

    const json = await response.json()
    return json as T
  }

  return {
    async fetchTask(taskGid: string): Promise<AsanaTask> {
      const result = await request<{ data: AsanaTask }>('GET', `/tasks/${taskGid}?opt_fields=gid,name,notes,assignee,assignee.name,created_at,modified_at`)
      return result.data
    },

    async fetchStories(taskGid: string, options?: { limit?: number, offset?: string }) {
      const limit = options?.limit ?? 50
      let path = `/tasks/${taskGid}/stories?opt_fields=gid,text,html_text,type,created_at,created_by,created_by.name,is_edited,likes,likes.user,likes.user.name,num_likes,target&limit=${limit}`
      if (options?.offset) {
        path += `&offset=${encodeURIComponent(options.offset)}`
      }
      const result = await request<{ data: AsanaRawMessage[], next_page: { offset: string } | null }>('GET', path)
      return { data: result.data, next_page: result.next_page }
    },

    async postStory(taskGid: string, text: string, options?: { isPinned?: boolean }): Promise<AsanaRawMessage> {
      const result = await request<{ data: AsanaRawMessage }>('POST', `/tasks/${taskGid}/stories`, {
        data: { text, is_pinned: options?.isPinned ?? false },
      })
      return result.data
    },

    async updateStory(storyGid: string, text: string): Promise<AsanaRawMessage> {
      const result = await request<{ data: AsanaRawMessage }>('PUT', `/stories/${storyGid}`, {
        data: { text },
      })
      return result.data
    },

    async deleteStory(storyGid: string): Promise<void> {
      await request<void>('DELETE', `/stories/${storyGid}`)
    },

    async likeStory(storyGid: string): Promise<void> {
      await request<void>('POST', `/stories/${storyGid}/addHeart`, { data: {} })
    },

    async unlikeStory(storyGid: string): Promise<void> {
      await request<void>('POST', `/stories/${storyGid}/removeHeart`, { data: {} })
    },
  }
}
