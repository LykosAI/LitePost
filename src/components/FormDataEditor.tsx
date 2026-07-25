import { useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, File, Upload, X } from "lucide-react"
import { useThemeClass } from "@/hooks/useThemeClass"

export interface FormDataEntry {
    id: string
    key: string
    value: string
    type: "text" | "file"
    fileName?: string
    fileSize?: number
    fileData?: string // base64 encoded for file
    filePath?: string
    enabled: boolean
}

interface FormDataEditorProps {
    entries: FormDataEntry[]
    onEntriesChange: (entries: FormDataEntry[]) => void
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FormDataEditor({ entries, onEntriesChange }: FormDataEditorProps) {
    const themeClass = useThemeClass()
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    const addEntry = useCallback(() => {
        onEntriesChange([
            ...entries,
            {
                id: crypto.randomUUID(),
                key: "",
                value: "",
                type: "text",
                enabled: true,
            },
        ])
    }, [entries, onEntriesChange])

    const updateEntry = useCallback(
        (id: string, updates: Partial<FormDataEntry>) => {
            onEntriesChange(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)))
        },
        [entries, onEntriesChange]
    )

    const removeEntry = useCallback(
        (id: string) => {
            onEntriesChange(entries.filter((e) => e.id !== id))
        },
        [entries, onEntriesChange]
    )

    const handleFileSelect = useCallback(
        (entryId: string, file: globalThis.File) => {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = (reader.result as string).split(",")[1] || ""
                updateEntry(entryId, {
                    value: base64,
                    fileName: file.name,
                    fileSize: file.size,
                    fileData: base64,
                    filePath: undefined,
                })
            }
            reader.readAsDataURL(file)
        },
        [updateEntry]
    )

    const handleTypeChange = useCallback(
        (id: string, type: "text" | "file") => {
            updateEntry(id, {
                type,
                value: "",
                fileName: undefined,
                fileSize: undefined,
                fileData: undefined,
                filePath: undefined,
            })
        },
        [updateEntry]
    )

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    {entries.filter((e) => e.enabled).length} active field{entries.filter((e) => e.enabled).length !== 1 ? "s" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={addEntry} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Field
                </Button>
            </div>

            {/* Entries */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 pr-3">
                    {entries.length === 0 && (
                        <div className="text-center py-8 space-y-2">
                            <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                            <p className="text-sm text-muted-foreground">No form data fields</p>
                            <p className="text-xs text-muted-foreground/70">
                                Add text fields or file uploads for your multipart/form-data request.
                            </p>
                        </div>
                    )}

                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="grid grid-cols-[auto_80px_1fr_1fr_auto] gap-2 items-center bg-muted/20 rounded-lg p-2 border border-border/20"
                        >
                            {/* Enable toggle */}
                            <input
                                type="checkbox"
                                checked={entry.enabled}
                                onChange={(e) => updateEntry(entry.id, { enabled: e.target.checked })}
                                className="h-3.5 w-3.5 rounded accent-primary"
                            />

                            {/* Type selector */}
                            <Select
                                value={entry.type}
                                onValueChange={(v) => handleTypeChange(entry.id, v as "text" | "file")}
                            >
                                <SelectTrigger className="h-8 text-xs bg-secondary/40 border-border/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}
                                >
                                    <SelectItem value="text" className="text-xs">
                                        Text
                                    </SelectItem>
                                    <SelectItem value="file" className="text-xs">
                                        File
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Key */}
                            <Input
                                placeholder="Key"
                                value={entry.key}
                                onChange={(e) => updateEntry(entry.id, { key: e.target.value })}
                                className="h-8 text-xs font-mono bg-background/50"
                            />

                            {/* Value / File picker */}
                            {entry.type === "text" ? (
                                <Input
                                    placeholder="Value"
                                    value={entry.value}
                                    onChange={(e) => updateEntry(entry.id, { value: e.target.value })}
                                    className="h-8 text-xs font-mono bg-background/50"
                                />
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            fileInputRefs.current[entry.id] = el
                                        }}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleFileSelect(entry.id, file)
                                        }}
                                    />
                                    {entry.fileName ? (
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-normal text-foreground border-border/40 gap-1 max-w-full truncate"
                                            >
                                                <File className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{entry.fileName}</span>
                                                {entry.fileSize && (
                                                    <span className="text-muted-foreground shrink-0">
                                                        ({formatFileSize(entry.fileSize)})
                                                    </span>
                                                )}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    updateEntry(entry.id, {
                                                        value: "",
                                                        fileName: undefined,
                                                        fileSize: undefined,
                                                        fileData: undefined,
                                                        filePath: undefined,
                                                    })
                                                }
                                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRefs.current[entry.id]?.click()}
                                            className="h-8 text-xs gap-1 flex-1"
                                        >
                                            <Upload className="h-3 w-3" />
                                            Choose File
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Delete */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEntry(entry.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

/**
 * Serialize FormDataEntry[] into the body string representation
 * for display and for sending (key=value pairs or description).
 */
export function serializeFormData(entries: FormDataEntry[]): string {
    return entries
        .filter((e) => e.enabled && e.key)
        .map((e) => {
            if (e.type === "file") {
                return `${e.key}: [file: ${e.fileName || "no file selected"}]`
            }
            return `${e.key}=${e.value}`
        })
        .join("\n")
}

/**
 * Parse a body string back into FormDataEntry[] (best effort).
 */
export function parseFormDataBody(body: string): FormDataEntry[] {
    if (!body.trim()) return []

    return body
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
            const fileMarkerMatch = line.match(/^(.+?):\s*\[file:\s*(.+?)\]\s*$/)
            if (fileMarkerMatch) {
                const [, key, fileName] = fileMarkerMatch
                return {
                    id: crypto.randomUUID(),
                    key: key.trim(),
                    value: "",
                    type: "file" as const,
                    fileName: fileName.trim(),
                    enabled: true,
                }
            }

            const eqIndex = line.indexOf("=")
            if (eqIndex > 0) {
                return {
                    id: crypto.randomUUID(),
                    key: line.substring(0, eqIndex),
                    value: line.substring(eqIndex + 1),
                    type: "text" as const,
                    enabled: true,
                }
            }
            return {
                id: crypto.randomUUID(),
                key: line,
                value: "",
                type: "text" as const,
                enabled: true,
            }
        })
}
