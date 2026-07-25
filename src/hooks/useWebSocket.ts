import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebSocketMessage, WebSocketState } from '@/types'

type UnlistenFn = () => void

interface WsConnectOptions {
  url: string
  headers: Record<string, string>
  protocols?: string[]
}

interface WsMessagePayload {
  data: string
  is_binary: boolean
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

interface WsConnectedPayload {
  timestamp: number
}

interface WsClosedPayload {
  reason: string
  clean: boolean
  timestamp: number
}

interface WsErrorPayload {
  error: string
}

const MAX_MESSAGES = 500

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    connectionId: '',
    isConnected: false,
    messages: [],
    connectedAt: null,
    error: null,
  })

  const unlistenRef = useRef<UnlistenFn | null>(null)
  const connectionIdRef = useRef<string>('')

  const cleanupListeners = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }
  }, [])

  const connect = useCallback(async (options: WsConnectOptions) => {
    // Disconnect existing connection first
    if (connectionIdRef.current) {
      try {
        await invoke('ws_disconnect', { connectionId: connectionIdRef.current })
      } catch {
        // Ignore
      }
      cleanupListeners()
    }

    const connectionId = crypto.randomUUID()
    connectionIdRef.current = connectionId

    setState({
      connectionId,
      isConnected: false,
      messages: [],
      connectedAt: null,
      error: null,
    })

    try {
      const connectedEvent = `ws-connected-${connectionId}`
      const messageEvent = `ws-message-${connectionId}`
      const errorEvent = `ws-error-${connectionId}`
      const closedEvent = `ws-closed-${connectionId}`

      const connectedListener = await listen<WsConnectedPayload>(connectedEvent, () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectedAt: Date.now(),
          error: null,
        }))
      })

      const messageListener = await listen<WsMessagePayload>(messageEvent, (event) => {
        const payload = event.payload
        const msg: WebSocketMessage = {
          id: crypto.randomUUID(),
          data: payload.data,
          isBinary: payload.is_binary,
          timestamp: payload.timestamp,
          direction: payload.direction as 'incoming' | 'outgoing',
        }

        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-MAX_MESSAGES + 1), msg],
        }))
      })

      const errorListener = await listen<WsErrorPayload>(errorEvent, (event) => {
        setState(prev => ({
          ...prev,
          error: event.payload.error,
        }))
      })

      const closedListener = await listen<WsClosedPayload>(closedEvent, (event) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: prev.error || (event.payload.clean ? null : event.payload.reason),
        }))
        cleanupListeners()
      })

      unlistenRef.current = () => {
        connectedListener()
        messageListener()
        errorListener()
        closedListener()
      }

      await invoke('ws_connect', {
        options: {
          url: options.url,
          headers: options.headers,
          protocols: options.protocols || null,
        },
        connectionId,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: errorMessage,
      }))
      cleanupListeners()
    }
  }, [cleanupListeners])

  const sendMessage = useCallback(async (message: string) => {
    if (!connectionIdRef.current) return

    try {
      await invoke('ws_send', {
        connectionId: connectionIdRef.current,
        message,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }))
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!connectionIdRef.current) return

    try {
      await invoke('ws_disconnect', { connectionId: connectionIdRef.current })
    } catch {
      // Ignore disconnect errors
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
    }))
    cleanupListeners()
  }, [cleanupListeners])

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionIdRef.current) {
        invoke('ws_disconnect', { connectionId: connectionIdRef.current }).catch(() => {})
      }
      cleanupListeners()
    }
  }, [cleanupListeners])

  return {
    ...state,
    connect,
    sendMessage,
    disconnect,
    clearMessages,
  }
}
