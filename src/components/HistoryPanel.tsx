import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, RotateCcw } from "lucide-react"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-500",
  PUT: "bg-yellow-500/10 text-yellow-500",
  PATCH: "bg-orange-500/10 text-orange-500",
  DELETE: "bg-red-500/10 text-red-500",
  HEAD: "bg-purple-500/10 text-purple-500",
  OPTIONS: "bg-cyan-500/10 text-cyan-500"
}

interface HistoryPanelProps {
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onRemove: (timestamp: Date) => void
  onClear: () => void
}

export function HistoryPanel({ history, onSelect, onRemove, onClear }: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history

    const query = searchQuery.toLowerCase()
    return history.filter((item) => {
      return (
        item.url.toLowerCase().includes(query) ||
        item.method.toLowerCase().includes(query) ||
        (item.body && typeof item.body === 'string' && item.body.toLowerCase().includes(query))
      )
    })
  }, [history, searchQuery])

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <div className="flex flex-col gap-2 p-4 pb-2">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">History</h2>
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 px-2 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="dark bg-background border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Clear History</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This action cannot be undone. This will permanently delete all your request history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onClear}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 pt-2 space-y-2">
            {filteredHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {history.length === 0 ? "No requests yet" : "No matching requests found"}
              </p>
            ) : (
              filteredHistory.map((item, index) => (
                <ContextMenu key={index}>
                  <ContextMenuTrigger>
                    <div
                      className="group p-2 rounded-md hover:bg-muted cursor-pointer transition-colors relative flex items-center justify-between gap-2"
                      onClick={() => onSelect(item)}
                      title="Click to open in new tab"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded shrink-0",
                            methodColors[item.method] || "bg-muted-foreground/10"
                          )}>
                            {item.method}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.url}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="dark bg-background border-border">
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item)
                      }}
                      className="gap-2 focus:bg-muted focus:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(item.timestamp)
                      }}
                      className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-600/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </TooltipProvider>
  )
} 