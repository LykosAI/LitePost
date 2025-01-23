import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"

interface HistoryPanelProps {
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onRemove: (timestamp: Date) => void
  onClear: () => void
}

export function HistoryPanel({ history, onSelect, onRemove, onClear }: HistoryPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 pb-2">
        <h2 className="font-semibold">History</h2>
        {history.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClear}
            className="h-8 px-2 hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 pt-2 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet</p>
          ) : (
            history.map((item, index) => (
              <div
                key={index}
                className="group p-2 rounded-md hover:bg-muted cursor-pointer transition-colors relative flex items-start gap-2"
                onClick={() => onSelect(item)}
                title="Click to open in new tab"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted-foreground/10 shrink-0">{item.method}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.url}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.timestamp)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
} 