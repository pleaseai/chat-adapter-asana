import { parseMarkdown } from 'chat'
import { describe, expect, it } from 'vitest'
import { fromAst, renderPostable, toAst } from './format-converter'

describe('toAst', () => {
  it('parses plain text', () => {
    const ast = toAst('Hello world')
    expect(ast.type).toBe('root')
    expect(ast.children).toHaveLength(1)
  })

  it('parses bold text', () => {
    const ast = toAst('**bold**')
    expect(ast.type).toBe('root')
  })

  it('parses empty string', () => {
    const ast = toAst('')
    expect(ast.type).toBe('root')
  })
})

describe('fromAst', () => {
  it('renders plain text', () => {
    const ast = toAst('Hello world')
    const result = fromAst(ast)
    expect(result).toContain('Hello world')
  })

  it('roundtrips bold text', () => {
    const ast = toAst('**bold**')
    const result = fromAst(ast)
    expect(result).toContain('**bold**')
  })
})

describe('renderPostable', () => {
  it('renders string message', () => {
    expect(renderPostable('Hello')).toBe('Hello')
  })

  it('renders markdown message', () => {
    expect(renderPostable({ markdown: '**bold text**' })).toBe('**bold text**')
  })

  it('renders ast message', () => {
    const ast = parseMarkdown('Hello from AST')
    const result = renderPostable({ ast })
    expect(result).toContain('Hello from AST')
  })

  it('renders card with title', () => {
    const card = { type: 'card' as const, title: 'Test Card', children: [] }
    const result = renderPostable(card)
    expect(result).toContain('Test Card')
  })

  it('returns empty string for unknown message type', () => {
    expect(renderPostable({} as any)).toBe('')
  })
})
