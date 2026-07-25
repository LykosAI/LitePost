import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Response, ResponseExtractionRule } from "@/types"
import { useEnvironmentStore } from "@/store/environments"
import { toast } from "sonner"
import { Plus, Trash2, ArrowRight, Variable, Check, AlertCircle } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useThemeClass } from "@/hooks/useThemeClass"
import { applyExtractionRules, extractRuleValue } from "@/utils/responseExtraction"

interface VariableExtractorProps {
    response: Response | null
    rules?: ResponseExtractionRule[]
    onRulesChange?: (rules: ResponseExtractionRule[]) => void
}

export function VariableExtractor({ response, rules, onRulesChange }: VariableExtractorProps) {
    const [internalRules, setInternalRules] = useState<ResponseExtractionRule[]>([])
    const { setVariable, activeEnvironmentId, environments } = useEnvironmentStore()
    const themeClass = useThemeClass()

    const effectiveRules = rules ?? internalRules
    const setRules = onRulesChange ?? setInternalRules

    const activeEnvName = environments.find((e) => e.id === activeEnvironmentId)?.name

    const addRule = useCallback(() => {
        setRules([
            ...effectiveRules,
            {
                id: crypto.randomUUID(),
                source: "body",
                path: "",
                variableName: "",
            },
        ])
    }, [effectiveRules, setRules])

    const updateRule = useCallback((id: string, updates: Partial<ResponseExtractionRule>) => {
        setRules(effectiveRules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)))
    }, [effectiveRules, setRules])

    const removeRule = useCallback((id: string) => {
        setRules(effectiveRules.filter((rule) => rule.id !== id))
    }, [effectiveRules, setRules])

    const runExtraction = useCallback(() => {
        if (!response) {
            return
        }

        if (!activeEnvironmentId) {
            toast.error("Select an environment first to save variables")
            return
        }

        const result = applyExtractionRules(response, effectiveRules, setVariable)
        setRules(result.updatedRules)

        if (result.successCount > 0) {
            toast.success(
                `Extracted ${result.successCount} variable${result.successCount > 1 ? "s" : ""} to "${activeEnvName}"`
            )
        }

        if (result.successCount === 0 && result.errorCount > 0) {
            toast.error("No variables were extracted. Check your extraction rules.")
        }
    }, [activeEnvironmentId, activeEnvName, effectiveRules, response, setRules, setVariable])

    return (
        <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Variable className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-medium text-foreground">Extract Variables</span>
                    {activeEnvName && (
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border/40">
                            → {activeEnvName}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={addRule} className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" />
                        Add Rule
                    </Button>
                    {effectiveRules.length > 0 && (
                        <Button
                            size="sm"
                            onClick={runExtraction}
                            disabled={!response || !activeEnvironmentId}
                            className="h-7 text-xs gap-1"
                        >
                            <ArrowRight className="h-3 w-3" />
                            Extract All
                        </Button>
                    )}
                </div>
            </div>

            {!activeEnvironmentId && effectiveRules.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Select an active environment in the title bar to save extracted variables.
                </div>
            )}

            {effectiveRules.length === 0 && (
                <div className="text-center py-8 space-y-2">
                    <Variable className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">No extraction rules defined</p>
                    <p className="text-xs text-muted-foreground/70">
                        Extract response values (JSON paths, headers, cookies) into environment variables for use
                        in subsequent requests.
                    </p>
                </div>
            )}

            <div className="space-y-2">
                {effectiveRules.map((rule) => {
                    const { value: previewValue, error: previewError } = response
                        ? extractRuleValue(response, rule)
                        : { value: "", error: null }

                    return (
                        <div
                            key={rule.id}
                            className="grid grid-cols-[110px_1fr_auto_1fr_auto] gap-2 items-center bg-muted/20 rounded-lg p-2 border border-border/20"
                        >
                            <Select
                                value={rule.source}
                                onValueChange={(value) => updateRule(rule.id, { source: value as ResponseExtractionRule["source"] })}
                            >
                                <SelectTrigger className="h-8 text-xs bg-secondary/40 border-border/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                                    <SelectItem value="body" className="text-xs">JSON Body</SelectItem>
                                    <SelectItem value="header" className="text-xs">Header</SelectItem>
                                    <SelectItem value="cookie" className="text-xs">Cookie</SelectItem>
                                    <SelectItem value="status" className="text-xs">Status</SelectItem>
                                </SelectContent>
                            </Select>

                            <Input
                                placeholder={
                                    rule.source === "body"
                                        ? "e.g. data.token"
                                        : rule.source === "header"
                                            ? "e.g. x-request-id"
                                            : rule.source === "cookie"
                                                ? "e.g. session_id"
                                                : "status code"
                                }
                                value={rule.path}
                                onChange={(e) => updateRule(rule.id, { path: e.target.value })}
                                disabled={rule.source === "status"}
                                className="h-8 text-xs font-mono bg-background/50"
                            />

                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />

                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-primary/50 font-mono pointer-events-none select-none">
                                    {"{{"}
                                </span>
                                <Input
                                    placeholder="variableName"
                                    value={rule.variableName}
                                    onChange={(e) => updateRule(rule.id, { variableName: e.target.value })}
                                    className="h-8 text-xs font-mono pl-6 pr-6 bg-background/50"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary/50 font-mono pointer-events-none select-none">
                                    {"}}"}
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRule(rule.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>

                            {response && rule.path && (
                                <div className="col-span-5 px-2 pb-1">
                                    {previewError ? (
                                        <span className="text-[10px] text-destructive">{previewError}</span>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                            <span className="text-[10px] text-muted-foreground truncate font-mono">
                                                {previewValue || "(empty)"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {rule.lastExtractedValue !== undefined && (
                                <div className="col-span-5 px-2 pb-1">
                                    <span className="text-[10px] text-emerald-400 font-mono">
                                        ✓ Last value: {rule.lastExtractedValue}
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
