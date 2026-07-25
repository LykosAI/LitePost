import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { HistoryItem, SavedRequest } from "@/types"
import { useCollectionStore } from "@/store/collections"
import { useEnvironmentStore } from "@/store/environments"
import { useUiStore } from "@/store/ui"
import { cn } from "@/lib/utils"
import { Beaker, Check, Clock, Folder, History, Plus, Search, Settings, Terminal, Zap } from "lucide-react"

const methodColors: Record<string, string> = {
  GET: "text-sky-400",
  POST: "text-emerald-400",
  PUT: "text-amber-400",
  PATCH: "text-orange-400",
  DELETE: "text-rose-400",
  HEAD: "text-violet-400",
  OPTIONS: "text-cyan-400",
}

interface PaletteResult {
  kind: "history" | "saved" | "environment" | "action"
  key: string
  method?: string
  label: string
  sub?: string
  icon?: ReactNode
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: HistoryItem[]
  onSelectHistory: (item: HistoryItem) => void
  onSelectSaved: (request: SavedRequest) => void
  onNewTab: () => void
  onToggleHistory?: () => void
}

const MAX_GROUP_RESULTS = 8

export function CommandPalette({
  open,
  onOpenChange,
  history,
  onSelectHistory,
  onSelectSaved,
  onNewTab,
  onToggleHistory,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const { collections } = useCollectionStore()
  const { environments, activeEnvironmentId, setActiveEnvironment } = useEnvironmentStore()
  const openPanel = useUiStore((state) => state.openPanel)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(0)
    }
  }, [open])

  const results = useMemo<PaletteResult[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (...fields: (string | undefined)[]) =>
      !q || fields.some((f) => f?.toLowerCase().includes(q))

    const out: PaletteResult[] = []

    // History — newest first, one entry per method+url
    const seen = new Set<string>()
    let historyCount = 0
    for (const item of history) {
      if (historyCount >= MAX_GROUP_RESULTS) break
      const key = `${item.method} ${item.rawUrl || item.url}`
      if (seen.has(key) || !matches(item.url, item.rawUrl, item.method)) continue
      seen.add(key)
      historyCount++
      out.push({
        kind: "history",
        key: `h:${key}:${item.timestamp.getTime()}`,
        method: item.method,
        label: item.url,
        run: () => onSelectHistory(item),
      })
    }

    // Saved requests across all collections
    let savedCount = 0
    for (const collection of collections) {
      for (const request of collection.requests) {
        if (savedCount >= MAX_GROUP_RESULTS) break
        if (!matches(request.name, request.url, request.method, collection.name)) continue
        savedCount++
        out.push({
          kind: "saved",
          key: `s:${collection.id}:${request.id}`,
          method: request.method,
          label: request.name || request.url,
          sub: collection.name,
          run: () => onSelectSaved(request),
        })
      }
    }

    // Environment switching
    for (const env of environments) {
      if (!matches(env.name, "switch environment use")) continue
      const isActive = env.id === activeEnvironmentId
      out.push({
        kind: "environment",
        key: `e:${env.id}`,
        label: env.name,
        icon: isActive
          ? <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          : <Beaker className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />,
        sub: isActive ? "active" : undefined,
        run: () => setActiveEnvironment(env.id),
      })
    }
    if (activeEnvironmentId && matches("no environment none switch clear")) {
      out.push({
        kind: "environment",
        key: "e:none",
        label: "No environment",
        icon: <Beaker className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />,
        run: () => setActiveEnvironment(null),
      })
    }

    // Actions
    const actions: Array<{ key: string; label: string; icon: ReactNode; run: () => void; terms: string }> = [
      { key: "new-tab", label: "New request tab", icon: <Plus className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: onNewTab, terms: "new request tab create" },
      { key: "curl-import", label: "Import cURL…", icon: <Terminal className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: () => openPanel("curl-import"), terms: "import curl paste" },
      { key: "runner", label: "Run collection…", icon: <Zap className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: () => openPanel("runner"), terms: "run collection runner" },
      { key: "collections", label: "Open collections", icon: <Folder className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: () => openPanel("collections"), terms: "open collections saved requests" },
      { key: "environments", label: "Manage environments", icon: <Beaker className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: () => openPanel("environments"), terms: "manage environments variables" },
      { key: "settings", label: "Open settings", icon: <Settings className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />, run: () => openPanel("settings"), terms: "open settings preferences theme" },
    ]
    if (onToggleHistory) {
      actions.push({
        key: "toggle-history",
        label: "Toggle history sidebar",
        icon: <History className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />,
        run: onToggleHistory,
        terms: "toggle history sidebar show hide",
      })
    }
    for (const action of actions) {
      if (!matches(action.label, action.terms)) continue
      out.push({
        kind: "action",
        key: `a:${action.key}`,
        label: action.label,
        icon: action.icon,
        run: action.run,
      })
    }

    return out
  }, [query, history, collections, environments, activeEnvironmentId, setActiveEnvironment, openPanel, onSelectHistory, onSelectSaved, onNewTab, onToggleHistory])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const clampedSelected = Math.min(selected, Math.max(0, results.length - 1))

  const runResult = (result: PaletteResult | undefined) => {
    if (!result) return
    onOpenChange(false)
    result.run()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelected((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelected((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      runResult(results[clampedSelected])
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: "nearest" })
  }, [clampedSelected, results])

  let lastKind: PaletteResult["kind"] | null = null
  const groupLabels: Record<PaletteResult["kind"], string> = {
    history: "History",
    saved: "Collections",
    environment: "Switch environment",
    action: "Actions",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] translate-y-0 max-w-[560px] p-0 gap-0 overflow-hidden rounded-2xl border-border/50 bg-popover/95 backdrop-blur-xl shadow-2xl [&>button]:hidden"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
          <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history, collections, actions…"
            data-testid="palette-input"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground/50 bg-secondary/50 border border-border/40 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-1.5" data-testid="palette-results">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">
              No matches — keep typing or press Esc
            </div>
          )}
          {results.map((result, index) => {
            const showGroup = result.kind !== lastKind
            lastKind = result.kind
            const isSelected = index === clampedSelected
            return (
              <div key={result.key}>
                {showGroup && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
                    {groupLabels[result.kind]}
                  </div>
                )}
                <button
                  type="button"
                  data-selected={isSelected}
                  onClick={() => runResult(result)}
                  onMouseMove={() => setSelected(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] transition-colors",
                    isSelected ? "bg-primary/10 shadow-[inset_2px_0_0_hsl(var(--primary))]" : "hover:bg-secondary/40"
                  )}
                >
                  {result.icon ?? (
                    result.kind === "history"
                      ? <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      : result.kind === "saved"
                        ? <Folder className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        : <Plus className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                  {result.method && (
                    <span className={cn("text-[10px] font-bold w-11 shrink-0", methodColors[result.method] || "text-muted-foreground")}>
                      {result.method}
                    </span>
                  )}
                  <span className={cn(
                    "flex-1 min-w-0 truncate text-foreground/90",
                    (result.kind === "history" || result.kind === "saved") && "font-mono"
                  )}>{result.label}</span>
                  {result.sub && <span className="text-[11px] text-muted-foreground/50 shrink-0">{result.sub}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground/50">
          <span><kbd className="font-mono bg-secondary/50 border border-border/40 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-secondary/50 border border-border/40 rounded px-1">⏎</kbd> open</span>
          <span><kbd className="font-mono bg-secondary/50 border border-border/40 rounded px-1">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
