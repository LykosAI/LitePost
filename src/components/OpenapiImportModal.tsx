import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { BaseUrlVariableToggle } from "./BaseUrlVariableToggle"
import { DEFAULT_BASE_URL_VARIABLE } from "./openapiImportShared"
import { useThemeClass } from "@/hooks/useThemeClass"

interface OpenapiImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (openapiDoc: unknown, baseUrl: string, baseUrlVariable?: string) => void
}

export function OpenapiImportModal({ open, onOpenChange, onImport }: OpenapiImportModalProps) {
  const [rawJSON, setRawJSON] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [useVariable, setUseVariable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const themeClass = useThemeClass()

  const reset = () => {
    setRawJSON("")
    setBaseUrl("")
    setUseVariable(true)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Reset on close so a stale paste doesn't greet the next import.
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleImport = () => {
    if (!rawJSON.trim()) {
      setError("Please paste the OpenAPI JSON content.")
      return
    }

    let apiDoc
    try {
      apiDoc = JSON.parse(rawJSON)
    } catch {
      setError("Invalid JSON. Please check the pasted content.")
      return
    }

    if (!baseUrl.trim()) {
      setError("Please enter a valid base URL.")
      return
    }

    try {
      // The parent owns the success toast (it knows the request count).
      onImport(apiDoc, baseUrl, useVariable ? DEFAULT_BASE_URL_VARIABLE : undefined)
      reset()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to import OpenAPI specification")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`${themeClass} sm:max-w-[600px] bg-background border-border`}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleImport()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Import OpenAPI JSON (Raw)</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste your OpenAPI JSON below and provide the base URL for your API.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="Paste the OpenAPI JSON here..."
            value={rawJSON}
            onChange={(e) => {
              setRawJSON(e.target.value)
              setError(null)
            }}
            autoFocus
            className="h-48 font-mono text-sm bg-background text-foreground border-border placeholder:text-muted-foreground"
          />
          <Input
            placeholder="Enter the base URL (e.g., https://api.example.com)"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value)
              setError(null)
            }}
            className="bg-background text-foreground border-border placeholder:text-muted-foreground"
          />
          <BaseUrlVariableToggle
            checked={useVariable}
            onCheckedChange={setUseVariable}
            baseUrl={baseUrl}
          />
          {error && (
            <div className="px-3 py-2 text-sm bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="text-foreground hover:text-foreground border-border"
          >
            Cancel
          </Button>
          <Button onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
