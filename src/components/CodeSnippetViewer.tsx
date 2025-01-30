import { useState, useMemo } from "react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyButton } from "./CopyButton"
import { CODE_SNIPPETS } from "@/utils/codeSnippets"
import { AuthConfig, Header, Cookie } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useThemeClass } from "@/hooks/useThemeClass"

interface CodeSnippetViewerProps {
  method: string
  url: string
  headers: Header[]
  body: string
  contentType: string
  auth: AuthConfig
  cookies: Cookie[]
}

export function CodeSnippetViewer({
  method,
  url,
  headers,
  body,
  contentType,
  auth,
  cookies,
}: CodeSnippetViewerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(CODE_SNIPPETS[0].value)
  const themeClass = useThemeClass()

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

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className={`${themeClass} bg-background border-border`}>
              {CODE_SNIPPETS.map((lang) => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                  className="hover:bg-accent focus:bg-accent text-foreground"
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
  )
} 