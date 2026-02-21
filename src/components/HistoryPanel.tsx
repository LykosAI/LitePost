import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, RotateCcw, Clock } from "lucide-react"
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
  GET: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  POST: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  PUT: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  PATCH: "bg-orange-500/12 text-orange-400 ring-orange-500/20",
  DELETE: "bg-rose-500/12 text-rose-400 ring-rose-500/20",
  HEAD: "bg-violet-500/12 text-violet-400 ring-violet-500/20",
  OPTIONS: "bg-cyan-500/12 text-cyan-400 ring-cyan-500/20"
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
        <div className="flex flex-col gap-2.5 p-4 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              <h2 className="font-semibold text-sm tracking-tight">History</h2>
            </div>
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="dark bg-background border-border/40 shadow-2xl">
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
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Search history…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/30"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 pt-1 space-y-1">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground/50">
                  {history.length === 0 ? "No requests yet" : "No matching requests found"}
                </p>
              </div>
            ) : (
              filteredHistory.map((item, index) => (
                <ContextMenu key={index}>
                  <ContextMenuTrigger>
                    <div
                      className={cn(
                        "group p-2.5 rounded-lg cursor-pointer transition-all duration-150",
                        "hover:bg-muted/50 active:scale-[0.99]",
                        "relative flex items-center justify-between gap-2"
                      )}
                      onClick={() => onSelect(item)}
                      title="Click to open in new tab"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ring-1",
                            methodColors[item.method] || "bg-muted-foreground/10 ring-muted-foreground/20"
                          )}>
                            {item.method}
                          </span>
                          <span className="text-xs text-muted-foreground truncate font-mono">
                            {item.url}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 mt-1 pl-0.5">
                          {item.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="dark bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl">
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item)
                      }}
                      className="gap-2 focus:bg-muted/60 focus:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(item.timestamp)
                      }}
                      className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
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