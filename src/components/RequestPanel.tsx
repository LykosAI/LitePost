import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import React from "react"

interface URLParam {
  key: string
  value: string
  enabled: boolean
}

interface Header {
  key: string
  value: string
  enabled: boolean
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
const CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain",
  "text/html",
  "multipart/form-data",
]

interface RequestPanelProps {
  method: string
  url: string
  loading: boolean
  params: URLParam[]
  headers: Header[]
  body: string
  contentType: string
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onParamsChange: (params: URLParam[]) => void
  onHeadersChange: (headers: Header[]) => void
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
  onSend: () => void
}

export function RequestPanel({
  method,
  url,
  loading,
  params,
  headers,
  body,
  contentType,
  onMethodChange,
  onUrlChange,
  onParamsChange,
  onHeadersChange,
  onBodyChange,
  onContentTypeChange,
  onSend,
}: RequestPanelProps) {
  return (
    <Card className="p-4">
      <div className="flex gap-2 mb-4">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="w-[120px] bg-background border-input">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-border">
            {HTTP_METHODS.map((m) => (
              <SelectItem 
                key={m} 
                value={m}
                className="hover:bg-muted focus:bg-muted text-white"
              >
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input 
          placeholder="Enter request URL" 
          value={url} 
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            // Prevent any special handling of question mark
            if (e.key === '?') {
              e.stopPropagation()
            }
          }}
          className="flex-1"
        />
        <Button variant="secondary" disabled={loading} onClick={onSend}>
          {loading ? "Sending..." : "Send"}
        </Button>
      </div>

      <Tabs defaultValue="params" className="w-full">
        <TabsList>
          <TabsTrigger value="params">Params</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>
        <TabsContent value="params">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-2">
              {params.map((param, index) => (
                <React.Fragment key={index}>
                  <Input
                    placeholder="Parameter name"
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...params]
                      newParams[index].key = e.target.value
                      onParamsChange(newParams)
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...params]
                      newParams[index].value = e.target.value
                      onParamsChange(newParams)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newParams = [...params]
                      newParams[index].enabled = !newParams[index].enabled
                      onParamsChange(newParams)
                    }}
                    className={param.enabled ? "text-foreground" : "text-muted-foreground"}
                  >
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      className="h-4 w-4"
                      onChange={() => {}} // Handled by button click
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newParams = params.filter((_, i) => i !== index)
                      onParamsChange(newParams)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </React.Fragment>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onParamsChange([...params, { key: "", value: "", enabled: true }])
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Parameter
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="headers">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-2">
              {headers.map((header, index) => (
                <React.Fragment key={index}>
                  <Input
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => {
                      const newHeaders = [...headers]
                      newHeaders[index].key = e.target.value
                      onHeadersChange(newHeaders)
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => {
                      const newHeaders = [...headers]
                      newHeaders[index].value = e.target.value
                      onHeadersChange(newHeaders)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newHeaders = [...headers]
                      newHeaders[index].enabled = !newHeaders[index].enabled
                      onHeadersChange(newHeaders)
                    }}
                    className={header.enabled ? "text-foreground" : "text-muted-foreground"}
                  >
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      className="h-4 w-4"
                      onChange={() => {}} // Handled by button click
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newHeaders = headers.filter((_, i) => i !== index)
                      onHeadersChange(newHeaders)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </React.Fragment>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onHeadersChange([...headers, { key: "", value: "", enabled: true }])
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Header
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="body">
          <div className="space-y-2">
            <Select value={contentType} onValueChange={onContentTypeChange}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-border">
                {CONTENT_TYPES.map((type) => (
                  <SelectItem 
                    key={type} 
                    value={type}
                    className="hover:bg-muted focus:bg-muted text-white"
                  >
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScrollArea className="h-[300px] rounded-md border">
              <Textarea
                placeholder="Enter request body"
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onKeyDown={(e) => {
                  const bracketPairs: { [key: string]: string } = {
                    '{': '}',
                    '[': ']',
                    '(': ')',
                  }
                  
                  if (e.key in bracketPairs) {
                    e.preventDefault()
                    const textarea = e.currentTarget
                    const { selectionStart, selectionEnd } = textarea
                    const openBracket = e.key
                    const closeBracket = bracketPairs[openBracket]
                    
                    // Get current cursor position and text
                    const currentText = textarea.value
                    const beforeCursor = currentText.substring(0, selectionStart)
                    const afterCursor = currentText.substring(selectionEnd)
                    
                    // Insert brackets and move cursor between them
                    const newText = beforeCursor + openBracket + closeBracket + afterCursor
                    onBodyChange(newText)
                    
                    // Set cursor position between brackets (needs to be done after React re-render)
                    setTimeout(() => {
                      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1
                    }, 0)
                  }
                }}
                className="min-h-[300px] resize-none border-0 focus-visible:ring-0"
              />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 