import { useState, useEffect, useCallback } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { parseCurlCommand, isCurlCommand } from "@/utils/curlParser"
import { toast } from "sonner"
import { Terminal, ArrowRight, AlertCircle } from "lucide-react"
import { useThemeClass } from "@/hooks/useThemeClass"

interface CurlImportModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (request: ReturnType<typeof parseCurlCommand>) => void
}

export function CurlImportModal({ open, onOpenChange, onImport }: CurlImportModalProps) {
    const [curlText, setCurlText] = useState("")
    const [preview, setPreview] = useState<ReturnType<typeof parseCurlCommand> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const themeClass = useThemeClass()

    // Live preview as user types
    useEffect(() => {
        if (!curlText.trim()) {
            setPreview(null)
            setError(null)
            return
        }

        if (!isCurlCommand(curlText)) {
            setPreview(null)
            setError("Command should start with 'curl'")
            return
        }

        try {
            const parsed = parseCurlCommand(curlText)
            if (!parsed.url) {
                setError("No URL found in the curl command")
                setPreview(null)
                return
            }
            setPreview(parsed)
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to parse curl command")
            setPreview(null)
        }
    }, [curlText])

    const handleImport = useCallback(() => {
        if (!preview) return

        try {
            onImport(preview)
            toast.success("cURL command imported successfully")
            setCurlText("")
            setPreview(null)
            onOpenChange(false)
        } catch (e) {
            toast.error("Failed to import curl command")
        }
    }, [preview, onImport, onOpenChange])

    // Method color mapping (matching RequestUrlBar)
    const methodColors: Record<string, string> = {
        GET: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        DELETE: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        HEAD: "bg-violet-500/15 text-violet-400 border-violet-500/30",
        OPTIONS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${themeClass} sm:max-w-[680px] bg-background border-border/40 backdrop-blur-xl`}>
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-primary/70" />
                        Import from cURL
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Paste a cURL command to create a new request. Supports headers, body, auth, and cookies.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-2">
                    <Textarea
                        placeholder={`curl -X POST https://api.example.com/data \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-token" \\
  -d '{"key": "value"}'`}
                        value={curlText}
                        onChange={(e) => setCurlText(e.target.value)}
                        className="h-44 font-mono text-[13px] bg-muted/30 border-border/40 text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                        autoFocus
                    />

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Live Preview */}
                    {preview && (
                        <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-3">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={methodColors[preview.method] || "text-foreground"}>
                                    {preview.method}
                                </Badge>
                                <code className="text-sm text-foreground truncate font-mono flex-1">{preview.url}</code>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                                {preview.headers.length > 0 && (
                                    <div>
                                        <span className="text-foreground/60">Headers:</span>{" "}
                                        <span className="text-foreground">{preview.headers.length}</span>
                                    </div>
                                )}
                                {preview.params.length > 0 && (
                                    <div>
                                        <span className="text-foreground/60">Params:</span>{" "}
                                        <span className="text-foreground">{preview.params.length}</span>
                                    </div>
                                )}
                                {preview.auth.type !== "none" && (
                                    <div>
                                        <span className="text-foreground/60">Auth:</span>{" "}
                                        <span className="text-foreground capitalize">{preview.auth.type}</span>
                                    </div>
                                )}
                                {preview.body && (
                                    <div>
                                        <span className="text-foreground/60">Body:</span>{" "}
                                        <span className="text-foreground">{preview.contentType || "text"}</span>
                                    </div>
                                )}
                                {preview.cookies.length > 0 && (
                                    <div>
                                        <span className="text-foreground/60">Cookies:</span>{" "}
                                        <span className="text-foreground">{preview.cookies.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-2 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="text-foreground hover:text-foreground border-border/40"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!preview}
                        className="gap-1.5"
                    >
                        <ArrowRight className="h-4 w-4" />
                        Import Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
