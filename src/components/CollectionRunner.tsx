import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Collection, SavedRequest, Response, TestResult } from "@/types"
import { applyAuthToHeaders } from "@/utils/authHeaders"
import { resolveRequestAuth } from "@/utils/collectionAuth"
import { useCollectionStore } from "@/store/collections"
import { useEnvironmentStore } from "@/store/environments"
import { useSettingsStore } from "@/store/settings"
import { runTests } from "@/utils/testRunner"
import { invoke } from "@tauri-apps/api/core"
import { runPreRequestScripts } from "@/utils/preRequestRunner"
import { applyExtractionRules } from "@/utils/responseExtraction"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Play,
    Square,
    CheckCircle2,
    XCircle,
    Clock,
    SkipForward,
    Loader2,
    Zap,
    BarChart3,
} from "lucide-react"
import { useThemeClass } from "@/hooks/useThemeClass"

interface RequestResult {
    requestId: string
    requestName: string
    method: string
    url: string
    status: number | null
    statusText: string
    duration: number
    error?: string
    testResult?: TestResult
    response?: Response
}

interface CollectionRunnerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CollectionRunner({ open, onOpenChange }: CollectionRunnerProps) {
    const { collections } = useCollectionStore()
    const { getVariable, setVariable, activeEnvironmentId } = useEnvironmentStore()
    const { network: globalNetwork } = useSettingsStore()
    const themeClass = useThemeClass()

    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
    const [results, setResults] = useState<RequestResult[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [totalRequests, setTotalRequests] = useState(0)
    const cancelRef = useRef(false)

    const selectedCollection = collections.find((c) => c.id === selectedCollectionId)

    const substituteVariables = useCallback(
        (text: string): string => {
            return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const value = getVariable(key.trim())
                return value !== undefined ? value : match
            })
        },
        [getVariable]
    )

    const runRequest = useCallback(
        async (request: SavedRequest, collection?: Collection): Promise<RequestResult> => {
            const startTime = performance.now()

            try {
                // Build headers
                const headerRecord: Record<string, string> = {}
                request.headers.forEach((header) => {
                    if (header.enabled && header.key) {
                        headerRecord[substituteVariables(header.key)] = substituteVariables(header.value)
                    }
                })

                // Apply auth, falling back to the collection's where the request
                // does not carry its own — an imported spec relies on that.
                let url = substituteVariables(request.rawUrl || request.url)
                url = applyAuthToHeaders(
                    resolveRequestAuth(request, collection),
                    headerRecord,
                    url,
                    substituteVariables
                )

                // Cookie header
                const cookieHeader = request.cookies
                    .map(
                        (c) =>
                            `${encodeURIComponent(substituteVariables(c.name))}=${encodeURIComponent(
                                substituteVariables(c.value)
                            )}`
                    )
                    .join("; ")
                if (cookieHeader) headerRecord["Cookie"] = cookieHeader

                const body =
                    request.body && request.method !== "GET" && request.method !== "HEAD"
                        ? substituteVariables(request.body)
                        : undefined

                let method = request.method
                let runtimeUrl = url
                let runtimeBody = body
                const runtimeHeaders = { ...headerRecord }

                if (request.preRequestScripts && request.preRequestScripts.length > 0) {
                    const runtime = await runPreRequestScripts({
                        scripts: request.preRequestScripts,
                        request: {
                            method,
                            url: runtimeUrl,
                            headers: runtimeHeaders,
                            body: runtimeBody,
                        },
                        getVariable,
                        setVariable,
                        substituteVariables,
                    })

                    method = runtime.method
                    runtimeUrl = runtime.url
                    runtimeBody = runtime.body
                    Object.keys(runtimeHeaders).forEach((key) => {
                        delete runtimeHeaders[key]
                    })
                    Object.assign(runtimeHeaders, runtime.headers)
                }

                const nc = request.networkConfig
                const options: Record<string, unknown> = {
                    method,
                    url: runtimeUrl,
                    headers: runtimeHeaders,
                    body: runtimeBody,
                    content_type:
                        runtimeBody && method !== "GET" && method !== "HEAD"
                            ? request.contentType
                            : undefined,
                    cookies: request.cookies.map((c) => ({
                        ...c,
                        name: substituteVariables(c.name),
                        value: substituteVariables(c.value),
                    })),
                    timeout: (nc?.timeout ?? globalNetwork.timeout) || undefined,
                    connect_timeout: (nc?.connectTimeout ?? globalNetwork.connectTimeout) || undefined,
                    ssl_verification: nc?.sslVerification ?? globalNetwork.sslVerification,
                    proxy: (nc?.proxy ?? globalNetwork.proxy) || undefined,
                }

                if (request.contentType === "multipart/form-data" && request.formDataEntries) {
                    options.form_data = request.formDataEntries.map((entry) => ({
                        ...entry,
                        key: substituteVariables(entry.key),
                        value: entry.type === "text" ? substituteVariables(entry.value) : entry.value,
                        fileName: entry.fileName ? substituteVariables(entry.fileName) : entry.fileName,
                    }))
                    options.content_type = "multipart/form-data"
                }

                const responseData = await invoke<{
                    status: number
                    status_text: string
                    headers: Record<string, string>
                    body: string
                    redirect_chain: unknown[]
                    cookies: string[]
                    is_base64: boolean
                    timing?: { start: number; end: number; duration: number; total: number }
                    size?: { headers: number; body: number; total: number }
                }>("send_request", { options })

                const duration = performance.now() - startTime

                const response: Response = {
                    status: responseData.status,
                    statusText: responseData.status_text,
                    headers: responseData.headers,
                    body: responseData.body,
                    redirectChain: [],
                    cookies: responseData.cookies,
                    is_base64: responseData.is_base64,
                    timing: responseData.timing
                        ? { ...responseData.timing, total: responseData.timing.total }
                        : undefined,
                    size: responseData.size,
                }

                if (activeEnvironmentId && request.extractionRules && request.extractionRules.length > 0) {
                    applyExtractionRules(response, request.extractionRules, setVariable)
                }

                // Run tests if they exist
                let testResult: TestResult | undefined
                if (request.testScripts.length > 0 || request.testAssertions.length > 0) {
                    testResult = await runTests(
                        request.testScripts.filter((s) => s.enabled),
                        request.testAssertions.filter((a) => a.enabled),
                        response
                    )
                }

                return {
                    requestId: request.id,
                    requestName: request.name,
                    method,
                    url: request.url,
                    status: response.status,
                    statusText: response.statusText,
                    duration: Math.round(duration),
                    testResult,
                    response,
                }
            } catch (error) {
                return {
                    requestId: request.id,
                    requestName: request.name,
                    method: request.method,
                    url: request.url,
                    status: null,
                    statusText: "Error",
                    duration: Math.round(performance.now() - startTime),
                    error: typeof error === "string" ? error : error instanceof Error ? error.message : "Unknown error",
                }
            }
        },
        [activeEnvironmentId, getVariable, setVariable, substituteVariables, globalNetwork]
    )

    const runCollection = useCallback(async () => {
        if (!selectedCollection) return

        cancelRef.current = false
        setIsRunning(true)
        setResults([])
        setCurrentIndex(0)
        setTotalRequests(selectedCollection.requests.length)

        for (let i = 0; i < selectedCollection.requests.length; i++) {
            if (cancelRef.current) break

            setCurrentIndex(i + 1)
            const result = await runRequest(selectedCollection.requests[i], selectedCollection)
            setResults((prev) => [...prev, result])
        }

        setIsRunning(false)
    }, [selectedCollection, runRequest])

    const cancelRun = useCallback(() => {
        cancelRef.current = true
    }, [])

    // Stats
    const passedRequests = results.filter((r) => !r.error && r.status !== null && r.status < 400)
    const failedRequests = results.filter((r) => r.error || (r.status !== null && r.status >= 400))
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    const passedTests = results.reduce(
        (sum, r) => sum + (r.testResult?.assertions.filter((a) => a.success).length || 0) +
            (r.testResult?.scriptResults.filter((s) => s.success).length || 0),
        0
    )
    const failedTests = results.reduce(
        (sum, r) => sum + (r.testResult?.assertions.filter((a) => !a.success).length || 0) +
            (r.testResult?.scriptResults.filter((s) => !s.success).length || 0),
        0
    )

    const progress = totalRequests > 0 ? (currentIndex / totalRequests) * 100 : 0

    // Method colors
    const methodColors: Record<string, string> = {
        GET: "text-sky-400",
        POST: "text-emerald-400",
        PUT: "text-amber-400",
        DELETE: "text-rose-400",
        PATCH: "text-orange-400",
        HEAD: "text-violet-400",
        OPTIONS: "text-cyan-400",
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`${themeClass} sm:max-w-[800px] max-h-[85vh] bg-background border-border/40 backdrop-blur-xl`}
            >
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary/70" />
                        Collection Runner
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Run all requests in a collection sequentially and view results.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-2">
                    {/* Controls */}
                    <div className="flex items-center gap-3">
                        <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                            <SelectTrigger className="flex-1 bg-secondary/40 border-border/30">
                                <SelectValue placeholder="Select a collection…" />
                            </SelectTrigger>
                            <SelectContent
                                className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}
                            >
                                {collections.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} ({c.requests.length} requests)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isRunning ? (
                            <Button variant="destructive" onClick={cancelRun} className="gap-1.5 min-w-[100px]">
                                <Square className="h-4 w-4" />
                                Stop
                            </Button>
                        ) : (
                            <Button
                                onClick={runCollection}
                                disabled={!selectedCollection || selectedCollection.requests.length === 0}
                                className="gap-1.5 min-w-[100px]"
                            >
                                <Play className="h-4 w-4" />
                                Run All
                            </Button>
                        )}
                    </div>

                    {/* Progress */}
                    {(isRunning || results.length > 0) && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                                            Running {currentIndex} of {totalRequests}…
                                        </>
                                    ) : (
                                        `Completed ${results.length} of ${totalRequests} requests`
                                    )}
                                </span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                        </div>
                    )}

                    {/* Summary stats */}
                    {results.length > 0 && !isRunning && (
                        <div className="grid grid-cols-4 gap-3">
                            <Card className="p-3 bg-muted/20 border-border/20">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary/60" />
                                    <div>
                                        <div className="text-lg font-semibold">{results.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Requests</div>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    <div>
                                        <div className="text-lg font-semibold text-emerald-400">{passedRequests.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Passed</div>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-3 bg-rose-500/5 border-rose-500/20">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-rose-400" />
                                    <div>
                                        <div className="text-lg font-semibold text-rose-400">{failedRequests.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Failed</div>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-3 bg-muted/20 border-border/20">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary/60" />
                                    <div>
                                        <div className="text-lg font-semibold">{totalDuration}ms</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Total Time</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Test summary if any tests ran */}
                    {(passedTests > 0 || failedTests > 0) && !isRunning && (
                        <div className="flex items-center gap-3 text-xs bg-muted/20 rounded-lg px-3 py-2 border border-border/20">
                            <span className="text-muted-foreground font-medium">Tests:</span>
                            <span className="text-emerald-400">{passedTests} passed</span>
                            {failedTests > 0 && <span className="text-rose-400">{failedTests} failed</span>}
                        </div>
                    )}

                    {/* Results list */}
                    {results.length > 0 && (
                        <ScrollArea className="max-h-[350px]">
                            <div className="space-y-1.5 pr-3">
                                {results.map((result, index) => (
                                    <div
                                        key={result.requestId + index}
                                        className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2.5 border border-border/20"
                                    >
                                        {/* Status icon */}
                                        {result.error || (result.status && result.status >= 400) ? (
                                            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                        )}

                                        {/* Method */}
                                        <span
                                            className={`text-xs font-semibold w-14 shrink-0 ${methodColors[result.method] || "text-foreground"
                                                }`}
                                        >
                                            {result.method}
                                        </span>

                                        {/* Name + URL */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{result.requestName}</div>
                                            <div className="text-[11px] text-muted-foreground truncate font-mono">{result.url}</div>
                                        </div>

                                        {/* Status badge */}
                                        {result.status && (
                                            <Badge
                                                variant="outline"
                                                className={
                                                    result.status >= 200 && result.status < 300
                                                        ? "border-emerald-500/30 text-emerald-400 text-[10px]"
                                                        : result.status >= 400
                                                            ? "border-rose-500/30 text-rose-400 text-[10px]"
                                                            : "border-amber-500/30 text-amber-400 text-[10px]"
                                                }
                                            >
                                                {result.status}
                                            </Badge>
                                        )}

                                        {/* Error */}
                                        {result.error && (
                                            <Badge variant="outline" className="border-rose-500/30 text-rose-400 text-[10px]">
                                                Error
                                            </Badge>
                                        )}

                                        {/* Test results */}
                                        {result.testResult && (
                                            <Badge
                                                variant="outline"
                                                className={
                                                    result.testResult.success
                                                        ? "border-emerald-500/30 text-emerald-400 text-[10px]"
                                                        : "border-rose-500/30 text-rose-400 text-[10px]"
                                                }
                                            >
                                                {result.testResult.success ? "Tests ✓" : "Tests ✗"}
                                            </Badge>
                                        )}

                                        {/* Duration */}
                                        <span className="text-[11px] text-muted-foreground font-mono w-16 text-right shrink-0">
                                            {result.duration}ms
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}

                    {/* Empty state - no collection selected */}
                    {!selectedCollection && collections.length > 0 && (
                        <div className="text-center py-8 space-y-2">
                            <SkipForward className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                            <p className="text-sm text-muted-foreground">Select a collection to run</p>
                        </div>
                    )}

                    {/* Empty state - no collections */}
                    {collections.length === 0 && (
                        <div className="text-center py-8 space-y-2">
                            <SkipForward className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                            <p className="text-sm text-muted-foreground">No collections found</p>
                            <p className="text-xs text-muted-foreground/70">
                                Create a collection and add some requests first.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
