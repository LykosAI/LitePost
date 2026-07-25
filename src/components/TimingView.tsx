import { cn } from "@/lib/utils"

interface TimingViewProps {
  timing: {
    dns?: number
    tcp?: number
    tls?: number
    request?: number
    total: number
    first_byte?: number
    download?: number
  }
}

interface TimingRow {
  label: string
  value: number
  color: string
  description: string
}

export function TimingView({ timing }: TimingViewProps) {
  const total = timing.total || 1 // avoid division by zero

  const rows: TimingRow[] = []

  if (timing.dns !== undefined && timing.dns !== null) {
    rows.push({
      label: 'DNS Lookup',
      value: timing.dns,
      color: 'bg-sky-500',
      description: 'Time spent resolving DNS before opening a connection.',
    })
  }
  if (timing.tcp !== undefined && timing.tcp !== null) {
    rows.push({
      label: 'TCP Connect',
      value: timing.tcp,
      color: 'bg-blue-500',
      description: 'Time to establish the TCP connection.',
    })
  }
  if (timing.tls !== undefined && timing.tls !== null) {
    rows.push({
      label: 'TLS Handshake',
      value: timing.tls,
      color: 'bg-violet-500',
      description: 'TLS negotiation time for HTTPS requests.',
    })
  }
  if (timing.request !== undefined && timing.request !== null) {
    rows.push({
      label: 'Request Processing',
      value: timing.request,
      color: 'bg-fuchsia-500',
      description: 'Time between request handoff and first response byte.',
    })
  }
  if (timing.first_byte !== undefined && timing.first_byte !== null) {
    rows.push({
      label: 'Time to First Byte',
      value: timing.first_byte,
      color: 'bg-emerald-500',
      description: 'Time from sending the request to receiving the first response headers.',
    })
  }
  if (timing.download !== undefined && timing.download !== null) {
    rows.push({
      label: 'Download',
      value: timing.download,
      color: 'bg-amber-500',
      description: 'Time to download the full response body.',
    })
  }

  // Total is always shown
  rows.push({
    label: 'Total',
    value: timing.total,
    color: 'bg-primary',
    description: 'Total end-to-end request time.',
  })

  return (
    <div className="relative bg-muted/40 rounded-lg p-4 mb-2 border border-border/20 space-y-3">
      {rows.map((row) => {
        const isTotal = row.label === 'Total'
        const percentage = Math.max(2, (row.value / total) * 100) // min 2% for visibility
        const ms = Math.round(row.value * 10) / 10 // one decimal for sub-ms precision

        return (
          <div key={row.label}>
            {isTotal && rows.length > 1 && (
              <div className="border-t border-border/20 mb-3" />
            )}
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-sm",
                isTotal ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {row.label}
              </span>
              <span className={cn(
                "text-sm font-mono tabular-nums",
                isTotal ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`}
              </span>
            </div>
            {/* Waterfall bar */}
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  row.color,
                  isTotal ? "opacity-80" : "opacity-60"
                )}
                style={{ width: `${isTotal ? 100 : percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
