import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useVariablePeek } from "@/hooks/useVariablePeek"
import { cn } from "@/lib/utils"

interface VariablePeekProps {
  /** Text to scan for {{var}} tokens (concatenate multiple fields if needed) */
  text: string
  className?: string
  /** Compact renders a smaller badge for tight rows (key-value lists) */
  compact?: boolean
}

/**
 * Badge + tooltip showing every {{var}} in `text` resolved against the active
 * environment. Renders nothing when the text contains no template variables.
 */
export function VariablePeek({ text, className, compact = false }: VariablePeekProps) {
  const { resolved, unresolvedCount, hasActiveEnvironment } = useVariablePeek(text)

  if (resolved.length === 0) return null

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-testid="variable-peek"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border font-mono font-medium cursor-default select-none",
              compact ? "px-1.5 py-px text-[9px] backdrop-blur-sm" : "px-2 py-0.5 text-[10px]",
              unresolvedCount > 0
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/10 text-primary",
              className
            )}
          >
            <span>{resolved.length === 1 ? resolved[0].token : `${resolved.length} vars`}</span>
            {unresolvedCount > 0 && <span>⚠</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border-border/50 text-foreground shadow-xl rounded-lg max-w-[360px]">
          <div className="text-xs space-y-1">
            <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Variables</div>
            {resolved.map(({ token, name, value }) => (
              <div key={token} className="font-mono text-[11px] bg-secondary/50 px-1.5 py-0.5 rounded flex items-center gap-2">
                <span className="text-primary">{name}</span>
                <span className="text-muted-foreground/60">=</span>
                {value !== undefined ? (
                  <span className="truncate max-w-[220px]">{value}</span>
                ) : (
                  <span className="text-destructive/90">unresolved</span>
                )}
              </div>
            ))}
            {unresolvedCount > 0 && (
              <div className="text-[10px] text-muted-foreground/70 pt-0.5">
                {hasActiveEnvironment ? "Add missing variables in the active environment" : "No active environment selected"}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
