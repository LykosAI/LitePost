import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect, useState } from "react"
import Editor, { OnMount, loader, type Monaco } from "@monaco-editor/react"
import type { editor as MonacoEditor, IDisposable } from "monaco-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useThemeStore } from "@/store/theme"
import { AlignLeft } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FormDataEditor, FormDataEntry, parseFormDataBody, serializeFormData } from "./FormDataEditor"
import { VariablePeek } from "./VariablePeek"

import * as monaco from "monaco-editor"

// Configure Monaco web workers for Vite
// These workers handle tokenization, validation, etc. in background threads
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new jsonWorker()
    if (label === "css" || label === "scss" || label === "less") return new cssWorker()
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker()
    if (label === "typescript" || label === "javascript") return new tsWorker()
    return new editorWorker()
  },
}

// Use the locally installed monaco-editor instead of CDN
// This eliminates network latency on app startup and works offline
loader.config({ monaco })

const CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/plain",
  "text/html",
  "multipart/form-data",
]

/** Map MIME content types to Monaco language IDs */
function getMonacoLanguage(contentType: string): string {
  if (contentType.includes("json")) return "json"
  if (contentType.includes("xml")) return "xml"
  if (contentType.includes("html")) return "html"
  if (contentType.includes("javascript")) return "javascript"
  if (contentType.includes("yaml") || contentType.includes("yml")) return "yaml"
  if (contentType.includes("form-urlencoded")) return "plaintext"
  return "plaintext"
}

// ─── Theme definitions (shared with GraphQL editor) ──────────────────────────────
import { ensureMonacoThemes, themeConfigs } from "@/utils/monacoThemes"

// ─── Commit utility ──────────────────────────────
const IDLE_COMMIT_MS = 1200

// ─── Component ──────────────────────────────────

interface RequestBodyEditorProps {
  body: string
  contentType: string
  formDataEntries?: FormDataEntry[]
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
  onFormDataEntriesChange?: (entries: FormDataEntry[]) => void
}

export interface RequestBodyEditorHandle {
  flush: () => string
}

export const RequestBodyEditor = forwardRef<RequestBodyEditorHandle, RequestBodyEditorProps>(function RequestBodyEditor({
  body,
  contentType,
  formDataEntries,
  onBodyChange,
  onContentTypeChange,
  onFormDataEntriesChange,
}, ref) {
  const themeClass = useThemeClass()
  const { color: themeColor } = useThemeStore()
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const blurDisposableRef = useRef<IDisposable | null>(null)

  // Track the "last value we told React about" to detect external changes
  const lastSyncedValue = useRef<string>(body)
  const idleCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable ref to onBodyChange so delayed commits always call the latest version
  const onBodyChangeRef = useRef(onBodyChange)
  onBodyChangeRef.current = onBodyChange

  const clearIdleCommit = useCallback(() => {
    if (idleCommitTimer.current) {
      clearTimeout(idleCommitTimer.current)
      idleCommitTimer.current = null
    }
  }, [])

  const flushBody = useCallback(() => {
    clearIdleCommit()

    const latestValue = editorRef.current?.getValue() ?? lastSyncedValue.current
    if (latestValue !== lastSyncedValue.current) {
      lastSyncedValue.current = latestValue
      onBodyChangeRef.current(latestValue)
    }

    return latestValue
  }, [clearIdleCommit])

  useImperativeHandle(ref, () => ({
    flush: flushBody,
  }), [flushBody])

  // Register all themes on mount
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Ensure all theme variants are defined (shared with GraphQL editor)
    ensureMonacoThemes(monaco)

    // Apply the current theme
    monaco.editor.setTheme(`litepost-${themeColor}`)

    // Set up JSON validation settings
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      trailingCommas: 'warning',
    })

    blurDisposableRef.current?.dispose()
    blurDisposableRef.current = editor.onDidBlurEditorText(() => {
      flushBody()
    })
  }, [flushBody, themeColor])

  // Switch Monaco theme when the app theme changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(`litepost-${themeColor}`)
    }
  }, [themeColor])

  // Sync external body changes INTO Monaco (e.g., loading a saved request, switching tabs)
  // Only update if the value actually changed from outside (not from our own typing)
  useEffect(() => {
    if (editorRef.current && body !== lastSyncedValue.current) {
      clearIdleCommit()
      const currentValue = editorRef.current.getValue()
      if (body !== currentValue) {
        editorRef.current.setValue(body)
      }
      lastSyncedValue.current = body
    }
  }, [body, clearIdleCommit])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      blurDisposableRef.current?.dispose()
      blurDisposableRef.current = null
      flushBody()
    }
  }, [flushBody])

  // Monaco owns keystrokes while typing; React state catches up after an idle pause or blur.
  const handleChange = useCallback((value: string | undefined) => {
    const newValue = value ?? ''

    clearIdleCommit()

    idleCommitTimer.current = setTimeout(() => {
      idleCommitTimer.current = null
      lastSyncedValue.current = newValue
      onBodyChangeRef.current(newValue)
    }, IDLE_COMMIT_MS)
  }, [clearIdleCommit])

  const handleContentTypeChange = useCallback((nextContentType: string) => {
    flushBody()
    onContentTypeChange(nextContentType)
  }, [flushBody, onContentTypeChange])

  const formatDocument = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run()
    }
  }, [])

  const language = getMonacoLanguage(contentType)
  const editorBg = themeConfigs[themeColor].colors.editorBg
  const isFormData = contentType === 'multipart/form-data'

  // Form data entries for multipart/form-data mode
  const [formEntries, setFormEntries] = useState<FormDataEntry[]>(() =>
    isFormData ? formDataEntries ?? parseFormDataBody(body) : []
  )

  // Sync form entries to body string
  const handleFormEntriesChange = useCallback((entries: FormDataEntry[]) => {
    setFormEntries(entries)
    onBodyChange(serializeFormData(entries))
    onFormDataEntriesChange?.(entries)
  }, [onBodyChange, onFormDataEntriesChange])

  // Sync entries when switching tabs or loading a saved/imported request.
  useEffect(() => {
    if (isFormData) {
      if (formDataEntries) {
        setFormEntries(formDataEntries)
      } else {
        setFormEntries(parseFormDataBody(body))
      }
    }
  }, [isFormData, body, formDataEntries])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <Select value={contentType} onValueChange={handleContentTypeChange}>
            <SelectTrigger className="w-auto min-w-[200px] bg-secondary/40 border-border/40">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
              {CONTENT_TYPES.map((type) => (
                <SelectItem
                  key={type}
                  value={type}
                  className="hover:bg-accent/15 focus:bg-accent/15 text-foreground font-mono text-[13px]"
                >
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={formatDocument}
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground"
                data-testid="format-button"
              >
                <AlignLeft className="h-3.5 w-3.5 mr-1.5" />
                Format
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Format document <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/40">Shift+Alt+F</kbd></p>
            </TooltipContent>
          </Tooltip>

          <VariablePeek text={body} className="ml-auto" />
        </div>
        {isFormData ? (
          <div className="flex-1 min-h-0 rounded-lg border border-border/30 overflow-hidden bg-muted/10 p-3">
            <FormDataEditor
              entries={formEntries}
              onEntriesChange={handleFormEntriesChange}
            />
          </div>
        ) : (
          <div
            className="flex-1 min-h-0 rounded-lg border border-border/30 overflow-hidden"
            style={{ backgroundColor: editorBg }}
          >
            <Editor
              language={language}
              defaultValue={body}
              onChange={handleChange}
              onMount={handleEditorMount}
              theme={`litepost-${themeColor}`}
              options={{
                // Performance-focused settings
                minimap: { enabled: false },
                renderWhitespace: 'none',
                renderControlCharacters: false,
                links: false,
                colorDecorators: false,
                codeLens: false,
                lightbulb: { enabled: "off" as MonacoEditor.ShowLightbulbIconMode },
                hover: { enabled: false },
                parameterHints: { enabled: false },
                occurrencesHighlight: 'off',
                selectionHighlight: false,
                matchBrackets: 'always',
                accessibilitySupport: 'off',
                // Appearance
                fontSize: 13,
                fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 8,
                renderLineHighlight: 'line',
                padding: { top: 8, bottom: 8 },
                // Editing
                wordWrap: 'on',
                wrappingIndent: 'indent',
                tabSize: 2,
                insertSpaces: true,
                autoIndent: 'full',
                formatOnPaste: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoSurround: 'languageDefined',
                bracketPairColorization: { enabled: true },
                // Scrolling
                scrollBeyondLastLine: false,
                smoothScrolling: false,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  useShadows: false,
                },
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                // Suggestions
                contextmenu: true,
                quickSuggestions: false,
                suggest: {
                  showWords: false,
                },
              }}
              loading={
                <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
                  Loading editor…
                </div>
              }
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
})
