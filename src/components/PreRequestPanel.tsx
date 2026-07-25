import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TestScript } from '@/types'
import { Plus, Trash2, PlayCircle } from 'lucide-react'

interface PreRequestPanelProps {
  scripts: TestScript[]
  onScriptsChange: (scripts: TestScript[]) => void
}

export function PreRequestPanel({ scripts, onScriptsChange }: PreRequestPanelProps) {
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id || null)

  const addScript = () => {
    const newScript: TestScript = {
      id: crypto.randomUUID(),
      name: `Pre-request Script ${scripts.length + 1}`,
      code: "// Example\nlp.environment.set('timestamp', String(Date.now()));\nlp.request.setHeader('x-request-ts', lp.environment.get('timestamp') || '');",
      enabled: true,
    }

    onScriptsChange([...scripts, newScript])
    setSelectedScriptId(newScript.id)
  }

  const updateScript = (id: string, updates: Partial<TestScript>) => {
    onScriptsChange(scripts.map((script) => (script.id === id ? { ...script, ...updates } : script)))
  }

  const removeScript = (id: string) => {
    const next = scripts.filter((script) => script.id !== id)
    onScriptsChange(next)

    if (selectedScriptId === id) {
      setSelectedScriptId(next[0]?.id ?? null)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b flex-none">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Pre-request Scripts</h3>
            <span className="text-xs text-muted-foreground">
              Runs before each send
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={addScript}>
            <Plus className="h-4 w-4 mr-2" />
            Add Script
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4 pr-4">
          {scripts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted/40 p-4 mb-4">
                <PlayCircle className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h4 className="text-sm font-medium text-muted-foreground/80 mb-1">No pre-request scripts yet</h4>
              <p className="text-xs text-muted-foreground/50 max-w-[360px] mb-6">
                Use scripts to compute dynamic headers, timestamps, signatures, and environment variables before requests are sent.
              </p>
              <Button onClick={addScript} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Script
              </Button>
            </div>
          )}

          {scripts.map((script) => (
            <div
              key={script.id}
              className={`space-y-2 p-3 border rounded-md ${selectedScriptId === script.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
              onClick={() => setSelectedScriptId(script.id)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={script.enabled}
                  onChange={(e) => updateScript(script.id, { enabled: e.target.checked })}
                />
                <Input
                  value={script.name}
                  onChange={(e) => updateScript(script.id, { name: e.target.value })}
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

              <Textarea
                value={script.code}
                onChange={(e) => updateScript(script.id, { code: e.target.value })}
                className="min-h-[180px] font-mono text-sm"
                spellCheck={false}
              />

              <p className="text-xs text-muted-foreground">
                Available APIs: <code>lp.environment.get/set</code>, <code>lp.request.setHeader/removeHeader/setBody/setUrl/setMethod/setQueryParam</code>, <code>lp.variables.replaceIn</code>. <code>pm.*</code> is also supported for compatibility.
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
