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
import React, { useEffect } from "react"
import { AuthConfig, AuthType, URLParam, Header, Cookie } from "@/types"

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
  auth: AuthConfig
  cookies: Cookie[]
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onParamsChange: (params: URLParam[]) => void
  onHeadersChange: (headers: Header[]) => void
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
  onAuthChange: (auth: AuthConfig) => void
  onCookiesChange: (cookies: Cookie[]) => void
  onSend: () => void
}

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
]

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
  onMethodChange,
  onUrlChange,
  onParamsChange,
  onHeadersChange,
  onBodyChange,
  onContentTypeChange,
  onAuthChange,
  onCookiesChange,
  onSend,
}: RequestPanelProps) {
  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Enter is pressed and Ctrl/Cmd is not held down (to avoid conflicts with newlines in body)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !loading) {
        // Only trigger if we're not in a textarea or contenteditable element
        const activeElement = document.activeElement
        const isInTextArea = activeElement?.tagName === 'TEXTAREA'
        const isContentEditable = activeElement?.hasAttribute('contenteditable')
        
        if (!isInTextArea && !isContentEditable) {
          e.preventDefault()
          onSend()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onSend])

  const updateCookie = (index: number, field: keyof Cookie, value: string | boolean) => {
    const newCookies = [...cookies];
    newCookies[index] = { ...newCookies[index], [field]: value };
    onCookiesChange(newCookies);
  };

  const removeCookie = (index: number) => {
    const newCookies = cookies.filter((_, i) => i !== index);
    onCookiesChange(newCookies);
  };

  const addCookie = () => {
    onCookiesChange([...cookies, { name: '', value: '' }]);
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex gap-2 p-4 pb-2">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="w-[120px] bg-background border-input focus:ring-0 focus-visible:ring-1">
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

      <Tabs defaultValue="params" className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center ps-4 pt-1">
          <TabsList>
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="cookies">Cookies</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0">
          <TabsContent value="params" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
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
            </ScrollArea>
          </TabsContent>
          <TabsContent value="auth" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 pr-4">
                <Select value={auth.type} onValueChange={(value: AuthType) => onAuthChange({ ...auth, type: value })}>
                  <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
                    <SelectValue placeholder="Authentication Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-border">
                    {AUTH_TYPES.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className="hover:bg-muted focus:bg-muted text-white"
                      >
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {auth.type === 'basic' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Username"
                      value={auth.username || ''}
                      onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={auth.password || ''}
                      onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
                    />
                  </div>
                )}

                {auth.type === 'bearer' && (
                  <Input
                    placeholder="Bearer Token"
                    value={auth.token || ''}
                    onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
                  />
                )}

                {auth.type === 'api-key' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Key"
                      value={auth.key || ''}
                      onChange={(e) => onAuthChange({ ...auth, key: e.target.value })}
                    />
                    <Input
                      placeholder="Value"
                      value={auth.value || ''}
                      onChange={(e) => onAuthChange({ ...auth, value: e.target.value })}
                    />
                    <Select 
                      value={auth.addTo || 'header'} 
                      onValueChange={(value: 'header' | 'query') => onAuthChange({ ...auth, addTo: value })}
                    >
                      <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
                        <SelectValue placeholder="Add to" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-border">
                        <SelectItem value="header" className="hover:bg-muted focus:bg-muted text-white">
                          Header
                        </SelectItem>
                        <SelectItem value="query" className="hover:bg-muted focus:bg-muted text-white">
                          Query Parameter
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="headers" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
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
            </ScrollArea>
          </TabsContent>
          <TabsContent value="body" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex flex-col gap-2 h-full">
              <Select value={contentType} onValueChange={onContentTypeChange}>
                <SelectTrigger className="bg-background border-input focus:ring-0 focus-visible:ring-1">
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
              <div className="flex-1 min-h-0 rounded-md border">
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
                  className="h-full resize-none border-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="cookies" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                {cookies.map((cookie, index) => (
                  <React.Fragment key={index}>
                    <Input
                      value={cookie.name}
                      onChange={(e) => updateCookie(index, 'name', e.target.value)}
                    />
                    <Input
                      value={cookie.value}
                      onChange={(e) => updateCookie(index, 'value', e.target.value)}
                    />
                    <Button variant="ghost" onClick={() => removeCookie(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </React.Fragment>
                ))}
              </div>
              <Button onClick={addCookie}>
                <Plus className="h-4 w-4 mr-2" /> Add Cookie
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
} 