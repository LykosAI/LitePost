interface TimingViewProps {
  timing: {
    total: number
    dns?: number
    first_byte?: number
    download?: number
  }
}

export function TimingView({ timing }: TimingViewProps) {
  return (
    <div className="relative bg-muted rounded-md p-4 mb-2 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Total Time</span>
        <span className="text-sm">{Math.round(timing.total)}ms</span>
      </div>
      {timing.dns !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-sm flex items-center gap-1">
            DNS Lookup
            <span className="text-xs text-muted-foreground cursor-help relative group">
              (?)
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-[1000]">
                DNS lookup time is approximated and may include other connection overhead.
              </div>
            </span>
          </span>
          <span className="text-sm">{Math.round(timing.dns)}ms</span>
        </div>
      )}
      {timing.first_byte !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-sm">Time to First Byte</span>
          <span className="text-sm">{Math.round(timing.first_byte)}ms</span>
        </div>
      )}
      {timing.download !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-sm">Download</span>
          <span className="text-sm">{Math.round(timing.download)}ms</span>
        </div>
      )}
    </div>
  )
} 