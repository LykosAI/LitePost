import { CopyButton } from "./CopyButton"

interface HeadersViewProps {
  headers: Record<string, string>
}

export function HeadersView({ headers }: HeadersViewProps) {
  const entries = Object.entries(headers)
  const formattedHeaders = entries
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  if (entries.length === 0) {
    return (
      <div className="relative bg-muted/40 rounded-lg p-3 mb-2 border border-border/20">
        <pre className="text-sm font-mono text-muted-foreground/50">No headers</pre>
      </div>
    )
  }

  return (
    <div className="relative bg-muted/40 rounded-lg mb-2 border border-border/20 overflow-hidden">
      <CopyButton
        content={formattedHeaders}
        className="absolute right-2 top-2 z-10"
      />
      <div className="divide-y divide-border/10">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex gap-3 px-3 py-2 hover:bg-muted/30 transition-colors text-sm font-mono group"
          >
            <span className="text-primary/70 font-medium shrink-0 min-w-[140px] select-all">
              {key}
            </span>
            <span className="text-muted-foreground break-all select-all">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-border/10 bg-muted/20">
        <span className="text-[11px] text-muted-foreground/50">
          {entries.length} header{entries.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
} 