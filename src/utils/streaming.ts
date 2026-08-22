import { Cookie, StreamChunk, StreamingResponse } from '@/types'

export interface StreamRequestOptions {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  content_type?: string
  cookies: Cookie[]
}

export interface StreamHeaderPayload {
  status: number
  statusText: string
  headers: Record<string, string>
}

export interface StreamDonePayload {
  cancelled?: boolean
  error?: string
}

export function createStreamEventNames(requestId: string) {
  return {
    headers: `sse-headers-${requestId}`,
    chunk: `sse-chunk-${requestId}`,
    done: `sse-done-${requestId}`,
  }
}

export function createStreamingTiming(startTime: number) {
  const now = Date.now()
  return {
    start: startTime,
    current: now,
    duration: now - startTime,
  }
}

export function createInitialStreamingResponse(startTime: number): StreamingResponse {
  return {
    status: 0,
    statusText: 'Pending',
    headers: {},
    chunkCount: 0,
    currentContent: '',
    isComplete: false,
    streamType: 'sse',
    timing: createStreamingTiming(startTime),
  }
}

export function shouldIgnoreStreamChunk(chunk: Pick<StreamChunk, 'data' | 'event'>): boolean {
  if (!chunk.data || chunk.data.trim() === '') {
    return true
  }

  return chunk.event === 'stats' || chunk.event === 'ping'
}

const CHARS_PER_KB = 1024
/** How far into the retained window we will look for a line break to cut on. */
const NEWLINE_ALIGN_WINDOW = 1024

/**
 * Append a chunk to the accumulated stream body, keeping at most `maxBufferKB`
 * of trailing content. Long-lived streams (a log tail, an SSE endpoint left
 * open overnight) would otherwise grow the buffer — and the DOM node rendering
 * it — without bound. `maxBufferKB <= 0` means unlimited.
 *
 * Sizes are in characters rather than encoded bytes; the point is to bound the
 * work per render, not to account for storage exactly.
 */
export function appendStreamContent(
  previous: string,
  addition: string,
  maxBufferKB: number
): { content: string; droppedChars: number } {
  const content = previous + addition

  if (maxBufferKB <= 0) {
    return { content, droppedChars: 0 }
  }

  const limit = maxBufferKB * CHARS_PER_KB
  if (content.length <= limit) {
    return { content, droppedChars: 0 }
  }

  let cut = content.length - limit
  // Prefer cutting at a line break so the first visible line is not a fragment.
  const newline = content.indexOf('\n', cut)
  if (newline !== -1 && newline - cut < NEWLINE_ALIGN_WINDOW) {
    cut = newline + 1
  }

  return { content: content.slice(cut), droppedChars: cut }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function tryParseStreamingJson(content: string): unknown {
  const trimmed = content.trim()
  if (!trimmed) {
    return null
  }

  try {
    if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
      return JSON.parse(`${trimmed}]`)
    }

    return JSON.parse(trimmed)
  } catch {
    return null
  }
}
