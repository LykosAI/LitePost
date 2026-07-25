import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Wifi, Loader2, XCircle, Send, ChevronDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useVariablePeek } from "@/hooks/useVariablePeek"
import { cn } from "@/lib/utils"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
const URL_IDLE_COMMIT_MS = 800

// Method-specific colors for the select trigger (brighter/more vivid)
const methodSelectColors: Record<string, string> = {
  GET: "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.25)]",
  POST: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.25)]",
  PUT: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.25)]",
  DELETE: "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.25)]",
  PATCH: "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.25)]",
  HEAD: "text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.25)]",
  OPTIONS: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]",
}

interface RequestUrlBarProps {
  method: string
  url: string
  loading: boolean
  isStreaming?: boolean
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onSend: () => void
  onSave: () => void
  onStreamSSE?: () => void
}

export interface RequestUrlBarHandle {
  flush: () => string
}

export const RequestUrlBar = forwardRef<RequestUrlBarHandle, RequestUrlBarProps>(function RequestUrlBar({
  method,
  url,
  loading,
  isStreaming = false,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  onStreamSSE,
}, ref) {
  const themeClass = useThemeClass()
  const [draftUrl, setDraftUrl] = useState(url)
  const draftUrlRef = useRef(url)
  const lastCommittedUrl = useRef(url)
  const idleCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onUrlChangeRef = useRef(onUrlChange)
  onUrlChangeRef.current = onUrlChange

  const clearIdleCommit = useCallback(() => {
    if (idleCommitTimer.current) {
      clearTimeout(idleCommitTimer.current)
      idleCommitTimer.current = null
    }
  }, [])

  const flushUrl = useCallback(() => {
    clearIdleCommit()

    const latestUrl = draftUrlRef.current
    if (latestUrl !== lastCommittedUrl.current) {
      lastCommittedUrl.current = latestUrl
      onUrlChangeRef.current(latestUrl)
    }

    return latestUrl
  }, [clearIdleCommit])

  useImperativeHandle(ref, () => ({
    flush: flushUrl,
  }), [flushUrl])

  useEffect(() => {
    if (url !== lastCommittedUrl.current) {
      clearIdleCommit()
      lastCommittedUrl.current = url
      draftUrlRef.current = url
      setDraftUrl(url)
    }
  }, [clearIdleCommit, url])

  useEffect(() => {
    return () => {
      flushUrl()
    }
  }, [flushUrl])

  const scheduleUrlCommit = useCallback(() => {
    clearIdleCommit()
    idleCommitTimer.current = setTimeout(() => {
      idleCommitTimer.current = null
      const latestUrl = draftUrlRef.current
      if (latestUrl !== lastCommittedUrl.current) {
        lastCommittedUrl.current = latestUrl
        onUrlChangeRef.current(latestUrl)
      }
    }, URL_IDLE_COMMIT_MS)
  }, [clearIdleCommit])

  const handleUrlInputChange = useCallback((nextUrl: string) => {
    draftUrlRef.current = nextUrl
    setDraftUrl(nextUrl)
    scheduleUrlCommit()
  }, [scheduleUrlCommit])

  const handleSend = useCallback(() => {
    flushUrl()
    onSend()
  }, [flushUrl, onSend])

  const handleSave = useCallback(() => {
    flushUrl()
    onSave()
  }, [flushUrl, onSave])

  const handleStreamSSE = useCallback(() => {
    flushUrl()
    onStreamSSE?.()
  }, [flushUrl, onStreamSSE])

  // Resolve each {{var}} against the active environment for the peek tooltip
  const { resolved: resolvedVariables, unresolvedCount, hasActiveEnvironment } = useVariablePeek(draftUrl)
  const templateVariables = resolvedVariables.map((variable) => variable.token)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-2.5 p-4 pb-2">
        {/* Unified Pill for Method + URL */}
        <div className="flex-1 min-w-0 flex items-center h-10 bg-secondary/20 border border-border/40 rounded-lg focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-ring/50 focus-within:bg-secondary/30 transition-all duration-300 shadow-sm relative group">

          <div className="w-[105px] h-full shrink-0 border-r border-border/30">
            <Select value={method} onValueChange={onMethodChange}>
              <SelectTrigger className={cn(
                "w-full h-full bg-transparent border-0 focus:ring-0 focus:ring-offset-0 font-bold text-[13px] tracking-wide rounded-l-lg rounded-r-none shadow-none hover:bg-secondary/40 transition-colors",
                methodSelectColors[method] || "text-foreground"
              )}>
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className={`${themeClass} bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl overflow-hidden`}>
                {HTTP_METHODS.map((m) => (
                  <SelectItem
                    key={m}
                    value={m}
                    className={cn(
                      "hover:bg-accent/20 focus:bg-accent/20 font-semibold cursor-pointer py-1.5",
                      methodSelectColors[m] || "text-foreground"
                    )}
                  >
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0 h-full relative">
            <Input
              placeholder="Enter request URL"
              value={draftUrl}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              onBlur={flushUrl}
              onKeyDown={(e) => {
                // Prevent any special handling of question mark
                if (e.key === '?') {
                  e.stopPropagation()
                } else if (e.key === 'Enter') {
                  handleSend()
                }
              }}
              className={cn(
                "w-full h-full font-mono text-[13px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 rounded-r-lg shadow-none",
                templateVariables.length > 0 ? "pr-24" : "pr-4"
              )}
            />
            {templateVariables.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-default",
                    unresolvedCount > 0
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary/30 bg-primary/10 text-primary"
                  )}>
                    <span>
                      {templateVariables.length === 1
                        ? templateVariables[0]
                        : `${templateVariables.length} vars`}
                    </span>
                    {unresolvedCount > 0 && <span className="ml-1">⚠</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border/50 text-foreground shadow-xl rounded-lg max-w-[360px]">
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">URL Variables</div>
                    {resolvedVariables.map(({ token, name, value }) => (
                      <div key={token} className="font-mono text-[11px] bg-secondary/50 px-1.5 py-0.5 rounded flex items-center gap-2">
                        <span className="text-primary">{name}</span>
                        <span className="text-muted-foreground/60">=</span>
                        {value !== undefined ? (
                          <span className="truncate max-w-[220px]">{value}</span>
                        ) : (
                          <span className="text-destructive/90">unresolved</span>
                        )}
                      </div>
                    ))}
                    {unresolvedCount > 0 && (
                      <div className="text-[10px] text-muted-foreground/70 pt-0.5">
                        {hasActiveEnvironment ? "Add missing variables in the active environment" : "No active environment selected"}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleSave}
                data-testid="save-button"
                className="border-border/40 bg-secondary/10 hover:bg-secondary/40 h-10 px-4 rounded-lg text-[13px] font-medium flex items-center shadow-sm transition-all"
              >
                <Save className="h-[15px] w-[15px] sm:mr-1.5 opacity-80" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save to collection</p>
            </TooltipContent>
          </Tooltip>

          {/* Cancel Stream button — shown only when streaming */}
          {isStreaming ? (
            <Button
              variant="destructive"
              className="min-w-[120px] font-semibold h-10 rounded-lg text-[13px] shadow-sm hover:shadow-md transition-all"
              onClick={handleStreamSSE}
              title="Cancel streaming request"
            >
              <XCircle className="h-[15px] w-[15px] mr-1.5 opacity-90" />
              Cancel Stream
            </Button>
          ) : (
            /* Split Send button */
            <div className="flex items-center h-10 rounded-lg group transition-all duration-300">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={loading}
                    onClick={handleSend}
                    className={cn(
                      "min-w-[90px] font-semibold text-[13px] tracking-wide h-10 shadow-sm",
                      "bg-primary text-primary-foreground",
                      "hover:bg-primary/95 hover:brightness-110 transition-all",
                      onStreamSSE ? "rounded-r-none border-r border-primary-foreground/10" : "rounded-lg"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send className="h-[15px] w-[15px] mr-1.5" />
                        Send
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send request <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/40">Enter</kbd></p>
                </TooltipContent>
              </Tooltip>
              {onStreamSSE && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={loading}
                      className={cn(
                        "px-2 rounded-l-none h-10 shadow-sm",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/95 hover:brightness-110 transition-all rounded-r-lg"
                      )}
                    >
                      <ChevronDown className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={`${themeClass} bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl rounded-xl`}
                  >
                    <DropdownMenuItem
                      onClick={handleStreamSSE}
                      className="gap-2 focus:bg-primary/20 focus:text-primary rounded-lg cursor-pointer my-1 mx-1"
                    >
                      <Wifi className="h-4 w-4" />
                      <div>
                        <div className="font-semibold text-[13px]">Stream SSE</div>
                        <div className="text-[11px] opacity-70">Send as streaming event connection</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
})
