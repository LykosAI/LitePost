import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { toast } from "sonner"
import { fetch } from '@tauri-apps/plugin-http'

interface OpenapiUrlImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (url: string, baseUrl: string) => void
}

export function OpenapiUrlImportModal({ open, onOpenChange, onImport }: OpenapiUrlImportModalProps) {
  const [openapiUrl, setOpenapiUrl] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [detectedServers, setDetectedServers] = useState<string[]>([])

  const handleUrlChange = async (url: string) => {
    setOpenapiUrl(url)
    setDetectedServers([])

    if (!url.trim()) return

    try {
      setIsLoading(true)
      const response = await fetch(url)
      if (!response.ok) return

      const apiDoc = await response.json()
      if (apiDoc.servers && apiDoc.servers.length > 0) {
        const servers = apiDoc.servers.map((s: { url: string }) => s.url)
        setDetectedServers(servers)
        if (servers.length > 0 && !baseUrl) {
          setBaseUrl(servers[0])
        }
      }
    } catch (error) {
      // Silently fail as this is just for auto-detection
      console.error("Failed to detect servers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = () => {
    if (!openapiUrl.trim()) {
      toast.error("Please enter the OpenAPI JSON URL.")
      return
    }

    try {
      onImport(openapiUrl, baseUrl)
      setOpenapiUrl("")
      setBaseUrl("")
      setDetectedServers([])
    } catch (error) {
      console.error("Error importing OpenAPI:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import OpenAPI specification")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import OpenAPI from URL</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the URL of your OpenAPI JSON file. The base URL will be auto-detected if available in the spec.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Enter the OpenAPI JSON URL (e.g., https://api.example.com/openapi.json)"
            value={openapiUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="bg-background text-foreground border-border placeholder:text-muted-foreground"
          />
          <div className="space-y-2">
            <Input
              placeholder="Base URL (optional - will be detected from spec if available)"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="bg-background text-foreground border-border placeholder:text-muted-foreground"
            />
            {detectedServers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {detectedServers.length === 1 ? (
                  <p>Found server URL in spec: {detectedServers[0]}</p>
                ) : (
                  <div className="space-y-1">
                    <p>Found multiple server URLs in spec:</p>
                    <ul className="list-disc list-inside">
                      {detectedServers.map((server, i) => (
                        <li key={i} className="ml-2">{server}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
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
            {isLoading ? "Loading..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 