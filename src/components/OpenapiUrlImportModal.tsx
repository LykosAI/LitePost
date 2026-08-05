import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { fetchJsonViaBackend } from "@/utils/backendFetch"
import { BaseUrlVariableToggle } from "./BaseUrlVariableToggle"
import { DEFAULT_BASE_URL_VARIABLE } from "./openapiImportShared"

interface OpenapiDoc {
  servers?: { url?: string }[]
  [key: string]: unknown
}

interface OpenapiUrlImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (openapiDoc: unknown, baseUrl: string, baseUrlVariable?: string) => void
}

export function OpenapiUrlImportModal({ open, onOpenChange, onImport }: OpenapiUrlImportModalProps) {
  const [openapiUrl, setOpenapiUrl] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedServers, setDetectedServers] = useState<string[]>([])
  const [loadedDoc, setLoadedDoc] = useState<OpenapiDoc | null>(null)
  const [useVariable, setUseVariable] = useState(true)

  const reset = () => {
    setOpenapiUrl("")
    setBaseUrl("")
    setDetectedServers([])
    setLoadedDoc(null)
    setError(null)
    setUseVariable(true)
  }

  /**
   * Fetch the spec and pull the server list out of it. Explicitly triggered
   * rather than fired from onChange — the previous version fetched on every
   * keystroke, which meant one HTTP request per character typed.
   */
  const loadSpec = async (): Promise<OpenapiDoc | null> => {
    const url = openapiUrl.trim()
    if (!url) {
      setError("Enter the URL of your OpenAPI JSON document.")
      return null
    }

    setIsLoading(true)
    setError(null)
    try {
      const apiDoc = await fetchJsonViaBackend<OpenapiDoc>(url)
      setLoadedDoc(apiDoc)

      const servers = (apiDoc.servers ?? [])
        .map((server) => server?.url)
        .filter((serverUrl): serverUrl is string => typeof serverUrl === "string" && serverUrl.length > 0)

      setDetectedServers(servers)
      // A relative server URL ("/" or "/api") is meaningless on its own — it is
      // relative to where the spec was served from, so resolve it against that.
      if (servers.length > 0 && !baseUrl) {
        try {
          setBaseUrl(new URL(servers[0], url).toString())
        } catch {
          setBaseUrl(servers[0])
        }
      }
      return apiDoc
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    const apiDoc = loadedDoc ?? (await loadSpec())
    if (!apiDoc) return

    if (!baseUrl.trim()) {
      setError("Enter a base URL — the spec did not declare one.")
      return
    }

    try {
      onImport(apiDoc, baseUrl.trim(), useVariable ? DEFAULT_BASE_URL_VARIABLE : undefined)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import OpenAPI specification")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import OpenAPI from URL</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the URL of your OpenAPI JSON document. The base URL is detected from the spec where possible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://api.example.com/swagger/v1/swagger.json"
              value={openapiUrl}
              onChange={(e) => {
                setOpenapiUrl(e.target.value)
                setLoadedDoc(null)
                setDetectedServers([])
                setError(null)
              }}
              onKeyDown={(e) => { if (e.key === "Enter") loadSpec() }}
              className="font-mono text-[13px] bg-background text-foreground border-border placeholder:text-muted-foreground"
            />
            <Button
              variant="outline"
              onClick={loadSpec}
              disabled={isLoading || !openapiUrl.trim()}
              className="shrink-0 border-border"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Base URL (detected from the spec where available)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-[13px] bg-background text-foreground border-border placeholder:text-muted-foreground"
            />
            {detectedServers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {detectedServers.length === 1 ? (
                  <p>Found server URL in spec: {detectedServers[0]}</p>
                ) : (
                  <div className="space-y-1">
                    <p>Found multiple server URLs in spec — click to use:</p>
                    <ul className="space-y-0.5">
                      {detectedServers.map((server, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                setBaseUrl(new URL(server, openapiUrl).toString())
                              } catch {
                                setBaseUrl(server)
                              }
                            }}
                            className="text-left font-mono text-xs text-primary hover:underline"
                          >
                            {server}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <BaseUrlVariableToggle
            checked={useVariable}
            onCheckedChange={setUseVariable}
            baseUrl={baseUrl}
          />

          {error && (
            <p className="text-[12px] text-destructive bg-destructive/10 rounded px-2 py-1.5 break-all leading-snug">
              ⚠ {error}
            </p>
          )}
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-foreground hover:text-foreground border-border"
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isLoading}>
            {isLoading ? "Loading…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
