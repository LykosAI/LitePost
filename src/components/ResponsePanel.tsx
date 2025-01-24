import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Response } from "@/types"
import { useEffect, useState, memo, useMemo } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronRight, ChevronDown, ZoomIn, ZoomOut, RotateCw, Copy, Check } from "lucide-react"
import { Button } from "./ui/button"
import { useSettings } from "@/store/settings"
import { toast } from "sonner"
import { CODE_SNIPPETS } from "@/utils/codeSnippets"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ResponsePanelProps {
  response: Response | null
}

interface CollapsibleJSONProps {
  data: any
  level?: number
  isExpanded?: boolean
  maxAutoExpandDepth?: number
  maxAutoExpandArraySize?: number
  maxAutoExpandObjectSize?: number
}

// Memoize the JSON node to prevent unnecessary re-renders
const CollapsibleJSON = memo(function CollapsibleJSON({ 
  data, 
  level = 0, 
  isExpanded = true,
  maxAutoExpandDepth = 2,
  maxAutoExpandArraySize = 10,
  maxAutoExpandObjectSize = 5
}: CollapsibleJSONProps) {
  const shouldAutoExpand = () => {
    if (level >= maxAutoExpandDepth) return false
    
    const isObject = typeof data === 'object' && data !== null
    if (!isObject) return true

    const entries = Object.entries(data)
    if (Array.isArray(data) && entries.length > maxAutoExpandArraySize) return false
    if (!Array.isArray(data) && entries.length > maxAutoExpandObjectSize) return false

    return true
  }

  const [expanded, setExpanded] = useState(isExpanded && shouldAutoExpand())
  const isObject = typeof data === 'object' && data !== null
  const isArray = Array.isArray(data)

  if (!isObject) {
    return (
      <span className={typeof data === 'string' ? 'text-green-400' : 'text-blue-400'}>
        {JSON.stringify(data)}
      </span>
    )
  }

  const entries = Object.entries(data)
  const isEmpty = entries.length === 0

  if (isEmpty) {
    return <span>{isArray ? '[]' : '{}'}</span>
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  return (
    <div className="relative" style={{ paddingLeft: level > 0 ? '0.5rem' : 0 }}>
      <div className="flex items-center gap-0.5 cursor-pointer hover:bg-muted/50 rounded px-0.5" onClick={toggleExpand}>
        <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
        <span>{isArray ? '[' : '{'}</span>
        {!expanded && (
          <span className="text-muted-foreground text-xs ml-1">
            {isArray ? `${entries.length} items` : `${entries.length} properties`}
          </span>
        )}
      </div>
      {expanded && (
        <div className="pl-3 border-l border-muted-foreground/20">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start py-0.5">
              <div className="flex-1 flex">
                <span className="text-yellow-400 whitespace-nowrap">
                  {!isArray && `"${key}"`}{isArray && key}
                </span>
                <span className="mx-1">:</span>
                <div className="flex-1 min-w-0">
                  <CollapsibleJSON 
                    data={value} 
                    level={level + 1} 
                    maxAutoExpandDepth={maxAutoExpandDepth}
                    maxAutoExpandArraySize={maxAutoExpandArraySize}
                    maxAutoExpandObjectSize={maxAutoExpandObjectSize}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={expanded ? "pl-3" : ""}>
        <span>{isArray ? ']' : '}'}</span>
      </div>
    </div>
  )
})

interface ImageViewerProps {
  src: string
  contentType: string
  isBase64?: boolean
}

function ImageViewer({ src, contentType, isBase64 }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  // Convert binary to data URL
  const dataUrl = useMemo(() => {
    console.log('ImageViewer props:', { src: src.slice(0, 100) + '...', contentType, isBase64 });
    
    try {
      if (contentType.startsWith('image/svg')) {
        // For SVG, we need to unescape the quotes and properly encode the XML
        const unescapedSvg = src.replace(/\\"/g, '"');
        return `data:${contentType};charset=utf-8,${encodeURIComponent(unescapedSvg)}`
      } else if (isBase64) {
        // For base64 encoded binary images
        return `data:${contentType};base64,${src}`
      } else {
        // Legacy fallback for binary string (can be removed later)
        const byteArray = new Uint8Array(new ArrayBuffer(src.length));
        for (let i = 0; i < src.length; i++) {
          byteArray[i] = src.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([byteArray], { type: contentType });
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error('Failed to create image URL:', e);
      return null;
    }
  }, [src, contentType, isBase64]);

  if (!dataUrl) {
    return <div className="text-sm text-red-400">Failed to load image</div>
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="sticky top-0 z-10 flex gap-2 mb-2 bg-background/80 backdrop-blur p-2 rounded-md">
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground self-center">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <div className="flex items-center justify-center min-h-[200px]">
        <img
          src={dataUrl}
          alt="Response"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            maxWidth: '100%',
            height: 'auto'
          }}
          className="max-w-full"
        />
      </div>
    </div>
  )
}

interface CopyButtonProps {
  content: string
  className?: string
}

function CopyButton({ content, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={`h-8 w-8 ${className}`}
      onClick={copy}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
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
  const { jsonViewer } = useSettings()

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

  return (
    <Card className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex justify-between items-center ps-4 pt-3 pb-1">
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
            <div className={`text-sm ${statusClass} pr-4 flex items-center gap-4`}>
              <span>Status: {response.statusText}</span>
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
                      }
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
            <div className="relative bg-muted rounded-md p-1.5 mb-2">
              {response?.headers && (
                <CopyButton 
                  content={Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response ? (
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')}
                </pre>
              ) : (
                <pre className="text-sm">No headers yet</pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {response?.redirectChain && response.redirectChain.length > 0 && (
          <TabsContent value="redirects" className="flex-1 mt-0 px-4 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <div className="space-y-3 mb-2">
                {response.redirectChain.map((redirect, index) => (
                  <div key={index} className="relative bg-muted rounded-md p-1.5">
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
                      className="absolute right-2 top-2 z-10"
                    />
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="text-sm font-medium">
                        {index + 1}. {redirect.url}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Status: {redirect.statusText}
                      </div>
                    </div>
                    <SyntaxHighlighter
                      language="text"
                      style={oneDark}
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
                          style={oneDark}
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
                          {redirect.cookies.join('\n')}
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
                  content={response.cookies.join('\n')}
                  className="absolute right-2 top-2 z-10"
                />
              )}
              {response?.cookies?.length ? (
                <div>
                  <div className="text-xs font-medium mb-1.5">All Cookies:</div>
                  <SyntaxHighlighter
                    language="text"
                    style={oneDark}
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
                    {response.cookies.join('\n')}
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
              <div className="relative bg-muted rounded-md p-4 mb-2 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Time</span>
                  <span className="text-sm">{Math.round(response.timing.total)}ms</span>
                </div>
                {response.timing.dns !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center gap-1">
                      DNS Lookup
                      <span className="text-xs text-muted-foreground cursor-help relative group">
                        (?)
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-[1000]">
                          DNS lookup time is approximated and may include other connection overhead.
                        </div>
                      </span>
                    </span>
                    <span className="text-sm">{Math.round(response.timing.dns)}ms</span>
                  </div>
                )}
                {response.timing.first_byte !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Time to First Byte</span>
                    <span className="text-sm">{Math.round(response.timing.first_byte)}ms</span>
                  </div>
                )}
                {response.timing.download !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Download</span>
                    <span className="text-sm">{Math.round(response.timing.download)}ms</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  )
} 