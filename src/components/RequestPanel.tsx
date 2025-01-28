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
import { RequestUrlBar } from "./RequestUrlBar"
import { SaveRequestDialog } from "./SaveRequestDialog"
import { RequestBodyEditor } from "./RequestBodyEditor"
import { CodeSnippetViewer } from "./CodeSnippetViewer"
import { CookieEditor } from "./CookieEditor"

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
      testScripts,
      testAssertions,
      testResults
    }
    
    addRequest(collectionId, requestData)
    setSaveDialogOpen(false)
  }

  const handleAddCollection = (name: string) => {
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
      testScripts,
      testAssertions,
      testResults
    }
    
    // Add collection and get its ID
    const collectionId = addCollection(name)
    
    // Add request to the new collection
    addRequest(collectionId, requestData)
  }

  const handleRunTests = async () => {
    if (!response) return
    const results = await runTests(testScripts, testAssertions, response)
    onTestResultsChange(results)
  }

  return (
    <Card className="h-full flex flex-col">
      <RequestUrlBar
        method={method}
        url={url}
        loading={loading}
        onMethodChange={onMethodChange}
        onUrlChange={onUrlChange}
        onSend={onSend}
        onSave={() => setSaveDialogOpen(true)}
      />

      <SaveRequestDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveToCollection}
        onNewCollection={handleAddCollection}
        collections={collections}
      />

      <Tabs defaultValue="params" className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center ps-4 pt-1">
          <TabsList>
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="cookies" data-testid="cookies-tab">Cookies</TabsTrigger>
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
            <RequestBodyEditor
              body={body}
              contentType={contentType}
              onBodyChange={onBodyChange}
              onContentTypeChange={onContentTypeChange}
            />
          </TabsContent>
          <TabsContent value="cookies" data-testid="cookies-content" className="h-full p-4 pt-2 data-[state=active]:flex data-[state=active]:flex-col">
            <CookieEditor
              cookies={cookies}
              onCookiesChange={onCookiesChange}
            />
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
            <CodeSnippetViewer
              method={method}
              url={url}
              headers={headers}
              body={body}
              contentType={contentType}
              auth={auth}
              cookies={cookies}
            />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
} 