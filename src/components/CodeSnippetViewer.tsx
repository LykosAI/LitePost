import { useState, useMemo } from "react"
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
import { LazySyntaxHighlighter } from "./LazySyntaxHighlighter"

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
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[200px] bg-secondary/40 border-border/40">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
              {CODE_SNIPPETS.map((lang) => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                  className="hover:bg-accent/15 focus:bg-accent/15 text-foreground font-mono text-[13px]"
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CopyButton content={codeSnippet} />
        </div>

        <div className="relative font-mono text-sm bg-muted/40 rounded-lg p-4 border border-border/20">
          <LazySyntaxHighlighter
            language={selectedLanguage === 'curl' ? 'bash' : selectedLanguage}
            variant="code-snippet"
            wrapLongLines
          >
            {codeSnippet}
          </LazySyntaxHighlighter>
        </div>
      </div>
    </ScrollArea>
  )
} 
