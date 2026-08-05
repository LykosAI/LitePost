import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DEFAULT_BASE_URL_VARIABLE } from "./openapiImportShared"

interface BaseUrlVariableToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** The concrete base URL, shown so the trade-off is visible before importing. */
  baseUrl: string
}

/**
 * Offers to write request URLs against a `{{baseUrl}}` variable rather than the
 * absolute host.
 *
 * Defaulted on, because the alternative welds the collection to whichever
 * environment happened to serve the spec — and the environments where that
 * hurts most are the ones that do not expose a spec to import from at all.
 */
export function BaseUrlVariableToggle({
  checked,
  onCheckedChange,
  baseUrl,
}: BaseUrlVariableToggleProps) {
  const example = checked
    ? `{{${DEFAULT_BASE_URL_VARIABLE}}}/pet/findByStatus`
    : `${(baseUrl || "https://api.example.com").replace(/\/+$/, "")}/pet/findByStatus`

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm text-foreground cursor-pointer">
          Use a {`{{${DEFAULT_BASE_URL_VARIABLE}}}`} variable
        </Label>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          data-testid="base-url-variable-toggle"
        />
      </div>
      <p className="text-[11px] text-muted-foreground/60 leading-snug">
        {checked
          ? "Requests point at the variable, so one collection can be aimed at dev, test, stage or prod by switching environments."
          : "Requests hard-code this host. The collection will only work against the environment you imported from."}
      </p>
      <code className="block text-[11px] font-mono text-muted-foreground/80 truncate">
        {example}
      </code>
    </div>
  )
}
