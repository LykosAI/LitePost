import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Wifi, Loader2, XCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useThemeClass } from "@/hooks/useThemeClass"

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

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
        <SelectTrigger className="w-[120px] bg-background border-input focus:ring-0 focus-visible:ring-1">
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent className={`${themeClass} bg-background border-border`}>
          {HTTP_METHODS.map((m) => (
            <SelectItem 
              key={m} 
              value={m}
              className="hover:bg-accent focus:bg-accent text-foreground"
            >
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        className="flex-1"
      />
      <Button 
        variant="outline" 
        onClick={onSave}
        data-testid="save-button"
      >
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
      <Button 
        variant="secondary" 
        disabled={loading || isStreaming} 
        onClick={onSend}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {loading ? "Sending..." : "Send"}
      </Button>
      {onStreamSSE && (
        <Button
          variant={isStreaming ? "destructive" : "outline"}
          className="w-[140px]"
          disabled={loading}
          onClick={onStreamSSE}
          title={isStreaming ? "Cancel streaming request" : "Send as streaming request (SSE)"}
        >
          {isStreaming ? (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Stream
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Stream SSE
            </>
          )}
        </Button>
      )}
    </div>
  )
} 