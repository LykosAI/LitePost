import { useCallback, useRef, useEffect, useState, useMemo } from "react"
import { basicAuthValue } from "@/utils/base64"
import Editor, { OnMount, loader } from "@monaco-editor/react"
import type { editor as MonacoEditor, IDisposable } from "monaco-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlignLeft, Braces, Variable, Tag, Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useThemeStore, ThemeColor } from "@/store/theme"
import { useGraphQLSchemaStore } from "@/store/graphqlSchema"
import { invoke } from "@tauri-apps/api/core"
import {
    registerGraphQLLanguage,
    createCompletionProvider,
    parseIntrospectionResult,
    extractOperations,
    INTROSPECTION_QUERY,
    type ParsedSchema,
    type ExtractedOperation,
} from "@/utils/graphqlSchema"
import { Header, AuthConfig } from "@/types"

import * as monaco from "monaco-editor"
loader.config({ monaco })

// Register GraphQL language support (syntax highlighting, brackets, etc.)
registerGraphQLLanguage(monaco)

// Ensure Monaco themes are defined for the GraphQL editor
// (RequestBodyEditor also defines these, but GraphQL tab may load first)
import { ensureMonacoThemes } from "@/utils/monacoThemes"
ensureMonacoThemes(monaco)

interface GraphQLEditorProps {
    query: string
    variables: string
    operationName: string
    url: string
    headers: Header[]
    auth: AuthConfig
    onQueryChange: (query: string) => void
    onVariablesChange: (variables: string) => void
    onOperationNameChange: (name: string) => void
}

// Simple Monaco theme config for the GraphQL editor - uses the same bg as body editor
const themeEditorBg: Record<ThemeColor, string> = {
    schematic: '#fbfcf9',
    amber: '#161318',
    blue: '#0c1524',
    green: '#0a1610',
    purple: '#120c1f',
    black: '#080808',
}

export function GraphQLEditor({
    query,
    variables,
    operationName,
    url,
    headers,
    auth,
    onQueryChange,
    onVariablesChange,
    onOperationNameChange,
}: GraphQLEditorProps) {
    const { color: themeColor } = useThemeStore()
    const [activeSection, setActiveSection] = useState<"query" | "variables">("query")
    const queryEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const varsEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const schemaRef = useRef<ParsedSchema | null>(null)
    const completionDisposableRef = useRef<IDisposable | null>(null)

    const { getSchema, isLoading, getError, setSchema, setLoading, setError } = useGraphQLSchemaStore()
    const schema = getSchema(url)
    const loading = isLoading(url)
    const schemaError = getError(url)

    // Keep schemaRef in sync for completion provider
    useEffect(() => {
        schemaRef.current = schema
    }, [schema])

    // Register completion provider once
    useEffect(() => {
        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(
            'graphql',
            createCompletionProvider(schemaRef),
        )
        return () => {
            completionDisposableRef.current?.dispose()
            completionDisposableRef.current = null
        }
    }, [])

    // Enable/disable quick suggestions based on schema availability
    useEffect(() => {
        if (queryEditorRef.current) {
            queryEditorRef.current.updateOptions({
                quickSuggestions: schema ? { other: true, strings: false, comments: false } : false,
            })
        }
    }, [schema])

    // Extract operations from query
    const operations = useMemo<ExtractedOperation[]>(
        () => extractOperations(query),
        [query],
    )

    const editorBg = themeEditorBg[themeColor]

    const editorOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
        minimap: { enabled: false },
        renderWhitespace: 'none',
        links: false,
        codeLens: false,
        lightbulb: { enabled: "off" as MonacoEditor.ShowLightbulbIconMode },
        hover: { enabled: false },
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        lineNumbers: 'on',
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 8,
        renderLineHighlight: 'line',
        padding: { top: 8, bottom: 8 },
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
        },
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        quickSuggestions: schema ? { other: true, strings: false, comments: false } : false,
        contextmenu: true,
        accessibilitySupport: 'off',
        suggest: {
            showIcons: true,
            showStatusBar: true,
            preview: true,
        },
    }

    const handleQueryMount: OnMount = useCallback(
        (editor) => {
            queryEditorRef.current = editor
        },
        []
    )

    const handleVarsMount: OnMount = useCallback(
        (editor) => {
            varsEditorRef.current = editor
        },
        []
    )

    // Sync external query changes
    useEffect(() => {
        if (queryEditorRef.current) {
            const currentValue = queryEditorRef.current.getValue()
            if (query !== currentValue) {
                queryEditorRef.current.setValue(query)
            }
        }
    }, [query])

    // Sync external variables changes
    useEffect(() => {
        if (varsEditorRef.current) {
            const currentValue = varsEditorRef.current.getValue()
            if (variables !== currentValue) {
                varsEditorRef.current.setValue(variables)
            }
        }
    }, [variables])

    const formatQuery = useCallback(() => {
        if (activeSection === "query") {
            queryEditorRef.current?.getAction('editor.action.formatDocument')?.run()
        } else {
            varsEditorRef.current?.getAction('editor.action.formatDocument')?.run()
        }
    }, [activeSection])

    const handleFetchSchema = useCallback(async () => {
        if (!url || loading) return

        setLoading(url, true)
        setError(url, null)

        try {
            // Build headers for introspection request
            const headerRecord: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            headers.forEach(h => {
                if (h.enabled && h.key) {
                    headerRecord[h.key] = h.value
                }
            })

            // Apply auth
            if (auth.type === 'basic' && auth.username) {
                headerRecord['Authorization'] = basicAuthValue(auth.username, auth.password || '')
            } else if (auth.type === 'bearer' && auth.token) {
                headerRecord['Authorization'] = `Bearer ${auth.token}`
            } else if (auth.type === 'api-key' && auth.key && auth.value && auth.addTo === 'header') {
                headerRecord[auth.key] = auth.value
            } else if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
                headerRecord['Authorization'] = `${auth.oauth2.tokenType || 'Bearer'} ${auth.oauth2.accessToken}`
            }

            const response = await invoke<{
                status: number
                body: string
            }>('send_request', {
                options: {
                    method: 'POST',
                    url,
                    headers: headerRecord,
                    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
                    content_type: 'application/json',
                    cookies: [],
                },
            })

            if (response.status >= 400) {
                throw new Error(`HTTP ${response.status}: Schema introspection failed`)
            }

            const parsed = parseIntrospectionResult(response.body)
            setSchema(url, parsed)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            setError(url, message)
        } finally {
            setLoading(url, false)
        }
    }, [url, loading, headers, auth, setLoading, setError, setSchema])

    const userTypeCount = schema
        ? Array.from(schema.types.values()).filter(t => t.name && !t.name.startsWith('__')).length
        : 0

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex flex-col gap-2 h-full">
                {/* Tab bar */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/20">
                        <button
                            onClick={() => setActiveSection("query")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${activeSection === "query"
                                ? "bg-primary/15 text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Braces className="h-3 w-3" />
                            Query
                        </button>
                        <button
                            onClick={() => setActiveSection("variables")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${activeSection === "variables"
                                ? "bg-primary/15 text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Variable className="h-3 w-3" />
                            Variables
                        </button>
                    </div>

                    {/* Operation name */}
                    <div className="flex items-center gap-1.5 flex-1">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                            placeholder="Operation name (optional)"
                            value={operationName}
                            onChange={(e) => onOperationNameChange(e.target.value)}
                            className="h-7 text-xs font-mono flex-1 bg-secondary/30"
                        />
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleFetchSchema}
                                disabled={loading || !url}
                                className={`h-7 px-2.5 text-xs ${schema
                                    ? 'text-emerald-400 hover:text-emerald-300'
                                    : schemaError
                                        ? 'text-red-400 hover:text-red-300'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : schema ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                ) : schemaError ? (
                                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                ) : (
                                    <Database className="h-3.5 w-3.5 mr-1" />
                                )}
                                Schema
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {loading
                                ? 'Fetching schema...'
                                : schema
                                    ? `Schema loaded (${userTypeCount} types). Click to refresh.`
                                    : schemaError
                                        ? `Error: ${schemaError}. Click to retry.`
                                        : 'Fetch GraphQL schema for autocomplete'
                            }
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={formatQuery}
                                className="h-7 px-2.5 text-muted-foreground hover:text-foreground text-xs"
                            >
                                <AlignLeft className="h-3.5 w-3.5 mr-1" />
                                Format
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Format document</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Operation picker - shown when multiple named operations exist */}
                {operations.length >= 2 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Operations:</span>
                        {operations.map((op) => (
                            <button
                                key={op.name}
                                onClick={() => onOperationNameChange(op.name)}
                                className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-colors ${operationName === op.name
                                    ? 'bg-primary/15 text-primary border-primary/30'
                                    : 'bg-muted/30 text-muted-foreground border-border/20 hover:border-border/40 hover:text-foreground'
                                    }`}
                            >
                                <span className="text-[10px] opacity-60 mr-1">{op.type}</span>
                                {op.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Schema error message */}
                {schemaError && (
                    <div className="text-[11px] text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-md px-2.5 py-1.5">
                        Schema: {schemaError}
                    </div>
                )}

                {/* Query editor */}
                <div
                    className="flex-1 min-h-0 rounded-lg border border-border/30 overflow-hidden"
                    style={{
                        backgroundColor: editorBg,
                        display: activeSection === "query" ? "block" : "none",
                    }}
                >
                    <Editor
                        language="graphql"
                        defaultValue={query}
                        onChange={(value) => onQueryChange(value || "")}
                        onMount={handleQueryMount}
                        theme={`litepost-${themeColor}`}
                        options={editorOptions}
                        loading={
                            <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
                                Loading editor...
                            </div>
                        }
                    />
                </div>

                {/* Variables editor (JSON) */}
                <div
                    className="flex-1 min-h-0 rounded-lg border border-border/30 overflow-hidden"
                    style={{
                        backgroundColor: editorBg,
                        display: activeSection === "variables" ? "block" : "none",
                    }}
                >
                    <Editor
                        language="json"
                        defaultValue={variables || "{}"}
                        onChange={(value) => onVariablesChange(value || "")}
                        onMount={handleVarsMount}
                        theme={`litepost-${themeColor}`}
                        options={editorOptions}
                        loading={
                            <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
                                Loading editor...
                            </div>
                        }
                    />
                </div>
            </div>
        </TooltipProvider>
    )
}

/**
 * Build the JSON body payload from GraphQL editor fields.
 */
export function buildGraphQLBody(
    query: string,
    variables: string,
    operationName: string
): string {
    const payload: {
        query: string
        variables?: Record<string, unknown>
        operationName?: string
    } = {
        query,
    }

    if (variables.trim()) {
        try {
            payload.variables = JSON.parse(variables)
        } catch {
            // If variables aren't valid JSON, include as-is as a string
        }
    }

    if (operationName.trim()) {
        payload.operationName = operationName
    }

    return JSON.stringify(payload, null, 2)
}
