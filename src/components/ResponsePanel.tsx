import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Response, StreamingResponse } from "@/types"
import { useEffect, useState } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useSettingsStore } from "@/store/settings"
import { CopyButton } from "./CopyButton"
import { CollapsibleJSON } from "./CollapsibleJSON"
import { ImageViewer } from "./ImageViewer"
import { HeadersView } from "./HeadersView"
import { TimingView } from "./TimingView"
import { Send, ArrowUpRight } from "lucide-react"
import { ResponseStreamer } from "./ResponseStreamer"

interface ResponsePanelProps {
  response: Response | null
  streamingResponse?: StreamingResponse | null
  onCancelStream?: () => void
}

export function ResponsePanel({
  response,
  streamingResponse,
  onCancelStream
}: ResponsePanelProps) {
  // If streaming is active, show the streaming component instead
  if (streamingResponse) {
    return <ResponseStreamer streaming={streamingResponse} onCancel={onCancelStream || (() => { })} />
  }

  const [activeTab, setActiveTab] = useState("response")
  const [responseFormat, setResponseFormat] = useState<"json" | "xml" | "html" | "image" | "other">("other")
  const [parsedJSON, setParsedJSON] = useState<any>(null)
  const [rawResponse, setRawResponse] = useState<string>("")
  const { jsonViewer } = useSettingsStore()

  useEffect(() => {
    if (response?.body) {
      try {
        const contentType = response.headers['content-type'] || ''
        const body = response.body.trim()

        // Store raw response
        setRawResponse(response.body)

        // Check for Image
        if (contentType.startsWith('image/')) {
          setResponseFormat("image")
          setParsedJSON(null)
        }
        // Check for JSON
        else if (contentType.includes('application/json') || body.startsWith('{') || body.startsWith('[')) {
          setResponseFormat("json")
          setParsedJSON(JSON.parse(response.body))
        }
        // Check for HTML
        else if (contentType.includes('html') || body.toLowerCase().startsWith('<!doctype html') || body.toLowerCase().startsWith('<html')) {
          setResponseFormat("html")
          setParsedJSON(null)
        }
        // Check for XML
        else if (contentType.includes('xml') || body.startsWith('<?xml') || body.startsWith('<')) {
          setResponseFormat("xml")
          setParsedJSON(null)
        }
        else {
          setResponseFormat("other")
          setParsedJSON(null)
        }
      } catch {
        setResponseFormat("other")
        setParsedJSON(null)
      }
    } else {
      setResponseFormat("other")
      setParsedJSON(null)
      setRawResponse("")
    }
  }, [response?.body, response?.headers])

  // Reset to response tab if redirects tab becomes unavailable
  useEffect(() => {
    if (activeTab === "redirects" && (!response?.redirectChain || response.redirectChain.length === 0)) {
      setActiveTab("response")
    }
  }, [response, activeTab])

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
              <h3 className="text-base font-medium text-muted-foreground/50">No response yet</h3>
              <p className="text-sm text-muted-foreground/30">
                Send a request to see the response here
              </p>
            </div>
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
            <TabsList>
              <TabsTrigger value="response">Response</TabsTrigger>
              {responseFormat === "html" && <TabsTrigger value="preview">Preview</TabsTrigger>}
              {responseFormat !== "other" && <TabsTrigger value="raw">Raw</TabsTrigger>}
              <TabsTrigger value="headers">Headers</TabsTrigger>
              {response?.redirectChain && response.redirectChain.length > 0 && (
                <TabsTrigger value="redirects">Redirects</TabsTrigger>
              )}
              <TabsTrigger value="cookies">Cookies</TabsTrigger>
              {response?.timing && <TabsTrigger value="timing">Timing</TabsTrigger>}
            </TabsList>
            {response && !response.error && (
              <div className="flex flex-wrap gap-3 items-center pe-4">
                {getStatusBadge()}
                {response.timing && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.round(response.timing.total)}ms
                  </span>
                )}
                {response.size && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {(response.size.total / 1024).toFixed(1)}KB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <TabsContent value="response" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent/30 [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/50">
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
              ) : response ? (
                responseFormat === "json" ? (
                  <div className="text-sm break-all font-mono">
                    <CollapsibleJSON
                      data={parsedJSON}
                      {...jsonViewer}
                    />
                  </div>
                ) : responseFormat === "image" ? (
                  <ImageViewer
                    src={response.body}
                    contentType={response.headers['content-type'] || 'image/png'}
                    isBase64={response.is_base64}
                  />
                ) : (
                  <SyntaxHighlighter
                    language={responseFormat === "xml" ? "xml" : responseFormat === "html" ? "html" : "text"}
                    style={{
                      ...oneDark,
                      'code[class*="language-"]': {
                        ...oneDark['code[class*="language-"]'],
                        background: 'none',
                      },
                      'pre[class*="language-"]': {
                        ...oneDark['pre[class*="language-"]'],
                        background: 'none',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                      }
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '0.25rem',
                      background: 'transparent',
                      fontSize: '0.8125rem',
                      minWidth: 'auto',
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'pre-wrap'
                    }}
                    wrapLongLines
                  >
                    {response.body}
                  </SyntaxHighlighter>
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
                {rawResponse && (
                  <CopyButton
                    content={rawResponse}
                    className="absolute right-2 top-2 z-10"
                  />
                )}
                <pre className="text-sm font-mono whitespace-pre-wrap break-all text-muted-foreground">
                  {rawResponse}
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
                    <SyntaxHighlighter
                      language="text"
                      style={{
                        ...oneDark,
                        'pre[class*="language-"]': {
                          ...oneDark['pre[class*="language-"]'],
                          background: 'transparent',
                          margin: 0,
                          padding: 0,
                        },
                        'code[class*="language-"]': {
                          ...oneDark['code[class*="language-"]'],
                          background: 'transparent',
                        },
                      }}
                      customStyle={{
                        margin: 0,
                        padding: '0.25rem',
                        background: 'transparent',
                        fontSize: '0.8125rem',
                        minWidth: 'auto',
                        wordBreak: 'break-all'
                      }}
                      wrapLongLines
                    >
                      {Object.entries(redirect.headers)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')}
                    </SyntaxHighlighter>
                    {redirect.cookies && redirect.cookies.length > 0 && (
                      <div className="mt-1.5">
                        <div className="text-xs font-medium mb-1">Cookies Set:</div>
                        <SyntaxHighlighter
                          language="text"
                          style={{
                            ...oneDark,
                            'pre[class*="language-"]': {
                              ...oneDark['pre[class*="language-"]'],
                              background: 'transparent',
                              margin: 0,
                              padding: 0,
                            },
                            'code[class*="language-"]': {
                              ...oneDark['code[class*="language-"]'],
                              background: 'transparent',
                            },
                          }}
                          customStyle={{
                            margin: 0,
                            padding: '0.25rem',
                            background: 'transparent',
                            fontSize: '0.8125rem',
                            minWidth: 'auto',
                            wordBreak: 'break-all'
                          }}
                          wrapLongLines
                        >
                          {(response.redirectCookieStrings?.[index] ?? redirect.cookies ?? []).join('\n')}
                        </SyntaxHighlighter>
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
                  content={(response.cookieStrings ?? response.cookies ?? []).join('\n')}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.cookies?.length ? (
                <div>
                  <div className="text-xs font-medium mb-1.5 text-muted-foreground">All Cookies:</div>
                  <SyntaxHighlighter
                    language="text"
                    style={{
                      ...oneDark,
                      'pre[class*="language-"]': {
                        ...oneDark['pre[class*="language-"]'],
                        background: 'transparent',
                        margin: 0,
                        padding: 0,
                      },
                      'code[class*="language-"]': {
                        ...oneDark['code[class*="language-"]'],
                        background: 'transparent',
                      },
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '0.25rem',
                      background: 'transparent',
                      fontSize: '0.8125rem',
                      minWidth: 'auto',
                      wordBreak: 'break-all'
                    }}
                    wrapLongLines
                  >
                    {(response.cookieStrings ?? response.cookies ?? []).join('\n')}
                  </SyntaxHighlighter>
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
      </Tabs>
    </Card>
  )
}
