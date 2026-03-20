import type {
  Adapter,
  AdapterPostableMessage,
  ChatInstance,
  EmojiValue,
  FetchOptions,
  FetchResult,
  FormattedContent,
  Logger,
  RawMessage,
  ThreadInfo,
  WebhookOptions,
} from 'chat'
import type { AsanaApiClient } from './api'
import type { AsanaAdapterConfig, AsanaRawMessage, AsanaThreadId } from './types'
import { ValidationError } from '@chat-adapter/shared'
import { ConsoleLogger, Message, stringifyMarkdown } from 'chat'
import { createAsanaApiClient } from './api'
import { renderPostable, toAst } from './format-converter'
import { createHandshakeResponse, extractStoryEvents, isHandshake, verifySignature } from './webhook'

export class AsanaAdapter implements Adapter<AsanaThreadId, AsanaRawMessage> {
  readonly name = 'asana'
  readonly userName: string

  private chat: ChatInstance | null = null
  private logger: Logger
  private api: AsanaApiClient
  private webhookSecret: string | null = null
  readonly botUserId: string | undefined

  constructor(config: AsanaAdapterConfig) {
    this.userName = config.userName ?? 'asana-bot'
    this.logger = config.logger ?? new ConsoleLogger()
    this.api = createAsanaApiClient(
      config.accessToken,
      config.baseUrl ?? 'https://app.asana.com/api/1.0',
    )
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat
    this.logger = chat.getLogger('asana')
  }

  encodeThreadId(data: AsanaThreadId): string {
    return `asana:${data.taskGid}`
  }

  decodeThreadId(threadId: string): AsanaThreadId {
    const parts = threadId.split(':')
    if (parts.length !== 2 || parts[0] !== 'asana' || !parts[1]) {
      throw new ValidationError('asana', `Invalid Asana thread ID: ${threadId}`)
    }
    return { taskGid: parts[1] }
  }

  channelIdFromThreadId(threadId: string): string {
    return threadId
  }

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    // Step 1: Handle handshake
    const hookSecret = isHandshake(request)
    if (hookSecret) {
      this.webhookSecret = hookSecret
      this.logger.info('webhook handshake completed')
      return createHandshakeResponse(hookSecret)
    }

    // Step 2: Verify signature
    const signature = request.headers.get('x-hook-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 401 })
    }

    const body = await request.text()

    if (this.webhookSecret && !verifySignature(body, signature, this.webhookSecret)) {
      return new Response('Invalid signature', { status: 401 })
    }

    // Step 3: Parse and process events
    let payload: { events: unknown[] }
    try {
      payload = JSON.parse(body)
    }
    catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const storyEvents = extractStoryEvents(payload as any)

    for (const event of storyEvents) {
      if (!event.parent?.gid || !this.chat)
        continue

      const taskGid = event.parent.gid
      const storyGid = event.resource.gid
      const threadId = this.encodeThreadId({ taskGid })

      const factory = async (): Promise<Message<AsanaRawMessage>> => {
        const stories = await this.api.fetchStories(taskGid, { limit: 1 })
        const story = stories.data.find(s => s.gid === storyGid)
        if (!story) {
          throw new Error(`Story ${storyGid} not found on task ${taskGid}`)
        }
        return this.parseMessage(story)
      }

      this.chat.processMessage(this, threadId, factory, options)
    }

    return new Response('OK', { status: 200 })
  }

  parseMessage(raw: AsanaRawMessage): Message<AsanaRawMessage> {
    const threadId = raw.target?.gid
      ? this.encodeThreadId({ taskGid: raw.target.gid })
      : 'asana:unknown'

    const isBotMessage = raw.created_by?.gid === this.botUserId

    return new Message({
      id: raw.gid,
      threadId,
      text: raw.text ?? '',
      formatted: toAst(raw.text ?? ''),
      raw,
      author: {
        userId: raw.created_by?.gid ?? 'unknown',
        userName: raw.created_by?.name ?? 'unknown',
        fullName: raw.created_by?.name ?? '',
        isBot: isBotMessage,
        isMe: isBotMessage,
      },
      metadata: {
        dateSent: new Date(raw.created_at),
        edited: raw.is_edited ?? false,
      },
      attachments: [],
    })
  }

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<AsanaRawMessage>> {
    const { taskGid } = this.decodeThreadId(threadId)
    const text = renderPostable(message)
    const story = await this.api.postStory(taskGid, text)
    return { id: story.gid, threadId, raw: story }
  }

  async editMessage(threadId: string, messageId: string, message: AdapterPostableMessage): Promise<RawMessage<AsanaRawMessage>> {
    const text = renderPostable(message)
    const story = await this.api.updateStory(messageId, text)
    return { id: story.gid, threadId, raw: story }
  }

  async deleteMessage(_threadId: string, messageId: string): Promise<void> {
    await this.api.deleteStory(messageId)
  }

  async fetchMessages(threadId: string, options?: FetchOptions): Promise<FetchResult<AsanaRawMessage>> {
    const { taskGid } = this.decodeThreadId(threadId)
    const limit = options?.limit ?? 50
    const offset = options?.cursor

    const result = await this.api.fetchStories(taskGid, { limit, offset })

    // Filter to comments only (type === "comment")
    const comments = result.data.filter(s => s.type === 'comment')
    const messages = comments.map(s => this.parseMessage(s))

    return {
      messages,
      nextCursor: result.next_page?.offset,
    }
  }

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const { taskGid } = this.decodeThreadId(threadId)
    const task = await this.api.fetchTask(taskGid)
    return {
      id: threadId,
      channelId: threadId,
      channelName: task.name,
      metadata: {
        taskGid: task.gid,
        taskName: task.name,
      },
    }
  }

  async addReaction(threadId: string, messageId: string, _emoji: EmojiValue | string): Promise<void> {
    await this.api.likeStory(messageId)
  }

  async removeReaction(threadId: string, messageId: string, _emoji: EmojiValue | string): Promise<void> {
    await this.api.unlikeStory(messageId)
  }

  async startTyping(_threadId: string): Promise<void> {
    // Asana has no typing indicator API — no-op
  }

  renderFormatted(content: FormattedContent): string {
    return stringifyMarkdown(content)
  }
}
