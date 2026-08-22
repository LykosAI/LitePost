import { describe, it, expect } from 'vitest'
import { appendStreamContent } from '@/utils/streaming'

const KB = 1024

describe('appendStreamContent', () => {
  it('appends without trimming while under the limit', () => {
    const result = appendStreamContent('abc', 'def', 1)
    expect(result.content).toBe('abcdef')
    expect(result.droppedChars).toBe(0)
  })

  it('treats a limit of 0 as unlimited', () => {
    const previous = 'x'.repeat(5 * KB)
    const result = appendStreamContent(previous, 'y'.repeat(5 * KB), 0)
    expect(result.content).toHaveLength(10 * KB)
    expect(result.droppedChars).toBe(0)
  })

  it('treats a negative limit as unlimited', () => {
    const result = appendStreamContent('x'.repeat(4 * KB), 'y', -1)
    expect(result.droppedChars).toBe(0)
  })

  it('keeps the buffer bounded at the limit', () => {
    const result = appendStreamContent('a'.repeat(3 * KB), 'b'.repeat(1 * KB), 2)
    expect(result.content.length).toBeLessThanOrEqual(2 * KB)
    expect(result.droppedChars).toBe(2 * KB)
  })

  it('retains the most recent output, not the oldest', () => {
    const result = appendStreamContent('old'.repeat(KB), 'NEWEST', 1)
    expect(result.content.endsWith('NEWEST')).toBe(true)
  })

  it('cuts at a line break so the first visible line is whole', () => {
    // 2KB of numbered lines, capped to 1KB: the retained text must start
    // cleanly at a line boundary rather than mid-line.
    const lines = Array.from({ length: 300 }, (_, i) => `line-${i}`).join('\n')
    const result = appendStreamContent(lines, '\nlast', 1)
    expect(result.content.startsWith('line-')).toBe(true)
  })

  it('does not hunt for a line break beyond the alignment window', () => {
    // No newline anywhere in range, so the cut lands exactly on the limit.
    const result = appendStreamContent('z'.repeat(8 * KB), '', 2)
    expect(result.content).toHaveLength(2 * KB)
    expect(result.droppedChars).toBe(6 * KB)
  })

  it('stays bounded across many successive appends', () => {
    let content = ''
    let dropped = 0
    for (let i = 0; i < 500; i++) {
      const next = appendStreamContent(content, `chunk ${i} payload\n`, 4)
      content = next.content
      dropped += next.droppedChars
    }
    expect(content.length).toBeLessThanOrEqual(4 * KB)
    expect(dropped).toBeGreaterThan(0)
    expect(content.endsWith('chunk 499 payload\n')).toBe(true)
  })
})
