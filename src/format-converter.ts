import type { FormattedContent } from 'chat'
import { parseMarkdown, stringifyMarkdown } from 'chat'
import { extractCard } from '@chat-adapter/shared'
import type { AdapterPostableMessage } from 'chat'

/**
 * Convert Asana story text to mdast AST.
 * Asana comments use plain text with basic markdown-like formatting.
 */
export function toAst(text: string): FormattedContent {
  return parseMarkdown(text)
}

/**
 * Convert mdast AST back to plain text for Asana.
 */
export function fromAst(ast: FormattedContent): string {
  return stringifyMarkdown(ast)
}

/**
 * Convert an AdapterPostableMessage to a plain text string for Asana stories.
 */
export function renderPostable(message: AdapterPostableMessage): string {
  if (typeof message === 'string') {
    return message
  }

  const card = extractCard(message)
  if (card) {
    // Render card as plain text fallback
    const lines: string[] = []
    if (card.title) lines.push(card.title)
    return lines.join('\n')
  }

  if ('markdown' in message && typeof message.markdown === 'string') {
    return message.markdown
  }

  if ('ast' in message && message.ast) {
    return fromAst(message.ast as FormattedContent)
  }

  if ('text' in message && typeof message.text === 'string') {
    return message.text
  }

  return ''
}
