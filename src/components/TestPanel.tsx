import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Play } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TestScript, TestAssertion, TestResult, Response } from "@/types"
import { useState } from "react"
import { useThemeClass } from "@/hooks/useThemeClass"
import { LazySyntaxHighlighter } from "./LazySyntaxHighlighter"

const MAX_TEST_EDITOR_HIGHLIGHT_CHARS = 120_000

interface TestPanelProps {
  scripts: TestScript[]
  assertions: TestAssertion[]
  testResults: TestResult | null
  response: Response | null
  onScriptsChange: (scripts: TestScript[]) => void
  onAssertionsChange: (assertions: TestAssertion[]) => void
  onRunTests: () => void
}

function CodeEditor({ value, onChange, className = "" }: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const showPlainText = value.length > MAX_TEST_EDITOR_HIGHLIGHT_CHARS

  return (
    <div className={`relative font-mono text-sm rounded-md border ${className}`}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 bg-transparent text-transparent caret-white resize-none font-mono text-sm p-4 z-10"
        spellCheck={false}
      />
      <div className="p-4">
        {showPlainText ? (
          <pre className="text-sm font-mono whitespace-pre-wrap break-all m-0">
            {value}
          </pre>
        ) : (
          <LazySyntaxHighlighter
            language="javascript"
            variant="test-editor"
          >
            {value}
          </LazySyntaxHighlighter>
        )}
      </div>
    </div>
  )
}

export function TestPanel({
  scripts,
  assertions,
  testResults,
  response,
  onScriptsChange,
  onAssertionsChange,
  onRunTests,
}: TestPanelProps) {
  const themeClass = useThemeClass()
  const [selectedScript, setSelectedScript] = useState<string | null>(
    scripts[0]?.id || null
  )

  const addScript = () => {
    const newScript: TestScript = {
      id: crypto.randomUUID(),
      name: `Test Script ${scripts.length + 1}`,
      code: '// Write your test script here\npm.test("My Test", () => {\n  pm.expect(pm.response.code).to.equal(200);\n});',
      enabled: true,
    }
    onScriptsChange([...scripts, newScript])
    setSelectedScript(newScript.id)
  }

  const updateScript = (id: string, updates: Partial<TestScript>) => {
    onScriptsChange(
      scripts.map((script) =>
        script.id === id ? { ...script, ...updates } : script
      )
    )
  }

  const removeScript = (id: string) => {
    onScriptsChange(scripts.filter((script) => script.id !== id))
    if (selectedScript === id) {
      setSelectedScript(scripts[0]?.id || null)
    }
  }

  const addAssertion = () => {
    const newAssertion: TestAssertion = {
      id: crypto.randomUUID(),
      type: 'status',
      operator: 'equals',
      expected: 200,
      enabled: true,
    }
    onAssertionsChange([...assertions, newAssertion])
  }

  const updateAssertion = (id: string, updates: Partial<TestAssertion>) => {
    onAssertionsChange(
      assertions.map((assertion) =>
        assertion.id === id ? { ...assertion, ...updates } : assertion
      )
    )
  }

  const removeAssertion = (id: string) => {
    onAssertionsChange(assertions.filter((assertion) => assertion.id !== id))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b flex-none">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Tests</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onRunTests}
              disabled={!response || (scripts.length === 0 && assertions.length === 0)}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addScript}>
              <Plus className="h-4 w-4 mr-2" />
              Add Script
            </Button>
            <Button variant="outline" size="sm" onClick={addAssertion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assertion
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4 pr-4">
          {/* Empty state */}
          {scripts.length === 0 && assertions.length === 0 && !testResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted/40 p-4 mb-4">
                <Play className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h4 className="text-sm font-medium text-muted-foreground/80 mb-1">No tests configured</h4>
              <p className="text-xs text-muted-foreground/50 max-w-[320px] mb-6">
                Validate your API responses automatically. Send a request first, then run your tests.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-[400px]">
                <button
                  onClick={addScript}
                  className="flex flex-col items-start gap-1.5 rounded-lg border border-border/30 bg-muted/20 p-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-foreground/80">+ Add Script</span>
                  <span className="text-[11px] text-muted-foreground/50 leading-tight">
                    Write custom JavaScript tests with full access to the response
                  </span>
                </button>
                <button
                  onClick={addAssertion}
                  className="flex flex-col items-start gap-1.5 rounded-lg border border-border/30 bg-muted/20 p-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-foreground/80">+ Add Assertion</span>
                  <span className="text-[11px] text-muted-foreground/50 leading-tight">
                    Quick no-code checks for status, headers, JSON values, and more
                  </span>
                </button>
              </div>
            </div>
          )}
          {/* Test Scripts */}
          {scripts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Test Scripts</h4>
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="space-y-2 p-2 border border-border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={script.name}
                      onChange={(e) =>
                        updateScript(script.id, { name: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScript(script.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CodeEditor
                    value={script.code}
                    onChange={(code) => updateScript(script.id, { code })}
                    className="min-h-[200px]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Assertions */}
          {assertions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Assertions</h4>
              {assertions.map((assertion) => (
                <div
                  key={assertion.id}
                  className="flex items-center gap-2 p-2 border border-border rounded-md"
                >
                  <Select
                    value={assertion.type}
                    onValueChange={(value) =>
                      updateAssertion(assertion.id, {
                        type: value as TestAssertion['type'],
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px] bg-background border-input" aria-label="Type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${themeClass} bg-background border-border`}>
                      <SelectItem value="status" className="text-foreground">Status Code</SelectItem>
                      <SelectItem value="json" className="text-foreground">JSON Value</SelectItem>
                      <SelectItem value="header" className="text-foreground">Header</SelectItem>
                      <SelectItem value="responseTime" className="text-foreground">Response Time</SelectItem>
                    </SelectContent>
                  </Select>

                  {assertion.type === 'json' || assertion.type === 'header' ? (
                    <Input
                      placeholder={
                        assertion.type === 'json'
                          ? 'JSON path (e.g. data.id)'
                          : 'Header name'
                      }
                      value={assertion.property || ''}
                      onChange={(e) =>
                        updateAssertion(assertion.id, { property: e.target.value })
                      }
                      className="flex-1"
                    />
                  ) : null}

                  <Select
                    value={assertion.operator}
                    onValueChange={(value) =>
                      updateAssertion(assertion.id, {
                        operator: value as TestAssertion['operator'],
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px] bg-background border-input" aria-label="Operator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${themeClass} bg-background border-border`}>
                      <SelectItem value="equals" className="text-foreground">Equals</SelectItem>
                      <SelectItem value="contains" className="text-foreground">Contains</SelectItem>
                      <SelectItem value="exists" className="text-foreground">Exists</SelectItem>
                      <SelectItem value="greaterThan" className="text-foreground">Greater Than</SelectItem>
                      <SelectItem value="lessThan" className="text-foreground">Less Than</SelectItem>
                    </SelectContent>
                  </Select>

                  {assertion.operator !== 'exists' && (
                    <Input
                      placeholder="Expected value"
                      value={assertion.expected.toString()}
                      onChange={(e) =>
                        updateAssertion(assertion.id, {
                          expected:
                            assertion.type === 'status' ||
                              assertion.type === 'responseTime'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      className="w-[140px]"
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAssertion(assertion.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Test Results */}
          {testResults && (
            <div className="space-y-2">
              <h4 className="font-medium">Test Results</h4>
              <div className="p-2 border border-border rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${testResults.success ? 'bg-green-500' : 'bg-red-500'
                      }`}
                  />
                  <span>
                    {testResults.success ? 'Tests passed' : 'Tests failed'}
                  </span>
                  <span className="text-muted-foreground">
                    ({testResults.duration}ms)
                  </span>
                </div>

                {/* Script Results */}
                {testResults.scriptResults.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">Script Tests</h5>
                    {testResults.scriptResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}
                      >
                        <span className="font-medium">{result.name}</span>
                        {result.message && (
                          <span className="block text-muted-foreground">
                            {result.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Assertion Results */}
                {testResults.assertions.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">Assertions</h5>
                    {testResults.assertions.map((result) => (
                      <div
                        key={result.id}
                        className={`p-2 rounded text-sm ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}
                      >
                        {result.message}
                      </div>
                    ))}
                  </div>
                )}

                {testResults.error && (
                  <div className="p-2 bg-red-500/10 rounded text-sm">
                    {testResults.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 
