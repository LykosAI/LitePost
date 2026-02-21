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
    chunks: [],
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
