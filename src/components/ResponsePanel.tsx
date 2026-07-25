import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Response, ResponseExtractionRule, StreamingResponse, Tab } from "@/types"
import { SAMPLE_REQUESTS } from "@/data/sampleRequests"
import { memo, useEffect, useMemo, useState } from "react"
import { useSettingsStore } from "@/store/settings"
import { CopyButton } from "./CopyButton"
import { CollapsibleJSON } from "./CollapsibleJSON"
import { ImageViewer } from "./ImageViewer"
import { HeadersView } from "./HeadersView"
import { TimingView } from "./TimingView"
import { Send, ArrowUpRight, Clock, HardDrive, AlertTriangle, Filter } from "lucide-react"
import { runJsonQuery } from "@/utils/jsonQuery"
import { extractGraphQLErrors, type GraphQLError } from "@/utils/graphqlSchema"
import { ResponseStreamer } from "./ResponseStreamer"
import { LazySyntaxHighlighter } from "./LazySyntaxHighlighter"
import { VariableExtractor } from "./VariableExtractor"

interface ResponsePanelProps {
  response: Response | null
  streamingResponse?: StreamingResponse | null
  onCancelStream?: () => void
  extractionRules?: ResponseExtractionRule[]
  onExtractionRulesChange?: (rules: ResponseExtractionRule[]) => void
  /** Must be referentially stable — the memo comparator ignores callback identity */
  onLoadSample?: (sample: Partial<Tab>) => void
}

// JSON.parse is cheap even at a few MB; render cost is bounded by
// CollapsibleJSON's auto-collapse rules and per-node child cap.
const MAX_JSON_PARSE_CHARS = 2_000_000
const MAX_SYNTAX_HIGHLIGHT_CHARS = 500_000

const cnFilterBadge = (state: "matched" | "partial" | "none") =>
  `absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded max-w-[45%] truncate ${
    state === "matched"
      ? "text-primary bg-primary/10"
      : state === "partial"
        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
        : "text-destructive bg-destructive/10"
  }`

const formatByteSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`
}

function ResponsePanelComponent({
  response,
  streamingResponse,
  onCancelStream,
  extractionRules,
  onExtractionRulesChange,
  onLoadSample,
}: ResponsePanelProps) {
  // If streaming is active, show the streaming component instead
  if (streamingResponse) {
    return <ResponseStreamer streaming={streamingResponse} onCancel={onCancelStream || (() => { })} />
  }

  const [activeTab, setActiveTab] = useState("response")
  const { jsonViewer } = useSettingsStore()
  const bodySize = response?.body.length ?? 0
  const isLargeBody = bodySize > MAX_SYNTAX_HIGHLIGHT_CHARS
  const shouldParseJson = bodySize <= MAX_JSON_PARSE_CHARS

  const responseFormat = useMemo<"json" | "xml" | "html" | "image" | "other">(() => {
    if (!response?.body || response.error) {
      return "other"
    }

    const contentType = (response.headers['content-type'] || '').toLowerCase()
    const body = response.body.trim()
    const lowerBody = body.toLowerCase()

    if (contentType.startsWith('image/')) {
      return "image"
    }

    if (contentType.includes('application/json') || body.startsWith('{') || body.startsWith('[')) {
      return "json"
    }

    if (contentType.includes('html') || lowerBody.startsWith('<!doctype html') || lowerBody.startsWith('<html')) {
      return "html"
    }

    if (contentType.includes('xml') || body.startsWith('<?xml') || body.startsWith('<')) {
      return "xml"
    }

    return "other"
  }, [response?.body, response?.error, response?.headers])

  const graphqlErrors = useMemo<GraphQLError[] | null>(() => {
    if (!response?.body || response.error) return null
    return extractGraphQLErrors(response.body)
  }, [response?.body, response?.error])

  const parsedJSON = useMemo(() => {
    if (
      activeTab !== "response" ||
      responseFormat !== "json" ||
      !response?.body ||
      response.error ||
      !shouldParseJson
    ) {
      return null
    }

    try {
      return JSON.parse(response.body)
    } catch {
      return null
    }
  }, [activeTab, responseFormat, response?.body, response?.error, shouldParseJson])

  // Reset to response tab if redirects tab becomes unavailable
  useEffect(() => {
    if (activeTab === "redirects" && (!response?.redirectChain || response.redirectChain.length === 0)) {
      setActiveTab("response")
    }
  }, [response, activeTab])

  // Body filter: $.path queries or plain-text deep filtering (JSON responses only)
  const [bodyQuery, setBodyQuery] = useState("")
  useEffect(() => {
    setBodyQuery("")
  }, [response])

  const queryResult = useMemo(() => {
    if (parsedJSON === null || !bodyQuery.trim()) return null
    return runJsonQuery(parsedJSON, bodyQuery)
  }, [parsedJSON, bodyQuery])

  const displayedJSON = queryResult && (queryResult.matched || queryResult.partial)
    ? queryResult.data
    : parsedJSON

  // Status badge helper
  const getStatusBadge = () => {
    if (!response || response.error) return null
    const status = response.status || 0
    let badgeClass = 'status-badge '
    if (status >= 200 && status < 300) badgeClass += 'status-success'
    else if (status >= 300 && status < 400) badgeClass += 'status-redirect'
    else if (status >= 400) badgeClass += 'status-error'
    else badgeClass += 'status-info'
    return <span className={badgeClass}>{response.statusText}</span>
  }

  if (!response) {
    return (
      <Card className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-5">
            <div className="relative flex justify-center">
              <div className="relative">
                <Send className="h-14 w-14 text-muted-foreground/20 rotate-[-15deg]" />
                <ArrowUpRight className="h-5 w-5 text-primary/30 absolute -top-1 -right-1 animate-pulse-soft" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium text-muted-foreground/70">No response yet</h3>
              <p className="text-sm text-muted-foreground/50">
                Send a request to see the response here
              </p>
              <p className="text-xs text-muted-foreground/40 pt-1">
                Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/40 text-muted-foreground/60 rounded border border-border/20">Enter</kbd> to send
              </p>
            </div>
            {onLoadSample && (
              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Or try a sample
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-[420px] mx-auto">
                  {SAMPLE_REQUESTS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      data-testid={`sample-${sample.id}`}
                      onClick={() => onLoadSample(sample.tab)}
                      className="text-left px-3 py-2.5 rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-colors group"
                    >
                      <div className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">
                        {sample.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">
                        {sample.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex flex-col gap-2 ps-4 pt-3 pb-1">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <TabsList className="h-9 bg-secondary/30 border border-border/40 backdrop-blur-xl p-1 rounded-xl shadow-inner gap-1 flex-wrap h-auto">
              <TabsTrigger value="response" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">Response</TabsTrigger>
              {responseFormat === "html" && <TabsTrigger value="preview" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">Preview</TabsTrigger>}
              {responseFormat !== "other" && <TabsTrigger value="raw" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">Raw</TabsTrigger>}
              <TabsTrigger value="headers" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">
                Headers
                {response && Object.keys(response.headers).length > 0 && (
                  <span className="ml-1.5 text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                    {Object.keys(response.headers).length}
                  </span>
                )}
              </TabsTrigger>
              {response?.redirectChain && response.redirectChain.length > 0 && (
                <TabsTrigger value="redirects" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">
                  Redirects
                  <span className="ml-1.5 text-[10px] font-mono bg-amber-500/15 text-amber-400/70 px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                    {response.redirectChain.length}
                  </span>
                </TabsTrigger>
              )}
              <TabsTrigger value="cookies" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">
                Cookies
                {response?.cookies && response.cookies.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                    {response.cookies.length}
                  </span>
                )}
              </TabsTrigger>
              {response?.timing && <TabsTrigger value="timing" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">Timing</TabsTrigger>}
              <TabsTrigger value="extract" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/60 border border-transparent transition-all duration-300 px-3 text-[13px] font-medium">Extract</TabsTrigger>
            </TabsList>
            {response && !response.error && (
              <div className="flex flex-wrap gap-2 items-center pe-4">
                {getStatusBadge()}
                {response.timing && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <Clock className="h-3 w-3" />
                    {Math.round(response.timing.total)}ms
                  </span>
                )}
                {response.size && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <HardDrive className="h-3 w-3" />
                    {(response.size.total / 1024).toFixed(1)}KB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <TabsContent value="response" className="flex-1 mt-0 px-4 pt-2 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
          {responseFormat === "json" && parsedJSON !== null && (
            <div className="relative mb-2 shrink-0">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                value={bodyQuery}
                onChange={(e) => setBodyQuery(e.target.value)}
                placeholder='Filter body — text, or a path like $.items[0].name or $.items[*].id'
                data-testid="body-filter"
                spellCheck={false}
                className="w-full h-8 pl-8 pr-24 rounded-lg bg-muted/40 border border-border/30 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:bg-muted/60 transition-colors"
              />
              {queryResult && (
                <span className={cnFilterBadge(queryResult.matched ? "matched" : queryResult.partial ? "partial" : "none")}>
                  {queryResult.error
                    ? queryResult.error
                    : queryResult.matched
                      ? "filtered"
                      : queryResult.partial
                        ? queryResult.matchedPath ?? "partial"
                        : "no matches"}
                </span>
              )}
            </div>
          )}
          <ScrollArea className="flex-1 min-h-0 pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
            {graphqlErrors && (
              <div className="mb-2 bg-red-500/8 border border-red-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  GraphQL Errors ({graphqlErrors.length})
                </div>
                {graphqlErrors.map((error, i) => (
                  <div key={i} className="bg-red-500/10 rounded-md p-2.5 text-sm">
                    <div className="text-red-300 font-medium text-[13px]">{error.message}</div>
                    {error.path && error.path.length > 0 && (
                      <div className="text-[11px] text-red-400/70 mt-1 font-mono">
                        Path: {error.path.join(' > ')}
                      </div>
                    )}
                    {error.locations && error.locations.length > 0 && (
                      <div className="text-[11px] text-red-400/60 mt-0.5 font-mono">
                        {error.locations.map((l, li) => (
                          <span key={li}>
                            {li > 0 && ', '}
                            Line {l.line}:{l.column}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="relative bg-muted/40 rounded-lg p-3 mb-2 border border-border/20">
              {response?.body && !response.error && (
                <CopyButton
                  content={response.body}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.error ? (
                <pre className="text-sm text-red-400 break-all overflow-wrap-anywhere font-mono">
                  Error: {response.error}
                </pre>
              ) : responseFormat === "image" ? (
                <ImageViewer
                  src={response.body}
                  contentType={response.headers['content-type'] || 'image/png'}
                  isBase64={response.is_base64}
                />
              ) : responseFormat === "json" && parsedJSON !== null ? (
                // Parsed JSON renders as a tree regardless of size — child
                // rendering is capped per node, so big documents stay cheap
                <div className="text-sm break-all font-mono">
                  <CollapsibleJSON
                    data={displayedJSON}
                    {...jsonViewer}
                  />
                </div>
              ) : isLargeBody ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground/70 pr-8">
                    Large response ({formatByteSize(bodySize)}). Showing plain text to reduce memory usage.
                  </p>
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all text-foreground">
                    {response.body}
                  </pre>
                </div>
              ) : response ? (
                (
                  <LazySyntaxHighlighter
                    language={responseFormat === "xml" || responseFormat === "html" ? "markup" : "text"}
                    variant="response-body"
                    wrapLongLines
                  >
                    {response.body}
                  </LazySyntaxHighlighter>
                )
              ) : (
                <pre className="text-sm font-mono text-muted-foreground">
                  No response yet
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {responseFormat === "html" && (
          <TabsContent value="preview" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
              <div className="relative bg-white rounded-lg mb-2 h-[calc(100vh-10rem)] border border-border/20">
                {response?.body && (
                  <CopyButton
                    content={response.body}
                    className="absolute right-2 top-2 z-10"
                  />
                )}
                <iframe
                  srcDoc={response?.body || ""}
                  className="w-full h-full rounded-lg"
                  sandbox="allow-same-origin"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  style={{ border: 'none' }}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        )}
        {responseFormat !== "other" && (
          <TabsContent value="raw" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
              <div className="relative bg-muted/40 rounded-lg p-3 mb-2 border border-border/20">
                {response?.body && (
                  <CopyButton
                    content={response.body}
                    className="absolute right-2 top-2 z-10"
                  />
                )}
                <pre className="text-sm font-mono whitespace-pre-wrap break-all text-muted-foreground">
                  {response?.body || ""}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="headers" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
            {response ? (
              <HeadersView headers={response.headers} />
            ) : (
              <div className="relative bg-muted/40 rounded-lg p-3 mb-2 border border-border/20">
                <pre className="text-sm font-mono text-muted-foreground">No headers yet</pre>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        {response?.redirectChain && response.redirectChain.length > 0 && (
          <TabsContent value="redirects" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
              <div className="space-y-3 mb-2">
                {response.redirectChain.map((redirect, index) => (
                  <div key={index} className="relative bg-muted/40 rounded-lg p-3 border border-border/20">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex-1 min-w-0 pr-10">
                        <div className="text-sm font-medium truncate">
                          {index + 1}. {redirect.url}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Status: {redirect.statusText}
                        </div>
                      </div>
                      <CopyButton
                        content={`URL: ${redirect.url}\nStatus: ${redirect.statusText}\n\nHeaders:\n${Object.entries(redirect.headers)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join('\n')
                          }${redirect.cookies?.length
                            ? `\n\nCookies:\n${redirect.cookies.join('\n')}`
                            : ''
                          }`}
                        className="absolute right-2 top-2"
                      />
                    </div>
                    <LazySyntaxHighlighter
                      language="text"
                      variant="response-details"
                      wrapLongLines
                    >
                      {Object.entries(redirect.headers)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')}
                    </LazySyntaxHighlighter>
                    {redirect.cookies && redirect.cookies.length > 0 && (
                      <div className="mt-1.5">
                        <div className="text-xs font-medium mb-1">Cookies Set:</div>
                        <LazySyntaxHighlighter
                          language="text"
                          variant="response-details"
                          wrapLongLines
                        >
                          {(redirect.cookies ?? []).join('\n')}
                        </LazySyntaxHighlighter>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="cookies" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
            <div className="relative bg-muted/40 rounded-lg p-3 mb-2 border border-border/20">
              {response?.cookies && response.cookies.length > 0 && (
                <CopyButton
                  content={response.cookies.join('\n')}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.cookies?.length ? (
                <div>
                  <div className="text-xs font-medium mb-1.5 text-muted-foreground">All Cookies:</div>
                  <LazySyntaxHighlighter
                    language="text"
                    variant="response-details"
                    wrapLongLines
                  >
                    {response.cookies.join('\n')}
                  </LazySyntaxHighlighter>
                </div>
              ) : (
                <pre className="text-sm font-mono text-muted-foreground/50">No cookies</pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {response?.timing && (
          <TabsContent value="timing" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
              <TimingView timing={response.timing} />
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="extract" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
            <VariableExtractor
              response={response}
              rules={extractionRules}
              onRulesChange={onExtractionRulesChange}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function areResponsePanelPropsEqual(prev: ResponsePanelProps, next: ResponsePanelProps) {
  return (
    prev.response === next.response &&
    prev.streamingResponse === next.streamingResponse &&
    prev.extractionRules === next.extractionRules
  )
}

export const ResponsePanel = memo(ResponsePanelComponent, areResponsePanelPropsEqual)
