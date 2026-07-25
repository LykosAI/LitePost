import { Card } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, X } from "lucide-react"
import { useThemeClass } from "@/hooks/useThemeClass"
import { cn } from "@/lib/utils"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AuthConfig, URLParam, Header, Cookie, TestScript, TestAssertion, TestResult, Response, StreamingResponse, FormDataEntry, ResponseExtractionRule, NetworkConfig } from "@/types"
import { buildQueryString, getRequestNameFromUrl, replaceUrlQuery } from "@/utils/url"
import { KeyValueList } from "./KeyValueList"
import { AuthConfigurator } from "./AuthConfigurator"
import { runTests } from "@/utils/testRunner"
import { useCollectionStore } from "@/store/collections"
import { RequestUrlBar } from "./RequestUrlBar"
import { SaveRequestDialog } from "./SaveRequestDialog"
import { CookieEditor } from "./CookieEditor"
import { useStreamingResponse } from "@/hooks/useStreamingResponse"
import { applyAuthToRequest } from "@/utils/auth"
import type { RequestBodyEditorHandle } from "./RequestBodyEditor"
import type { RequestUrlBarHandle } from "./RequestUrlBar"

const RequestBodyEditor = lazy(async () => {
  const module = await import("./RequestBodyEditor")
  return { default: module.RequestBodyEditor }
})

const GraphQLEditor = lazy(async () => {
  const module = await import("./GraphQLEditor")
  return { default: module.GraphQLEditor }
})

const PreRequestPanel = lazy(async () => {
  const module = await import("@/components/PreRequestPanel")
  return { default: module.PreRequestPanel }
})

const TestPanel = lazy(async () => {
  const module = await import("@/components/TestPanel")
  return { default: module.TestPanel }
})

const CodeSnippetViewer = lazy(async () => {
  const module = await import("@/components/CodeSnippetViewer")
  return { default: module.CodeSnippetViewer }
})

const WebSocketPanel = lazy(async () => {
  const module = await import("@/components/WebSocketPanel")
  return { default: module.WebSocketPanel }
})

const CONFIG_EDITOR_HEIGHT_KEY = "litepost:configEditorHeight"
const MIN_EDITOR_HEIGHT = 180

// Everyday sections get their own chip; the rest live in the "⋯" menu. The
// active overflow section is surfaced as a temporary chip so it stays visible.
const OVERFLOW_TABS = [
  { value: "cookies", label: "Cookies" },
  { value: "pre-request", label: "Pre-request" },
  { value: "code", label: "Code" },
  { value: "graphql", label: "GraphQL" },
  { value: "settings", label: "Settings" },
  { value: "websocket", label: "WebSocket" },
] as const

interface ConfigChipProps {
  label: string
  badge?: string | number | null
  active: boolean
  dim?: boolean
  testId?: string
  onClick: () => void
}

function ConfigChip({ label, badge, active, dim = false, testId, onClick }: ConfigChipProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[12px] font-medium transition-colors shrink-0",
        active
          ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.5)]"
          : dim
            ? "border-dashed border-border/50 text-muted-foreground/60 hover:text-foreground hover:border-border"
            : "border-border/50 bg-secondary/30 text-foreground/80 hover:bg-secondary/60"
      )}
    >
      {label}
      {badge != null && badge !== "" && (
        <span className={cn("text-[10px] font-mono leading-none", active ? "text-primary" : "text-primary/80")}>
          {badge}
        </span>
      )}
    </button>
  )
}

function buildGraphQLBody(query: string, variables: string, operationName: string): string {
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
      // Keep sending the query even if variables are invalid JSON.
    }
  }

  if (operationName.trim()) {
    payload.operationName = operationName
  }

  return JSON.stringify(payload, null, 2)
}

interface RequestPanelProps {
  method: string
  url: string
  loading: boolean
  params: URLParam[]
  headers: Header[]
  body: string
  contentType: string
  auth: AuthConfig
  cookies: Cookie[]
  response: Response | null
  testScripts: TestScript[]
  preRequestScripts?: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
  extractionRules?: ResponseExtractionRule[]
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onParamsChange: (params: URLParam[]) => void
  onHeadersChange: (headers: Header[]) => void
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
  onAuthChange: (auth: AuthConfig) => void
  onCookiesChange: (cookies: Cookie[]) => void
  onTestScriptsChange: (scripts: TestScript[]) => void
  onPreRequestScriptsChange?: (scripts: TestScript[]) => void
  onTestAssertionsChange: (assertions: TestAssertion[]) => void
  onTestResultsChange: (results: TestResult | null) => void
  onStreamingStateChange?: (
    streaming: StreamingResponse | null,
    cancelStream: (() => Promise<void>) | (() => void) | null
  ) => void
  onSend: (overrides?: { body?: string; url?: string }) => void
  // GraphQL support
  isGraphQL?: boolean
  graphqlQuery?: string
  graphqlVariables?: string
  graphqlOperationName?: string
  onGraphQLChange?: (updates: {
    isGraphQL?: boolean
    graphqlQuery?: string
    graphqlVariables?: string
    graphqlOperationName?: string
  }) => void
  formDataEntries?: FormDataEntry[]
  onFormDataEntriesChange?: (entries: FormDataEntry[]) => void
  networkConfig?: NetworkConfig
  onNetworkConfigChange?: (config: NetworkConfig) => void
}

export function RequestPanel({
  method,
  url,
  loading,
  params,
  headers,
  body,
  contentType,
  auth,
  cookies,
  response,
  testScripts,
  preRequestScripts = [],
  testAssertions,
  testResults,
  onMethodChange,
  onUrlChange,
  onParamsChange,
  onHeadersChange,
  onBodyChange,
  onContentTypeChange,
  onAuthChange,
  onCookiesChange,
  onTestScriptsChange,
  onPreRequestScriptsChange,
  onTestAssertionsChange,
  onTestResultsChange,
  onStreamingStateChange,
  onSend,
  isGraphQL = false,
  graphqlQuery = '',
  graphqlVariables = '',
  graphqlOperationName = '',
  onGraphQLChange,
  formDataEntries,
  extractionRules = [],
  onFormDataEntriesChange,
  networkConfig,
  onNetworkConfigChange,
}: RequestPanelProps) {
  const { collections, addRequest, addCollection } = useCollectionStore()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  // "" = every section collapsed (chips only); the response owns the window.
  const [activeConfigTab, setActiveConfigTab] = useState("")
  const [editorHeight, setEditorHeight] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(CONFIG_EDITOR_HEIGHT_KEY))
      return Number.isFinite(stored) && stored >= MIN_EDITOR_HEIGHT ? stored : 320
    } catch {
      return 320
    }
  })
  const resizeState = useRef<{ startY: number; startHeight: number } | null>(null)

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resizeState.current = { startY: e.clientY, startHeight: editorHeight }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Synthetic events / older webviews may not support pointer capture
    }
  }

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return
    const delta = e.clientY - resizeState.current.startY
    const max = Math.round(window.innerHeight * 0.7)
    setEditorHeight(Math.min(max, Math.max(MIN_EDITOR_HEIGHT, resizeState.current.startHeight + delta)))
  }

  const handleResizePointerUp = () => {
    if (!resizeState.current) return
    resizeState.current = null
    setEditorHeight((height) => {
      try {
        localStorage.setItem(CONFIG_EDITOR_HEIGHT_KEY, String(height))
      } catch {
        // persistence is best-effort
      }
      return height
    })
  }
  const themeClass = useThemeClass()
  const { streaming, isStreaming, startStream, cancelStream, resetStream } = useStreamingResponse()
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const loadingRef = useRef(loading)
  const isStreamingRef = useRef(isStreaming)
  const onSendRef = useRef(onSend)
  const urlBarRef = useRef<RequestUrlBarHandle | null>(null)
  const bodyEditorRef = useRef<RequestBodyEditorHandle | null>(null)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  const getLatestBody = useCallback(() => bodyEditorRef.current?.flush() ?? body, [body])
  const getLatestUrl = useCallback(() => urlBarRef.current?.flush() ?? url, [url])

  const handleSend = useCallback(() => {
    onSend({
      body: getLatestBody(),
      url: getLatestUrl(),
    })
    // Collapse the open editor so the incoming response gets the full window
    setActiveConfigTab("")
  }, [getLatestBody, getLatestUrl, onSend])

  useEffect(() => {
    onSendRef.current = handleSend
  }, [handleSend])

  // Share streaming data with parent component
  useEffect(() => {
    const updatedStreamingState = streaming && streaming.isComplete && streaming.error
      ? null // If streaming is complete with an error, send null to re-enable buttons
      : streaming

    onStreamingStateChange?.(updatedStreamingState, streaming ? cancelStream : null)

    // Set local error state
    if (streaming?.error) {
      setStreamingError(streaming.error)
      // Reset streaming state
      if (streaming.isComplete) {
        setTimeout(() => {
          resetStream()
        }, 100)
      }
    }
  }, [streaming, cancelStream, resetStream, onStreamingStateChange])

  // Reset error state when starting a new request
  useEffect(() => {
    if (isStreaming) {
      setStreamingError(null)
    }
  }, [isStreaming])

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Enter is pressed and Ctrl/Cmd is not held down (to avoid conflicts with newlines in body)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !loadingRef.current && !isStreamingRef.current) {
        const activeElement = document.activeElement
        const isInTextArea = activeElement?.tagName === 'TEXTAREA'
        const isInInput = activeElement?.tagName === 'INPUT'
        const isContentEditable = activeElement?.hasAttribute('contenteditable')
        // Monaco editors wrap content in a div with this class
        const isInMonaco = activeElement?.closest('.monaco-editor') != null

        if (!isInTextArea && !isInInput && !isContentEditable && !isInMonaco) {
          e.preventDefault()
          onSendRef.current()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const enabledParamsCount = useMemo(
    () => params.filter((param) => param.enabled && param.key).length,
    [params]
  )
  const enabledHeadersCount = useMemo(
    () => headers.filter((header) => header.enabled && header.key).length,
    [headers]
  )
  const bodySizeLabel = useMemo(() => {
    if (!body.trim().length) {
      return null
    }

    return body.length > 1024 ? `${(body.length / 1024).toFixed(1)}K` : `${body.length}B`
  }, [body])

  const activeOverflowTab = OVERFLOW_TABS.find((tab) => tab.value === activeConfigTab) ?? null
  const networkConfigActive = Boolean(
    networkConfig && (networkConfig.timeout !== undefined || networkConfig.sslVerification === false || networkConfig.proxy)
  )
  const overflowHasSignal = isGraphQL || networkConfigActive
  const testsCount = testScripts.length + testAssertions.length

  const toggleConfigTab = useCallback((value: string) => {
    setActiveConfigTab((current) => (current === value ? "" : value))
  }, [])

  const handleSaveToCollection = (collectionId: string) => {
    const latestBody = getLatestBody()
    const latestUrl = getLatestUrl()
    const requestData = {
      name: getRequestNameFromUrl(latestUrl),
      method,
      url: latestUrl,
      rawUrl: latestUrl,
      params,
      headers,
      body: latestBody,
      contentType,
      auth,
      cookies,
      testScripts,
      preRequestScripts,
      testAssertions,
      testResults,
      extractionRules,
      graphqlQuery,
      graphqlVariables,
      graphqlOperationName,
      isGraphQL,
      formDataEntries,
      networkConfig,
    }

    addRequest(collectionId, requestData)
    setSaveDialogOpen(false)
  }

  const handleAddCollection = (name: string) => {
    const latestBody = getLatestBody()
    const latestUrl = getLatestUrl()
    // Create new collection and get its ID
    const newCollection = addCollection(name)

    // Add request to the new collection
    addRequest(newCollection, {
      name: getRequestNameFromUrl(latestUrl),
      method,
      url: latestUrl,
      rawUrl: latestUrl,
      params,
      headers,
      body: latestBody,
      contentType,
      auth,
      cookies,
      testScripts,
      preRequestScripts,
      testAssertions,
      testResults,
      extractionRules,
      graphqlQuery,
      graphqlVariables,
      graphqlOperationName,
      isGraphQL,
      formDataEntries,
      networkConfig,
    })

    setSaveDialogOpen(false)
  }

  const handleRunTests = async () => {
    if (!response) return
    const results = await runTests(testScripts, testAssertions, response)
    onTestResultsChange(results)
  }

  // Prepare request data based on current state
  const prepareRequestData = () => {
    const latestBody = getLatestBody()
    const latestUrl = getLatestUrl()
    // Build URL with params
    let finalUrl = latestUrl
    if (params.length > 0) {
      const queryString = buildQueryString(params)
      if (queryString) {
        finalUrl = replaceUrlQuery(finalUrl, queryString)
      }
    }

    // Prepare headers with auth
    const preparedHeaders: Record<string, string> = {}
    const headersWithAuth = applyAuthToRequest(headers, auth)

    headersWithAuth.forEach((header: Header) => {
      if (header.enabled && header.key) {
        preparedHeaders[header.key] = header.value || ''
      }
    })

    // Prepare cookies
    const preparedCookies = cookies.filter(cookie => cookie.name)

    return {
      finalUrl,
      preparedHeaders,
      preparedBody: latestBody,
      preparedCookies
    }
  }

  const handleStreamRequest = async () => {
    if (loading) return

    // Reset previous streaming errors
    setStreamingError(null)

    // If currently streaming, cancel it
    if (isStreaming) {
      await cancelStream()
      return
    }

    const { finalUrl, preparedHeaders, preparedBody, preparedCookies } = prepareRequestData()

    setActiveConfigTab("")
    try {
      await startStream({
        method,
        url: finalUrl,
        headers: preparedHeaders,
        body: preparedBody,
        content_type: contentType,
        cookies: preparedCookies,
      })
    } catch (err) {
      setStreamingError(err instanceof Error ? err.message : String(err))
      // Make sure streaming state is reset
      resetStream()
    }
  }

  return (
    <Card className="flex flex-col">
      <RequestUrlBar
        ref={urlBarRef}
        method={method}
        url={url}
        loading={loading}
        isStreaming={isStreaming}
        onMethodChange={onMethodChange}
        onUrlChange={onUrlChange}
        onSend={handleSend}
        onSave={() => setSaveDialogOpen(true)}
        onStreamSSE={handleStreamRequest}
      />

      {streamingError && (
        <div className="mx-4 mt-1 px-3 py-2 text-sm bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
          ⚠ {streamingError}
        </div>
      )}

      <SaveRequestDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveToCollection}
        onNewCollection={handleAddCollection}
        collections={collections}
      />

      {/* Gradient separator */}
      <div className="gradient-line mx-4 opacity-30" />

      <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab} className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2.5 overflow-x-auto">
          <ConfigChip
            label="Params"
            badge={enabledParamsCount > 0 ? enabledParamsCount : null}
            active={activeConfigTab === "params"}
            dim={enabledParamsCount === 0}
            testId="params-chip"
            onClick={() => toggleConfigTab("params")}
          />
          <ConfigChip
            label="Headers"
            badge={enabledHeadersCount > 0 ? enabledHeadersCount : null}
            active={activeConfigTab === "headers"}
            dim={enabledHeadersCount === 0}
            testId="headers-chip"
            onClick={() => toggleConfigTab("headers")}
          />
          <ConfigChip
            label="Auth"
            badge={auth.type !== "none" ? "✓" : null}
            active={activeConfigTab === "auth"}
            dim={auth.type === "none"}
            testId="auth-chip"
            onClick={() => toggleConfigTab("auth")}
          />
          <ConfigChip
            label="Body"
            badge={bodySizeLabel}
            active={activeConfigTab === "body"}
            dim={!bodySizeLabel}
            testId="body-chip"
            onClick={() => toggleConfigTab("body")}
          />
          <ConfigChip
            label="Tests"
            badge={testsCount > 0 ? testsCount : null}
            active={activeConfigTab === "tests"}
            dim={testsCount === 0}
            testId="tests-chip"
            onClick={() => toggleConfigTab("tests")}
          />
          {activeOverflowTab && (
            <ConfigChip
              label={activeOverflowTab.label}
              active
              testId={`${activeOverflowTab.value}-chip`}
              onClick={() => toggleConfigTab(activeOverflowTab.value)}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="more-tabs-trigger"
                aria-label="More sections"
                className="inline-flex items-center gap-1 h-7 rounded-full border border-dashed border-border/50 px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
              >
                ⋯
                {overflowHasSignal && !activeOverflowTab && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                )}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={`${themeClass} bg-popover/95 backdrop-blur-xl border border-border/50 shadow-xl rounded-xl`}
            >
              {OVERFLOW_TABS.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  data-testid={`${tab.value}-tab`}
                  onClick={() => setActiveConfigTab(tab.value)}
                  className="gap-2 focus:bg-primary/20 focus:text-primary rounded-lg my-0.5 mx-1 text-[13px] font-medium cursor-pointer"
                >
                  {tab.label}
                  {tab.value === "graphql" && isGraphQL && (
                    <span className="ml-auto text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded-full leading-none">ON</span>
                  )}
                  {tab.value === "settings" && networkConfigActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary/70" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {activeConfigTab && (
            <button
              type="button"
              aria-label="Collapse section"
              data-testid="collapse-config"
              onClick={() => setActiveConfigTab("")}
              className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div
          className={activeConfigTab ? "relative border-t border-border/20" : "hidden"}
          style={activeConfigTab ? { height: editorHeight } : undefined}
        >
          <TabsContent value="params" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {params.length === 0 && (
                  <div className="text-xs text-muted-foreground/50 bg-secondary/40 rounded-lg px-3 py-2 border border-border/30 shadow-sm">
                    💡 Query parameters from your URL will appear here automatically. You can also add them manually below.
                  </div>
                )}
                <KeyValueList
                  items={params}
                  onItemsChange={onParamsChange}
                  keyPlaceholder="Parameter name"
                  valuePlaceholder="Value"
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="auth" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 pr-4">
                <AuthConfigurator auth={auth} onAuthChange={onAuthChange} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="headers" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                <KeyValueList
                  items={headers}
                  onItemsChange={onHeadersChange}
                  keyPlaceholder="Header name"
                  valuePlaceholder="Value"
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="body" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<div className="text-sm text-muted-foreground/60">Loading body editor...</div>}>
              <RequestBodyEditor
                ref={bodyEditorRef}
                body={body}
                contentType={contentType}
                formDataEntries={formDataEntries}
                onBodyChange={onBodyChange}
                onContentTypeChange={onContentTypeChange}
                onFormDataEntriesChange={onFormDataEntriesChange}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="cookies" data-testid="cookies-content" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <CookieEditor
              cookies={cookies}
              onCookiesChange={onCookiesChange}
            />
          </TabsContent>
          <TabsContent value="pre-request" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground/60">Loading pre-request panel...</div>}>
              <PreRequestPanel
                scripts={preRequestScripts}
                onScriptsChange={(scripts) => onPreRequestScriptsChange?.(scripts)}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="tests" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground/60">Loading tests panel...</div>}>
              <TestPanel
                scripts={testScripts}
                assertions={testAssertions}
                testResults={testResults}
                response={response}
                onScriptsChange={onTestScriptsChange}
                onAssertionsChange={onTestAssertionsChange}
                onRunTests={handleRunTests}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="code" className="flex-1 mt-0 px-4 pt-2 pb-4 min-h-0 h-full">
            <Suspense fallback={<div className="text-sm text-muted-foreground/60">Loading code snippets...</div>}>
              <CodeSnippetViewer
                method={method}
                url={url}
                headers={headers}
                body={body}
                contentType={contentType}
                auth={auth}
                cookies={cookies}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="graphql" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="graphql-mode"
                  checked={isGraphQL}
                  onCheckedChange={(checked) => {
                    onGraphQLChange?.({
                      isGraphQL: checked,
                      ...(checked ? { graphqlQuery: graphqlQuery || 'query {\n  \n}' } : {}),
                    })
                    if (checked) {
                      onMethodChange('POST')
                      onContentTypeChange('application/json')
                    }
                  }}
                />
                <Label htmlFor="graphql-mode" className="text-sm font-medium cursor-pointer">
                  GraphQL Mode
                </Label>
              </div>
              {isGraphQL && (
                <span className="text-[11px] text-muted-foreground">
                  Sends query + variables as JSON body via POST
                </span>
              )}
            </div>
            {isGraphQL ? (
              <Suspense fallback={<div className="text-sm text-muted-foreground/60">Loading GraphQL editor...</div>}>
                <GraphQLEditor
                  query={graphqlQuery}
                  variables={graphqlVariables}
                  operationName={graphqlOperationName}
                  url={url}
                  headers={headers}
                  auth={auth}
                  onQueryChange={(q) => {
                    onGraphQLChange?.({ graphqlQuery: q })
                    onBodyChange(buildGraphQLBody(q, graphqlVariables, graphqlOperationName))
                  }}
                  onVariablesChange={(v) => {
                    onGraphQLChange?.({ graphqlVariables: v })
                    onBodyChange(buildGraphQLBody(graphqlQuery, v, graphqlOperationName))
                  }}
                  onOperationNameChange={(n) => {
                    onGraphQLChange?.({ graphqlOperationName: n })
                    onBodyChange(buildGraphQLBody(graphqlQuery, graphqlVariables, n))
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">GraphQL mode is disabled</p>
                  <p className="text-xs text-muted-foreground/70">
                    Enable the toggle above to start writing GraphQL queries.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 pr-4">
                <div className="text-xs text-muted-foreground/50 bg-secondary/40 rounded-lg px-3 py-2 border border-border/30 shadow-sm">
                  Per-request overrides. Leave blank to use global defaults from Settings.
                </div>
                <div className="grid gap-4">
                  {/* Timeout override */}
                  <div className="flex items-center gap-3">
                    <Label className="text-[13px] font-medium w-36 shrink-0">Timeout (s)</Label>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={networkConfig?.timeout ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        onNetworkConfigChange?.({
                          ...networkConfig,
                          timeout: val === '' ? undefined : Number(val),
                        })
                      }}
                      placeholder="Global default"
                      className="flex h-8 w-full rounded-md border border-border/40 bg-background/40 px-3 py-1 text-xs font-mono shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                  </div>
                  {/* Connect Timeout override */}
                  <div className="flex items-center gap-3">
                    <Label className="text-[13px] font-medium w-36 shrink-0">Connect Timeout (s)</Label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={networkConfig?.connectTimeout ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        onNetworkConfigChange?.({
                          ...networkConfig,
                          connectTimeout: val === '' ? undefined : Number(val),
                        })
                      }}
                      placeholder="Global default"
                      className="flex h-8 w-full rounded-md border border-border/40 bg-background/40 px-3 py-1 text-xs font-mono shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                  </div>
                  {/* SSL Verification override */}
                  <div className="flex items-center gap-3">
                    <Label className="text-[13px] font-medium w-36 shrink-0">SSL Verification</Label>
                    <select
                      value={networkConfig?.sslVerification === undefined ? '' : String(networkConfig.sslVerification)}
                      onChange={(e) => {
                        const val = e.target.value
                        onNetworkConfigChange?.({
                          ...networkConfig,
                          sslVerification: val === '' ? undefined : val === 'true',
                        })
                      }}
                      className="flex h-8 w-full rounded-md border border-border/40 bg-background/40 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    >
                      <option value="">Global default</option>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                  {/* Proxy override */}
                  <div className="flex items-center gap-3">
                    <Label className="text-[13px] font-medium w-36 shrink-0">Proxy URL</Label>
                    <input
                      type="text"
                      value={networkConfig?.proxy ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        onNetworkConfigChange?.({
                          ...networkConfig,
                          proxy: val || undefined,
                        })
                      }}
                      placeholder="Global default"
                      className="flex h-8 w-full rounded-md border border-border/40 bg-background/40 px-3 py-1 text-xs font-mono shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="websocket" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground/60">Loading WebSocket panel...</div>}>
              <WebSocketPanel
                url={url}
                headers={headers}
                auth={auth}
              />
            </Suspense>
          </TabsContent>
        </div >
        {activeConfigTab ? (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize editor"
            data-testid="config-resize-handle"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            // The full-width bar is the handle (like the history divider); the
            // before: pseudo-element pads the hit area 8px above and below so
            // the grab zone is much bigger than the visible line
            className="group relative h-1.5 mx-3 my-1 shrink-0 cursor-row-resize touch-none rounded-full bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border/60 transition-colors group-hover:bg-primary/70 group-active:bg-primary/90" />
          </div>
        ) : null}
      </Tabs >
    </Card >
  )
}
