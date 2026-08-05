import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { toast } from "sonner"
import { BaseUrlVariableToggle } from "./BaseUrlVariableToggle"
import { DEFAULT_BASE_URL_VARIABLE } from "./openapiImportShared"

interface OpenapiImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (openapiDoc: unknown, baseUrl: string, baseUrlVariable?: string) => void
}

export function OpenapiImportModal({ open, onOpenChange, onImport }: OpenapiImportModalProps) {
  const [rawJSON, setRawJSON] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [useVariable, setUseVariable] = useState(true)

  const handleImport = () => {
    if (!rawJSON.trim()) {
      toast.error("Please paste the OpenAPI JSON content.")
      return
    }

    let apiDoc
    try {
      apiDoc = JSON.parse(rawJSON)
    } catch (err) {
      toast.error("Invalid JSON. Please check the pasted content.")
      return
    }

    if (!baseUrl.trim()) {
      toast.error("Please enter a valid base URL.")
      return
    }

    try {
      onImport(apiDoc, baseUrl, useVariable ? DEFAULT_BASE_URL_VARIABLE : undefined)
      setRawJSON("")
      setBaseUrl("")
      setUseVariable(true)
    } catch (error) {
      console.error("Error importing OpenAPI:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import OpenAPI specification")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
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
            onChange={(e) => setRawJSON(e.target.value)}
            className="h-48 font-mono text-sm bg-background text-foreground border-border placeholder:text-muted-foreground"
          />
          <Input
            placeholder="Enter the base URL (e.g., https://api.example.com)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="bg-background text-foreground border-border placeholder:text-muted-foreground"
          />
          <BaseUrlVariableToggle
            checked={useVariable}
            onCheckedChange={setUseVariable}
            baseUrl={baseUrl}
          />
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
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