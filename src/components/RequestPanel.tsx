import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Save } from "lucide-react"
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
import React, { useEffect, useState, useMemo } from "react"
import { AuthConfig, URLParam, Header, Cookie, TestScript, TestAssertion, TestResult, Response } from "@/types"
import { CODE_SNIPPETS } from "@/utils/codeSnippets"
import { getRequestNameFromUrl } from "@/utils/url"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyButton } from "./CopyButton"
import { KeyValueList } from "./KeyValueList"
import { AuthConfigurator } from "./AuthConfigurator"
import { TestPanel } from "./TestPanel"
import { runTests } from "@/utils/testRunner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCollectionStore } from "@/store/collections"

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
  response: Response | null
  testScripts: TestScript[]
  testAssertions: TestAssertion[]
  testResults: TestResult | null
  onMethodChange: (value: string) => void
  onUrlChange: (value: string) => void
  onParamsChange: (params: URLParam[]) => void
  onHeadersChange: (headers: Header[]) => void
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
  onAuthChange: (auth: AuthConfig) => void
  onCookiesChange: (cookies: Cookie[]) => void
  onTestScriptsChange: (scripts: TestScript[]) => void
  onTestAssertionsChange: (assertions: TestAssertion[]) => void
  onTestResultsChange: (results: TestResult | null) => void
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
  auth,
  cookies,
  response,
  testScripts,
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
  onTestAssertionsChange,
  onTestResultsChange,
  onSend,
}: RequestPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(CODE_SNIPPETS[0].value)
  const { collections, addRequest, addCollection } = useCollectionStore()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isAddingCollection, setIsAddingCollection] = useState(false)
  
  const codeSnippet = useMemo(() => {
    const generator = CODE_SNIPPETS.find(s => s.value === selectedLanguage)?.generator
    if (!generator) return ''
    
    return generator({
      method,
      url,
      headers,
      body,
      contentType,
      auth,
      cookies,
    })
  }, [selectedLanguage, method, url, headers, body, contentType, auth, cookies])

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

  const handleSaveToCollection = (collectionId: string) => {
    const requestData = {
      name: getRequestNameFromUrl(url),
      method,
      url,
      rawUrl: url,
      params,
      headers,
      body,
      contentType,
      auth,
      cookies,
    }
    
    addRequest(collectionId, requestData)
    setSaveDialogOpen(false)
  }

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return
    
    // Create request data object
    const requestData = {
      name: getRequestNameFromUrl(url),
      method,
      url,
      rawUrl: url,
      params,
      headers,
      body,
      contentType,
      auth,
      cookies,
    }
    
    // Add collection and get its ID
    const collectionId = addCollection(newCollectionName.trim())
    
    // Add request to the new collection
    addRequest(collectionId, requestData)
    
    setNewCollectionName('')
    setIsAddingCollection(false)
    setSaveDialogOpen(false)
  }

  const handleRunTests = async () => {
    if (!response) return
    const results = await runTests(testScripts, testAssertions, response)
    onTestResultsChange(results)
  }

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
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogTrigger>
          <DialogContent className="dark bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Save to Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {isAddingCollection ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Collection name"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCollection()
                      } else if (e.key === 'Escape') {
                        setIsAddingCollection(false)
                        setNewCollectionName('')
                      }
                    }}
                    autoFocus
                    className="flex-1 bg-background text-foreground"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleAddCollection}
                    disabled={!newCollectionName.trim()}
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-foreground hover:bg-muted"
                  onClick={() => setIsAddingCollection(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Collection
                </Button>
              )}
              
              {collections.length === 0 ? (
                !isAddingCollection && (
                  <p className="text-sm text-muted-foreground">
                    No collections found. Create a collection first to save requests.
                  </p>
                )
              ) : (
                collections.map((collection) => (
                  <Button
                    key={collection.id}
                    variant="outline"
                    className="w-full justify-start text-foreground hover:bg-muted"
                    onClick={() => handleSaveToCollection(collection.id)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {collection.name}
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
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
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0">
          <TabsContent value="params" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
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
          <TabsContent value="tests" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <TestPanel
              scripts={testScripts}
              assertions={testAssertions}
              testResults={testResults}
              response={response}
              onScriptsChange={onTestScriptsChange}
              onAssertionsChange={onTestAssertionsChange}
              onRunTests={handleRunTests}
            />
          </TabsContent>
          <TabsContent value="code" className="flex-1 mt-0 px-4 pt-2 pb-4 min-h-0 h-full">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-border">
                      {CODE_SNIPPETS.map((lang) => (
                        <SelectItem
                          key={lang.value}
                          value={lang.value}
                          className="hover:bg-muted focus:bg-muted text-white"
                        >
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CopyButton content={codeSnippet} />
                </div>
                
                <div className="relative font-mono text-sm bg-muted rounded-md p-4">
                  <SyntaxHighlighter
                    language={selectedLanguage === 'curl' ? 'bash' : selectedLanguage}
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
                      'pre > code': {
                        ...oneDark['pre > code'],
                        background: 'transparent',
                      },
                      'token': {
                        background: 'transparent',
                      }
                    }}
                    customStyle={{
                      background: 'transparent',
                      fontSize: 'inherit',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                    wrapLongLines
                  >
                    {codeSnippet}
                  </SyntaxHighlighter>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
} 