import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryItem {
  method: string
  url: string
  timestamp: Date
}

interface HistoryPanelProps {
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
}

export function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  return (
    <Card className="w-64 p-4">
      <h2 className="font-semibold mb-4">History</h2>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet</p>
          ) : (
            history.map((item, index) => (
              <div
                key={index}
                className="p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                onClick={() => onSelect(item)}
                title="Click to open in new tab"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted-foreground/10">{item.method}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {item.url}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
} 