import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Response } from "@/types"
import { useEffect, useState } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useSettingsStore } from "@/store/settings"
import { CopyButton } from "./CopyButton"
import { CollapsibleJSON } from "./CollapsibleJSON"
import { ImageViewer } from "./ImageViewer"
import { HeadersView } from "./HeadersView"
import { TimingView } from "./TimingView"
import { Send } from "lucide-react"

interface ResponsePanelProps {
  response: Response | null
}

export function ResponsePanel({ 
  response,
}: ResponsePanelProps) {
  const isErrorStatus = response?.status && response.status >= 400
  const statusClass = isErrorStatus ? "text-red-400 font-medium" : "text-muted-foreground"
  const [activeTab, setActiveTab] = useState("response")
  const [responseFormat, setResponseFormat] = useState<"json" | "xml" | "html" | "image" | "other">("other")
  const [parsedJSON, setParsedJSON] = useState<any>(null)
  const [rawResponse, setRawResponse] = useState<string>("")
  const { jsonViewer } = useSettingsStore()

  // Add debug logging
  useEffect(() => {
    if (response) {
      console.log('Response in ResponsePanel:', {
        hasRedirectChain: !!response.redirectChain,
        redirectChainLength: response.redirectChain?.length,
        fullResponse: response
      });
    }
  }, [response]);

  useEffect(() => {
    if (response?.body) {
      try {
        const contentType = response.headers['content-type'] || ''
        const body = response.body.trim()
        
        console.log('Response format detection:', { 
          contentType, 
          bodyStart: body.slice(0, 100),
          isBase64: response.is_base64
        });
        
        // Store raw response
        setRawResponse(response.body)

        // Check for Image
        if (contentType.startsWith('image/')) {
          console.log('Detected image format');
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

  if (!response) {
    return (
      <Card className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Send className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-muted-foreground/70">No response yet</h3>
              <p className="text-sm text-muted-foreground/50">Send a request to see the response here</p>
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
          <div className="flex flex-wrap gap-2 items-center justify-between">
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
              <div className="flex flex-wrap gap-4 ps-1 pe-4 text-sm">
                <span className={statusClass}>Status: {response.statusText}</span>
                {response.timing && (
                  <span className="text-muted-foreground">
                    Time: {Math.round(response.timing.total)}ms
                  </span>
                )}
                {response.size && (
                  <span className="text-muted-foreground">
                    Size: {(response.size.total / 1024).toFixed(1)}KB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <TabsContent value="response" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <div className="relative bg-muted rounded-md p-1.5 mb-2">
              {response?.body && !response.error && (
                <CopyButton 
                  content={response.body}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.error ? (
                <pre className="text-sm text-red-400 break-all overflow-wrap-anywhere">
                  Error: {response.error}
                </pre>
              ) : response ? (
                responseFormat === "json" ? (
                  <div className="text-sm break-all">
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
                      fontSize: '0.875rem',
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
                <pre className="text-sm">
                  No response yet
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {responseFormat === "html" && (
          <TabsContent value="preview" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <div className="relative bg-white rounded-md mb-2 h-[calc(100vh-10rem)]">
                {response?.body && (
                  <CopyButton 
                    content={response.body}
                    className="absolute right-2 top-2 z-10"
                  />
                )}
                <iframe
                  srcDoc={response?.body || ""}
                  className="w-full h-full rounded-md"
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
            <ScrollArea className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <div className="relative bg-muted rounded-md p-1.5 mb-2">
                {rawResponse && (
                  <CopyButton 
                    content={rawResponse}
                    className="absolute right-2 top-2 z-10"
                  />
                )}
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {rawResponse}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="headers" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            {response ? (
              <HeadersView headers={response.headers} />
            ) : (
              <div className="relative bg-muted rounded-md p-1.5 mb-2">
                <pre className="text-sm">No headers yet</pre>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        {response?.redirectChain && response.redirectChain.length > 0 && (
          <TabsContent value="redirects" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <div className="space-y-3 mb-2">
                {response.redirectChain.map((redirect, index) => (
                  <div key={index} className="relative bg-muted rounded-md p-1.5">
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
                        content={`URL: ${redirect.url}\nStatus: ${redirect.statusText}\n\nHeaders:\n${
                          Object.entries(redirect.headers)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join('\n')
                        }${
                          redirect.cookies?.length 
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
                        fontSize: '0.875rem',
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
                            fontSize: '0.875rem',
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
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <div className="relative bg-muted rounded-md p-1.5 mb-2">
              {response?.cookies && response.cookies.length > 0 && (
                <CopyButton 
                  content={(response.cookieStrings ?? response.cookies ?? []).join('\n')}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.cookies?.length ? (
                <div>
                  <div className="text-xs font-medium mb-1.5">All Cookies:</div>
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
                      fontSize: '0.875rem',
                      minWidth: 'auto',
                      wordBreak: 'break-all'
                    }}
                    wrapLongLines
                  >
                    {(response.cookieStrings ?? response.cookies ?? []).join('\n')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <pre className="text-sm">No cookies</pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {response?.timing && (
          <TabsContent value="timing" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <TimingView timing={response.timing} />
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  )
} 