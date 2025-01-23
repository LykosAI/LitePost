import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Response } from "@/types"
import { useEffect, useState, memo } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "./ui/button"
import { useSettings } from "@/store/settings"

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

export function ResponsePanel({ response }: ResponsePanelProps) {
  const isErrorStatus = response?.status && response.status >= 400
  const statusClass = isErrorStatus ? "text-red-400 font-medium" : "text-muted-foreground"
  const [activeTab, setActiveTab] = useState("response")
  const [isJSONResponse, setIsJSONResponse] = useState(false)
  const [parsedJSON, setParsedJSON] = useState<any>(null)
  const { jsonViewer } = useSettings()

  useEffect(() => {
    if (response?.body) {
      try {
        const contentType = response.headers['content-type'] || ''
        if (contentType.includes('application/json') || response.body.trim().startsWith('{') || response.body.trim().startsWith('[')) {
          const parsed = JSON.parse(response.body)
          setIsJSONResponse(true)
          setParsedJSON(parsed)
        } else {
          setIsJSONResponse(false)
          setParsedJSON(null)
        }
      } catch {
        setIsJSONResponse(false)
        setParsedJSON(null)
      }
    } else {
      setIsJSONResponse(false)
      setParsedJSON(null)
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
        <div className="flex justify-between items-center px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="response" className="text-xs px-2.5 h-6">Response</TabsTrigger>
            <TabsTrigger value="headers" className="text-xs px-2.5 h-6">Headers</TabsTrigger>
            {response?.redirectChain && response.redirectChain.length > 0 && (
              <TabsTrigger value="redirects" className="text-xs px-2.5 h-6">Redirects</TabsTrigger>
            )}
            <TabsTrigger value="cookies" className="text-xs px-2.5 h-6">Cookies</TabsTrigger>
          </TabsList>
          {response && !response.error && (
            <div className={`text-xs ${statusClass}`}>
              Status: {response.statusText}
            </div>
          )}
        </div>
        <TabsContent value="response" className="flex-1 mt-0 px-3 pt-2 min-h-0">
          <ScrollArea className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <div className="bg-muted rounded-md p-1.5 mb-2">
              {response?.error ? (
                <pre className="text-sm text-red-400 break-all overflow-wrap-anywhere">
                  Error: {response.error}
                </pre>
              ) : response ? (
                isJSONResponse ? (
                  <div className="text-sm">
                    <CollapsibleJSON 
                      data={parsedJSON}
                      {...jsonViewer}
                    />
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language="text"
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: '0.25rem',
                      background: 'transparent',
                      fontSize: '0.875rem',
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
        <TabsContent value="headers" className="flex-1 mt-0 px-3 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <div className="bg-muted rounded-md p-1.5 mb-2">
              {response ? (
                <SyntaxHighlighter
                  language="text"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '0.25rem',
                    background: 'transparent',
                    fontSize: '0.875rem',
                  }}
                >
                  {Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')}
                </SyntaxHighlighter>
              ) : (
                <pre className="text-sm">No headers yet</pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        {response?.redirectChain && response.redirectChain.length > 0 && (
          <TabsContent value="redirects" className="flex-1 mt-0 px-3 pt-2 min-h-0">
            <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
              <div className="space-y-3 mb-2">
                {response.redirectChain.map((redirect, index) => (
                  <div key={index} className="bg-muted rounded-md p-1.5">
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
                      }}
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
                          }}
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
        <TabsContent value="cookies" className="flex-1 mt-0 px-3 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <div className="bg-muted rounded-md p-1.5 mb-2">
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
                    }}
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
      </Tabs>
    </Card>
  )
} 