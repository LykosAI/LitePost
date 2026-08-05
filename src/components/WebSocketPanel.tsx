import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { basicAuthValue } from '@/utils/base64'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plug,
  Unplug,
  Send,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Circle,
  Braces,
  Clock,
  Filter,
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { WebSocketMessage, Header, AuthConfig } from '@/types'

interface WebSocketPanelProps {
  url: string
  headers: Header[]
  auth: AuthConfig
}

type MessageFilter = 'all' | 'incoming' | 'outgoing'

function tryFormatJson(data: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(data)
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { formatted: data, isJson: false }
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions)
}

export function WebSocketPanel({ url, headers, auth }: WebSocketPanelProps) {
  const {
    isConnected,
    messages,
    connectedAt,
    error,
    connect,
    sendMessage,
    disconnect,
    clearMessages,
  } = useWebSocket()

  const [messageInput, setMessageInput] = useState('')
  const [formatJson, setFormatJson] = useState(true)
  const [filter, setFilter] = useState<MessageFilter>('all')
  const [wsUrl, setWsUrl] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Derive WS URL from the HTTP URL
  useEffect(() => {
    if (!url) return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:') parsed.protocol = 'ws:'
      else if (parsed.protocol === 'https:') parsed.protocol = 'wss:'
      setWsUrl(parsed.toString())
    } catch {
      setWsUrl(url)
    }
  }, [url])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect()
      return
    }

    const headerRecord: Record<string, string> = {}
    headers.forEach(h => {
      if (h.enabled && h.key) {
        headerRecord[h.key] = h.value
      }
    })

    // Apply auth
    if (auth.type === 'basic' && auth.username) {
      headerRecord['Authorization'] = basicAuthValue(auth.username, auth.password || '')
    } else if (auth.type === 'bearer' && auth.token) {
      headerRecord['Authorization'] = `Bearer ${auth.token}`
    } else if (auth.type === 'api-key' && auth.key && auth.value && auth.addTo === 'header') {
      headerRecord[auth.key] = auth.value
    } else if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
      headerRecord['Authorization'] = `${auth.oauth2.tokenType || 'Bearer'} ${auth.oauth2.accessToken}`
    }

    connect({ url: wsUrl, headers: headerRecord })
  }, [isConnected, wsUrl, headers, auth, connect, disconnect])

  const handleSend = useCallback(() => {
    if (!messageInput.trim() || !isConnected) return
    sendMessage(messageInput)
    setMessageInput('')
  }, [messageInput, isConnected, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const filteredMessages = useMemo(() => {
    if (filter === 'all') return messages
    return messages.filter(m => m.direction === filter)
  }, [messages, filter])

  const incomingCount = useMemo(() => messages.filter(m => m.direction === 'incoming').length, [messages])
  const outgoingCount = useMemo(() => messages.filter(m => m.direction === 'outgoing').length, [messages])

  const connectionDuration = useMemo(() => {
    if (!connectedAt || !isConnected) return null
    return Math.round((Date.now() - connectedAt) / 1000)
  }, [connectedAt, isConnected])

  // Refresh duration display
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isConnected) return
    const timer = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [isConnected])

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="h-full flex flex-col">
        {/* Connection bar */}
        <div className="flex items-center gap-2 p-3 pb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Circle className={`h-2.5 w-2.5 shrink-0 ${isConnected ? 'text-emerald-400 fill-emerald-400' : 'text-muted-foreground/30 fill-muted-foreground/30'}`} />
            <Input
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8080 or wss://..."
              disabled={isConnected}
              className="h-8 text-xs font-mono flex-1 bg-secondary/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConnect()
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleConnect}
            className={`h-8 px-3 text-xs font-medium ${isConnected
              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
              : 'bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20'
              }`}
            variant="ghost"
          >
            {isConnected ? (
              <>
                <Unplug className="h-3.5 w-3.5 mr-1.5" />
                Disconnect
              </>
            ) : (
              <>
                <Plug className="h-3.5 w-3.5 mr-1.5" />
                Connect
              </>
            )}
          </Button>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-3 pb-2">
          {isConnected && (
            <span className="text-[11px] text-emerald-400/70 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Connected {connectionDuration != null ? `${connectionDuration}s` : ''}
            </span>
          )}
          {error && (
            <span className="text-[11px] text-red-400/80 truncate flex-1">
              {error}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground/50">
            <span className="flex items-center gap-0.5">
              <ArrowDownLeft className="h-3 w-3 text-blue-400/50" />
              {incomingCount}
            </span>
            <span className="flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3 text-emerald-400/50" />
              {outgoingCount}
            </span>
          </div>
        </div>

        <div className="gradient-line mx-3 opacity-30" />

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground/50" />
            <Select value={filter} onValueChange={(v) => setFilter(v as MessageFilter)}>
              <SelectTrigger className="h-7 w-[110px] text-[11px] bg-secondary/30 border-border/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All messages</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFormatJson(!formatJson)}
                className={`h-7 px-2 text-xs ${formatJson ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Braces className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {formatJson ? 'JSON formatting on' : 'JSON formatting off'}
            </TooltipContent>
          </Tooltip>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear messages</TooltipContent>
          </Tooltip>
        </div>

        {/* Message log */}
        <div className="flex-1 min-h-0 px-3">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="space-y-1.5 pb-2">
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/40">
                  {isConnected ? 'Waiting for messages...' : 'Connect to start'}
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} formatJson={formatJson} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Send bar */}
        <div className="p-3 pt-2 border-t border-border/20">
          <div className="flex items-center gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Type a message...' : 'Connect first to send messages'}
              disabled={!isConnected}
              className="h-9 text-xs font-mono flex-1 bg-secondary/30"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!isConnected || !messageInput.trim()}
              className="h-9 px-4"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}

// Individual message item
function MessageItem({ message, formatJson }: { message: WebSocketMessage; formatJson: boolean }) {
  const isIncoming = message.direction === 'incoming'
  const { formatted, isJson } = useMemo(
    () => (formatJson ? tryFormatJson(message.data) : { formatted: message.data, isJson: false }),
    [message.data, formatJson],
  )

  return (
    <div className={`rounded-lg border p-2.5 text-[12px] ${isIncoming
      ? 'bg-blue-500/5 border-blue-500/10'
      : 'bg-emerald-500/5 border-emerald-500/10'
      }`}>
      <div className="flex items-center gap-1.5 mb-1">
        {isIncoming ? (
          <ArrowDownLeft className="h-3 w-3 text-blue-400/70" />
        ) : (
          <ArrowUpRight className="h-3 w-3 text-emerald-400/70" />
        )}
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isIncoming ? 'text-blue-400/70' : 'text-emerald-400/70'}`}>
          {isIncoming ? 'received' : 'sent'}
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto font-mono">
          {formatTimestamp(message.timestamp)}
        </span>
        {isJson && (
          <span className="text-[9px] text-primary/50 bg-primary/10 px-1 rounded">JSON</span>
        )}
      </div>
      <pre className={`font-mono whitespace-pre-wrap break-all ${isJson ? 'text-foreground/80' : 'text-foreground/70'}`}>
        {formatted}
      </pre>
    </div>
  )
}
