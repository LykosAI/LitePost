import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Wifi, Loader2, XCircle, Send } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useThemeClass } from "@/hooks/useThemeClass"
import { cn } from "@/lib/utils"

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

// Method-specific colors for the select trigger
const methodSelectColors: Record<string, string> = {
  GET: "text-sky-400",
  POST: "text-emerald-400",
  PUT: "text-amber-400",
  DELETE: "text-rose-400",
  PATCH: "text-orange-400",
  HEAD: "text-violet-400",
  OPTIONS: "text-cyan-400",
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

export function RequestUrlBar({
  method,
  url,
  loading,
  isStreaming = false,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  onStreamSSE,
}: RequestUrlBarProps) {
  const themeClass = useThemeClass()

  return (
    <div className="flex gap-2 p-4 pb-2">
      <Select value={method} onValueChange={onMethodChange}>
        <SelectTrigger className={cn(
          "w-[110px] bg-secondary/40 border-border/40 focus:ring-0 focus-visible:ring-1 font-semibold text-[13px] tracking-wide",
          methodSelectColors[method] || "text-foreground"
        )}>
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
          {HTTP_METHODS.map((m) => (
            <SelectItem
              key={m}
              value={m}
              className={cn(
                "hover:bg-accent/10 focus:bg-accent/10 font-medium",
                methodSelectColors[m] || "text-foreground"
              )}
            >
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 relative">
        <Input
          placeholder="Enter request URL"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            // Prevent any special handling of question mark
            if (e.key === '?') {
              e.stopPropagation()
            }
          }}
          className="w-full font-mono text-[13px] pr-2"
        />
      </div>
      <Button
        variant="outline"
        onClick={onSave}
        data-testid="save-button"
        className="border-border/40"
      >
        <Save className="h-4 w-4 mr-1.5" />
        Save
      </Button>
      <Button
        disabled={loading || isStreaming}
        onClick={onSend}
        className={cn(
          "min-w-[90px] font-semibold",
          "bg-primary text-primary-foreground",
          "shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35",
          "hover:bg-primary/90"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send
          </>
        )}
      </Button>
      {onStreamSSE && (
        <Button
          variant={isStreaming ? "destructive" : "outline"}
          className={cn(
            "w-[140px] border-border/40",
            !isStreaming && "hover:border-primary/40 hover:text-primary"
          )}
          disabled={loading}
          onClick={onStreamSSE}
          title={isStreaming ? "Cancel streaming request" : "Send as streaming request (SSE)"}
        >
          {isStreaming ? (
            <>
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel Stream
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-1.5" />
              Stream SSE
            </>
          )}
        </Button>
      )}
    </div>
  )
}