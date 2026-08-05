import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useEnvironmentStore } from "@/store/environments"
import { AuthConfigurator } from "@/components/AuthConfigurator"
import { Collection } from "@/types"
import { ChevronDown, ChevronRight, Globe, ShieldCheck } from "lucide-react"

const NO_ENVIRONMENT = "__none__"

interface CollectionSettingsProps {
  collection: Collection
  onUpdateCollection: (collectionId: string, updates: Partial<Collection>) => void
}

/**
 * Collection-wide auth and the environment this collection belongs to.
 *
 * Auth lives here because a spec import produces one request per operation, all
 * behind the same API and the same OAuth app — configuring each one separately
 * is busywork that scales with the size of the spec. Requests fall back to this
 * unless they set their own; see resolveRequestAuth.
 */
export function CollectionSettings({ collection, onUpdateCollection }: CollectionSettingsProps) {
  const themeClass = useThemeClass()
  const { environments } = useEnvironmentStore()
  const [showAuth, setShowAuth] = useState(false)

  const authSummary = collection.auth && collection.auth.type !== "none"
    ? collection.auth.type === "oauth2"
      ? collection.auth.oauth2?.accessToken
        ? "OAuth 2.0 · token held"
        : "OAuth 2.0 · no token yet"
      : collection.auth.type
    : "None"

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/30 bg-muted/10 p-3">
      <div className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-primary/50 shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">Environment</span>
        <Select
          value={collection.environmentId ?? NO_ENVIRONMENT}
          onValueChange={(value) =>
            onUpdateCollection(collection.id, {
              environmentId: value === NO_ENVIRONMENT ? undefined : value,
            })
          }
        >
          <SelectTrigger
            className="h-7 flex-1 bg-background/50 border-border/40 text-xs"
            aria-label={`Environment for ${collection.name}`}
          >
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40`}>
            <SelectItem value={NO_ENVIRONMENT} className="text-xs">None</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env.id} value={env.id} className="text-xs">
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {collection.environmentId && (
        <p className="text-[11px] text-muted-foreground/50 leading-snug pl-5">
          Activated automatically when you open a request from this collection.
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAuth((shown) => !shown)}
        className="h-7 w-full justify-start px-0 hover:bg-transparent"
        aria-label={`${showAuth ? "Hide" : "Show"} auth for ${collection.name}`}
      >
        {showAuth ? (
          <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-primary/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-primary/50" />
        )}
        <ShieldCheck className="h-3.5 w-3.5 mr-2 text-primary/50" />
        <span className="text-xs text-muted-foreground">Collection auth</span>
        <span className="ml-auto text-[11px] text-muted-foreground/60 font-mono">
          {authSummary}
        </span>
      </Button>

      {showAuth && (
        <div className="pt-1">
          <AuthConfigurator
            auth={collection.auth ?? { type: "none" }}
            onAuthChange={(auth) => onUpdateCollection(collection.id, { auth })}
            flowKey={`collection:${collection.id}`}
          />
          <p className="text-[11px] text-muted-foreground/50 leading-snug pt-2">
            Requests in this collection use this unless they set their own.
          </p>
        </div>
      )}
    </div>
  )
}
