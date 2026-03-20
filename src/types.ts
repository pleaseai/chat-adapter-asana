import type { Logger } from 'chat'

/** Decoded thread ID components for Asana */
export interface AsanaThreadId {
  /** Asana task GID (numeric string) */
  taskGid: string
}

/** Configuration for the Asana adapter */
export interface AsanaAdapterConfig {
  /** Asana API access token (PAT or service account token) */
  accessToken: string
  /** Asana API base URL (default: "https://app.asana.com/api/1.0") */
  baseUrl?: string
  /** Custom logger instance */
  logger?: Logger
  /** Bot display name (default: "asana-bot") */
  userName?: string
}

/** Asana user reference */
export interface AsanaUser {
  gid: string
  name: string
  resource_type: string
}

/** Asana story (comment) — the raw message type */
export interface AsanaRawMessage {
  created_at: string
  created_by: AsanaUser
  gid: string
  html_text?: string
  is_edited?: boolean
  likes?: Array<{ gid: string, user: AsanaUser }>
  num_likes?: number
  resource_type: string
  target?: { gid: string, resource_type: string }
  text: string
  type: string
}

/** Asana task summary */
export interface AsanaTask {
  assignee: AsanaUser | null
  created_at: string
  gid: string
  modified_at: string
  name: string
  notes: string
  resource_type: string
}

/** Asana webhook event */
export interface AsanaWebhookEvent {
  action: string
  change?: { action: string, field: string }
  parent?: { gid: string, resource_type: string }
  resource: { gid: string, resource_type: string }
  user?: { gid: string, resource_type: string }
}

/** Asana webhook payload */
export interface AsanaWebhookPayload {
  events: AsanaWebhookEvent[]
}
