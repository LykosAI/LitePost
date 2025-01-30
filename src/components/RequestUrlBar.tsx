import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"
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
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onSend: () => void
  onSave: () => void
}

export function RequestUrlBar({
  method,
  url,
  loading,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
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
      <Button variant="secondary" disabled={loading} onClick={onSend}>
        {loading ? "Sending..." : "Send"}
      </Button>
    </div>
  )
} 