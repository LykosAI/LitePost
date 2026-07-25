import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { StreamChunk, StreamingResponse } from '@/types'
import {
  StreamDonePayload,
  StreamHeaderPayload,
  StreamRequestOptions,
  createInitialStreamingResponse,
  createStreamEventNames,
  createStreamingTiming,
  shouldIgnoreStreamChunk,
  toErrorMessage,
} from '@/utils/streaming'

type UnlistenFn = () => void

export function useStreamingResponse() {
  const [streaming, setStreaming] = useState<StreamingResponse | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unlistenRef = useRef<UnlistenFn | null>(null)
  const requestId = useRef<string>('')
  const startTime = useRef<number>(0)

  const cleanupListeners = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }
  }, [])

  const startStream = async (options: StreamRequestOptions) => {
    cleanupListeners()

    const currentRequestId = crypto.randomUUID()
    requestId.current = currentRequestId
    startTime.current = Date.now()

    setError(null)
    setIsStreaming(true)
    setStreaming(createInitialStreamingResponse(startTime.current))

    try {
      const events = createStreamEventNames(currentRequestId)

      const headerListener = await listen<StreamHeaderPayload>(events.headers, (event) => {
        const payload = event.payload
        setStreaming((prev) => {
          if (!prev) return null
          return {
            ...prev,
            status: payload.status,
            statusText: payload.statusText,
            headers: payload.headers,
          }
        })
      })

      const chunkListener = await listen<StreamChunk>(events.chunk, (event) => {
        const chunk: StreamChunk = {
          ...event.payload,
          timestamp: Date.now(),
        }

        if (shouldIgnoreStreamChunk(chunk)) {
          return
        }

        setStreaming((prev) => {
          if (!prev) return null
          return {
            ...prev,
            chunkCount: prev.chunkCount + 1,
            currentContent: prev.currentContent + chunk.data,
            timing: createStreamingTiming(startTime.current),
          }
        })
      })

      const doneListener = await listen<StreamDonePayload>(events.done, (event) => {
        const payload = event.payload ?? {}
        const streamError = payload.cancelled
          ? 'Request cancelled by user'
          : payload.error

        setStreaming((prev) => {
          if (!prev) return null
          return {
            ...prev,
            isComplete: true,
            error: streamError || prev.error,
            timing: createStreamingTiming(startTime.current),
          }
        })
        setIsStreaming(false)
      })

      unlistenRef.current = () => {
        headerListener()
        chunkListener()
        doneListener()
      }

      await invoke('stream_sse', { options, requestId: currentRequestId })
    } catch (err) {
      const errorMessage = toErrorMessage(err)
      setError(errorMessage)
      setIsStreaming(false)
      setStreaming((prev) => {
        const base = prev ?? createInitialStreamingResponse(startTime.current || Date.now())
        return {
          ...base,
          error: errorMessage,
          isComplete: true,
          timing: createStreamingTiming(startTime.current || Date.now()),
        }
      })
      cleanupListeners()
    }
  }

  const cancelStream = async () => {
    if (requestId.current) {
      try {
        await invoke('cancel_stream', { requestId: requestId.current })
      } catch {
        // If backend cancellation fails, still close stream state in UI.
      }
    }

    cleanupListeners()
    setStreaming((prev) => {
      if (!prev) return null
      return {
        ...prev,
        isComplete: true,
        error: 'Request cancelled by user',
        timing: createStreamingTiming(startTime.current),
      }
    })
    setIsStreaming(false)
  }

  const resetStream = useCallback(() => {
    cleanupListeners()
    requestId.current = ''
    startTime.current = 0
    setStreaming(null)
    setIsStreaming(false)
    setError(null)
  }, [cleanupListeners])

  useEffect(() => {
    return () => {
      resetStream()
    }
  }, [resetStream])

  return {
    streaming,
    isStreaming,
    error,
    startStream,
    cancelStream,
    resetStream,
  }
}
