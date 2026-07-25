import { Button } from './ui/button'
import { X, Minus, Square, Terminal, Zap, Settings, Beaker, Folder, Search } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import icon from '../assets/icon_128.png'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useEnvironmentStore } from '@/store/environments'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { Suspense, lazy, useState, useEffect, useCallback } from 'react'
import { Tab } from '@/types'
import { useThemeClass } from '@/hooks/useThemeClass'
import { ParsedCurlRequest } from '@/utils/curlParser'
import { getRequestNameFromUrl } from '@/utils/url'

interface TitleBarProps {
  currentRequest?: Tab
  onRequestSelect: (request: Tab) => void
}

const CurlImportModal = lazy(async () => {
  const module = await import('./CurlImportModal')
  return { default: module.CurlImportModal }
})

const SettingsPanel = lazy(async () => {
  const module = await import('./SettingsPanel')
  return { default: module.SettingsPanel }
})

const EnvironmentPanel = lazy(async () => {
  const module = await import('./EnvironmentPanel')
  return { default: module.EnvironmentPanel }
})

const CollectionsPanel = lazy(async () => {
  const module = await import('./CollectionsPanel')
  return { default: module.CollectionsPanel }
})

const CollectionRunner = lazy(async () => {
  const module = await import('./CollectionRunner')
  return { default: module.CollectionRunner }
})

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

export function TitleBar({ currentRequest, onRequestSelect }: TitleBarProps) {
  const [appWindow, setAppWindow] = useState<any>(null)

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ Window }) => {
        setAppWindow(Window.getCurrent())
      })
    }
  }, [])
  const { environments, activeEnvironmentId, setActiveEnvironment } = useEnvironmentStore()
  const { activePanel, openPanel, closePanel, togglePalette } = useUiStore()
  const themeClass = useThemeClass()

  const isEnvironmentPanelOpen = activePanel === 'environments'
  const isCollectionsPanelOpen = activePanel === 'collections'
  const isSettingsPanelOpen = activePanel === 'settings'
  const isCurlImportOpen = activePanel === 'curl-import'
  const isCollectionRunnerOpen = activePanel === 'runner'

  const panelOpenChange = (panel: Parameters<typeof openPanel>[0]) => (open: boolean) =>
    open ? openPanel(panel) : closePanel()

  const handleCurlImport = useCallback((parsed: ParsedCurlRequest) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name: getRequestNameFromUrl(parsed.url),
      method: parsed.method,
      url: parsed.url,
      rawUrl: parsed.rawUrl,
      params: parsed.params,
      headers: parsed.headers,
      body: parsed.body,
      contentType: parsed.contentType,
      response: null,
      loading: false,
      auth: parsed.auth,
      cookies: parsed.cookies,
      testScripts: [],
      preRequestScripts: [],
      testAssertions: [],
      testResults: null,
      extractionRules: [],
      formDataEntries: parsed.formDataEntries,
    }
    onRequestSelect(newTab)
  }, [onRequestSelect])

  // Keyboard shortcut: Ctrl+I to open cURL import
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault()
        openPanel('curl-import')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openPanel])

  const showTooltips =
    !isEnvironmentPanelOpen &&
    !isCollectionsPanelOpen &&
    !isSettingsPanelOpen &&
    !isCurlImportOpen &&
    !isCollectionRunnerOpen

  const renderTooltip = (content: string, children: React.ReactNode) => {
    if (!showTooltips) return children
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent>
      <div data-tauri-drag-region className="relative h-11 flex justify-between items-center bg-background/95 border-b border-border/30">
        {/* Subtle gradient accent line at the very top */}
        <div className="absolute top-0 left-0 right-0 gradient-line opacity-40" />

        <div data-tauri-drag-region className="flex-1 px-3 flex items-center gap-2.5">
          <div className="relative">
            <img src={icon} alt="LitePost" className="h-6 w-6 rounded-lg shadow-sm" />
            <div className="absolute -inset-0.5 rounded-lg bg-primary/10 blur-sm -z-10" />
          </div>
          <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">LitePost</span>
        </div>
        <div className="flex items-center gap-2 px-2">
          {renderTooltip("Search everything (Ctrl+K)",
            <button
              type="button"
              onClick={togglePalette}
              aria-label="Open command palette"
              className="h-8 flex items-center gap-2 px-3 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="text-[10px] font-mono leading-none text-muted-foreground/70 bg-background/40 border border-border/40 rounded px-1 py-0.5">Ctrl K</kbd>
            </button>
          )}

          {renderTooltip("Switch environment",
            <div>
              <Select
                value={activeEnvironmentId || "null"}
                onValueChange={(value) => setActiveEnvironment(value === "null" ? null : value)}
              >
                <SelectTrigger className="w-[170px] h-8 text-xs rounded-lg bg-secondary/30 border-border/30 hover:bg-secondary/50 transition-colors">
                  <SelectValue placeholder="No environment" />
                </SelectTrigger>
                <SelectContent className={`${themeClass} bg-popover border-border/40 backdrop-blur-xl shadow-xl`}>
                  <SelectItem value="null" className="hover:bg-accent/15 focus:bg-accent/15 text-foreground">None</SelectItem>
                  {environments.map((env) => (
                    <SelectItem
                      key={env.id}
                      value={env.id}
                      className="hover:bg-accent/15 focus:bg-accent/15 text-foreground"
                    >
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="h-8 flex items-center rounded-lg bg-secondary/30 border border-border/30 overflow-hidden">
            {renderTooltip("Import cURL (Ctrl+I)",
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none hover:bg-primary/15 hover:text-primary"
                aria-label="Import cURL"
                onClick={() => openPanel('curl-import')}
              >
                <Terminal className="h-3.5 w-3.5" />
              </Button>
            )}
            {renderTooltip("Collection Runner",
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none hover:bg-primary/15 hover:text-primary"
                aria-label="Run Collection"
                onClick={() => openPanel('runner')}
              >
                <Zap className="h-3.5 w-3.5" />
              </Button>
            )}
            <div className="w-px h-4 bg-border/40" />
            {renderTooltip("Collections",
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none hover:bg-primary/15 hover:text-primary"
                aria-label="Collections"
                onClick={() => openPanel('collections')}
              >
                <Folder className="h-3.5 w-3.5" />
              </Button>
            )}
            {renderTooltip("Manage environments",
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none hover:bg-primary/15 hover:text-primary"
                aria-label="Environments"
                onClick={() => openPanel('environments')}
              >
                <Beaker className="h-3.5 w-3.5" />
              </Button>
            )}
            {renderTooltip("Settings",
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none hover:bg-primary/15 hover:text-primary"
                aria-label="Settings"
                onClick={() => openPanel('settings')}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {appWindow && (
            <>
              <div className="w-px h-5 bg-border/30 mx-0.5" />

              {renderTooltip("Minimize",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Minimize"
                  className="h-9 w-9 rounded-md hover:bg-muted/60"
                  onClick={() => appWindow.minimize()}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
              )}

              {renderTooltip("Maximize",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Maximize"
                  className="h-9 w-9 rounded-md hover:bg-muted/60"
                  onClick={() => appWindow.toggleMaximize()}
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}

              {renderTooltip("Close",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  className="h-9 w-9 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  onClick={() => appWindow.close()}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {isEnvironmentPanelOpen && (
        <Suspense fallback={null}>
          <EnvironmentPanel
            open={isEnvironmentPanelOpen}
            onOpenChange={panelOpenChange('environments')}
          />
        </Suspense>
      )}
      {isSettingsPanelOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
            open={isSettingsPanelOpen}
            onOpenChange={panelOpenChange('settings')}
          />
        </Suspense>
      )}
      {isCollectionsPanelOpen && (
        <Suspense fallback={null}>
          <CollectionsPanel
            open={isCollectionsPanelOpen}
            onOpenChange={panelOpenChange('collections')}
            currentRequest={currentRequest}
            onRequestSelect={onRequestSelect}
          />
        </Suspense>
      )}
      {isCurlImportOpen && (
        <Suspense fallback={null}>
          <CurlImportModal
            open={isCurlImportOpen}
            onOpenChange={panelOpenChange('curl-import')}
            onImport={handleCurlImport}
          />
        </Suspense>
      )}
      {isCollectionRunnerOpen && (
        <Suspense fallback={null}>
          <CollectionRunner
            open={isCollectionRunnerOpen}
            onOpenChange={panelOpenChange('runner')}
          />
        </Suspense>
      )}
    </TooltipProvider>
  )
}
