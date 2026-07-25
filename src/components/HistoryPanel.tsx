import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, RotateCcw, Clock, PanelLeftClose } from "lucide-react"
import { memo, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useThemeClass } from "@/hooks/useThemeClass"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** Formats a Date into a human-friendly relative time string */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Bucket label for grouping: Today, Yesterday, then month (+ year when older) */
function groupLabel(date: Date): string {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayDiff = Math.floor((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (dayDiff <= 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'long' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

/** Split a URL into a dimmed host part and a bright path part for display */
function splitUrl(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}` || '/'
    return { host: parsed.host, path }
  } catch {
    return { host: '', path: url }
  }
}

interface HistoryRow {
  item: HistoryItem
  /** Number of merged consecutive duplicates (same method + url) */
  count: number
  /** Timestamps of every merged occurrence, for deletion */
  timestamps: Date[]
}

interface HistoryGroup {
  label: string
  rows: HistoryRow[]
}

/** Group newest-first history by date bucket, merging consecutive duplicates */
function buildGroups(items: HistoryItem[]): HistoryGroup[] {
  const groups: HistoryGroup[] = []

  for (const item of items) {
    const label = groupLabel(item.timestamp)
    let group = groups[groups.length - 1]
    if (!group || group.label !== label) {
      group = { label, rows: [] }
      groups.push(group)
    }

    const prev = group.rows[group.rows.length - 1]
    const key = `${item.method} ${item.rawUrl || item.url}`
    const prevKey = prev ? `${prev.item.method} ${prev.item.rawUrl || prev.item.url}` : null
    if (prev && key === prevKey) {
      prev.count++
      prev.timestamps.push(item.timestamp)
    } else {
      group.rows.push({ item, count: 1, timestamps: [item.timestamp] })
    }
  }

  return groups
}
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
  onCollapse?: () => void
}

// Memoized: the list is expensive (a Radix ContextMenu + Tooltip per row) and
// must not re-render on every keystroke elsewhere in the app.
export const HistoryPanel = memo(function HistoryPanel({ history, onSelect, onRemove, onClear, onCollapse }: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const themeClass = useThemeClass()

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

  const groups = useMemo(() => buildGroups(filteredHistory), [filteredHistory])

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col bg-card/40 backdrop-blur-xl border-border/20 shadow-none overflow-hidden rounded-none sm:rounded-xl">
        <div className="flex flex-col gap-3 p-4 pb-3 border-b border-border/30 bg-background/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              <h2 className="font-semibold text-sm tracking-tight">History</h2>
            </div>
            {onCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                title="Hide history"
                aria-label="Hide history"
                className="h-7 w-7 p-0 rounded-lg text-muted-foreground/60 hover:text-foreground transition-colors ml-auto"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            )}
            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={`${themeClass} bg-background border-border/40 shadow-2xl rounded-2xl`}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground font-bold">Clear History</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This action cannot be undone. This will permanently delete all your request history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-secondary/50 text-foreground hover:bg-secondary border-none rounded-xl transition-colors">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onClear}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-all shadow-lg shadow-destructive/20"
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
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 ring-1 ring-border/50">
                  <Clock className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground/70">
                  {history.length === 0 ? "No requests yet" : "No results found"}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  {history.length === 0 ? "Send a request to see it here" : "Try a different search term"}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="px-1 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 first:pt-1">
                    {group.label}
                  </div>
                  {group.rows.map((row) => {
                    const { item, count, timestamps } = row
                    const { host, path } = splitUrl(item.url)
                    return (
                      <ContextMenu key={item.timestamp instanceof Date ? item.timestamp.getTime() : item.url}>
                        <ContextMenuTrigger>
                          <div
                            className={cn(
                              "group p-2.5 mb-1 rounded-xl cursor-pointer transition-all duration-200 border border-transparent",
                              "hover:bg-secondary/30 hover:shadow-sm hover:border-border/30 active:scale-[0.98]",
                              "relative flex flex-col justify-start gap-1",
                              // Skip layout/paint for rows outside the viewport
                              "[content-visibility:auto] [contain-intrinsic-size:auto_56px]"
                            )}
                            onClick={() => onSelect(item)}
                            title="Click to open in new tab"
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center w-full gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ring-1 uppercase tracking-wider",
                                  methodColors[item.method] || "bg-muted-foreground/10 ring-muted-foreground/20 text-muted-foreground"
                                )}>
                                  {item.method}
                                </span>
                                <span className="text-[12.5px] truncate font-mono min-w-0">
                                  {host && <span className="text-muted-foreground/50">{host}</span>}
                                  <span className="text-foreground/90">{path}</span>
                                </span>
                                {count > 1 && (
                                  <span className="text-[9px] font-mono shrink-0 text-primary/90 bg-primary/10 rounded px-1.5 py-0.5">
                                    ×{count}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between w-full mt-1 pl-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-medium cursor-default">
                                      <Clock className="h-3 w-3 opacity-60" />
                                      {formatRelativeTime(item.timestamp)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="text-xs bg-popover/95 backdrop-blur-md border-border/50 text-foreground font-mono">
                                    <p>{item.timestamp.toLocaleString()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-2xl rounded-xl`}>
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(item)
                            }}
                            className="gap-2 focus:bg-primary/20 focus:text-primary rounded-lg my-1 mx-1 font-medium cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              timestamps.forEach((timestamp) => onRemove(timestamp))
                            }}
                            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/20 rounded-lg my-1 mx-1 font-medium cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            {count > 1 ? `Delete ${count} entries` : "Delete"}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </TooltipProvider>
  )
})