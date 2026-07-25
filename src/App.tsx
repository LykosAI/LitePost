import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { TitleBar } from "./components/Titlebar"
import { TabBar } from "./components/TabBar"
import { useTabs } from "./hooks/useTabs"
import { useUrlParams } from "./hooks/useUrlParams"
import { useRequest } from "./hooks/useRequest"
import { useHistory } from "./hooks/useHistory"
import { useThemeClass } from "./hooks/useThemeClass"
import { HistoryItem, SavedRequest, Tab } from "./types"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Toaster } from "sonner"
import { buildQueryString, getRequestNameFromUrl, replaceUrlQuery } from "./utils/url"
import { CommandPalette } from "./components/CommandPalette"
import { History } from "lucide-react"
import { useUiStore } from "./store/ui"
// Prefetch lazy panel chunks immediately so they load in parallel with App rendering
const historyPanelPromise = import("./components/HistoryPanel")
const requestPanelPromise = import("./components/RequestPanel")
const responsePanelPromise = import("./components/ResponsePanel")

const UpdateChecker = lazy(async () => {
  const module = await import("./components/UpdateChecker")
  return { default: module.UpdateChecker }
})

const HistoryPanel = lazy(async () => {
  const module = await historyPanelPromise
  return { default: module.HistoryPanel }
})

const RequestPanel = lazy(async () => {
  const module = await requestPanelPromise
  return { default: module.RequestPanel }
})

const ResponsePanel = lazy(async () => {
  const module = await responsePanelPromise
  return { default: module.ResponsePanel }
})

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center rounded-xl border border-border/30 bg-card/40 text-xs text-muted-foreground/70">
      {label}
    </div>
  )
}

const HISTORY_COLLAPSED_KEY = "litepost:historyCollapsed"

function App() {
  const [enableUpdateChecker, setEnableUpdateChecker] = useState(false)
  const { paletteOpen, setPaletteOpen, togglePalette } = useUiStore()
  const [historyCollapsed, setHistoryCollapsed] = useState(() => {
    try {
      return localStorage.getItem(HISTORY_COLLAPSED_KEY) === "1"
    } catch {
      return false
    }
  })
  const { history, addHistoryItem, removeHistoryItem, clearHistory } = useHistory()
  const themeClass = useThemeClass()
  const {
    tabs,
    activeTab,
    currentTab,
    setActiveTab,
    addTab,
    closeTab,
    updateTab,
    startEditing,
    stopEditing,
    createNewTab,
    setTabs
  } = useTabs()

  const { sendRequest } = useRequest((historyItem) => {
    addHistoryItem(historyItem)
  })

  useUrlParams(currentTab?.rawUrl || "", (params) => {
    if (currentTab) {
      updateTab(currentTab.id, { params })
    }
  }, currentTab?.params)

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnableUpdateChecker(true)
    }, 5_000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // Ctrl/Cmd+K opens the command palette from anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [togglePalette])

  // Mirror the theme class onto <html> so portaled content (tooltips, menus,
  // dialogs) inherits theme tokens instead of falling back to :root defaults.
  useEffect(() => {
    const root = document.documentElement
    const classes = themeClass.split(" ").filter(Boolean)
    root.classList.remove("dark", "schematic", "theme-amber", "theme-green", "theme-black", "theme-purple")
    root.classList.add(...classes)
  }, [themeClass])

  const toggleHistoryCollapsed = useCallback(() => {
    setHistoryCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(HISTORY_COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        // localStorage unavailable — collapse state just won't persist
      }
      return next
    })
  }, [])

  // Update raw URL when params change without affecting user input
  useEffect(() => {
    if (!currentTab) return

    try {
      const enabledParams = currentTab.params.filter(p => p.enabled && p.key)

      const queryString = buildQueryString(enabledParams)
      const nextRawUrl = replaceUrlQuery(currentTab.rawUrl, queryString)
      if (nextRawUrl !== currentTab.rawUrl) {
        updateTab(currentTab.id, { rawUrl: nextRawUrl })
      }
    } catch (error) {
      console.error('Error updating URL with params:', error)
    }
  }, [currentTab?.params])

  const handleSend = async (tabId: string, overrides: { body?: string; url?: string } = {}) => {
    const tab = tabs.find(t => t.id === tabId)
    const requestUrl = overrides.url ?? tab?.rawUrl
    if (!tab || !requestUrl?.trim()) return

    const requestTab = {
      ...tab,
      ...(overrides.body === undefined ? {} : { body: overrides.body }),
      ...(overrides.url === undefined ? {} : {
        rawUrl: overrides.url,
        url: overrides.url,
        name: getRequestNameFromUrl(overrides.url),
      }),
    }
    updateTab(tabId, {
      loading: true,
      response: null,
      ...(overrides.body === undefined ? {} : { body: overrides.body }),
      ...(overrides.url === undefined ? {} : {
        rawUrl: overrides.url,
        url: overrides.url,
        name: getRequestNameFromUrl(overrides.url),
      }),
    })
    const response = await sendRequest(requestTab)
    updateTab(tabId, { loading: false, response: response || null })
  }

  // Stable identity: HistoryPanel is memoized and re-renders whenever this changes.
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    const newTab = createNewTab({
      name: getRequestNameFromUrl(item.url),
      method: item.method,
      url: item.url,
      rawUrl: item.rawUrl,
      params: item.params,
      headers: item.headers,
      body: item.body,
      contentType: item.contentType,
      auth: item.auth,
      formDataEntries: item.formDataEntries,
      preRequestScripts: item.preRequestScripts,
    })
    setTabs((prev: Tab[]) => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [createNewTab, setTabs, setActiveTab])

  // Ref mirror so stable callbacks (passed to memoized panels) can read the
  // current tab without being recreated on every tab change.
  const currentTabRef = useRef(currentTab)
  currentTabRef.current = currentTab

  const handleSampleSelect = useCallback((sample: Partial<Tab>) => {
    const target = currentTabRef.current
    const isPristine = target && !target.rawUrl.trim() && !target.body.trim() && !target.response
    if (target && isPristine) {
      updateTab(target.id, sample)
      return
    }
    const newTab = createNewTab(sample)
    setTabs((prev: Tab[]) => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [updateTab, createNewTab, setTabs, setActiveTab])

  const handleSavedSelect = useCallback((request: SavedRequest) => {
    const newTab = createNewTab({
      name: request.name || getRequestNameFromUrl(request.url),
      method: request.method,
      url: request.url,
      rawUrl: request.rawUrl,
      params: request.params,
      headers: request.headers,
      body: request.body,
      contentType: request.contentType,
      auth: request.auth,
      cookies: request.cookies,
      testScripts: request.testScripts,
      preRequestScripts: request.preRequestScripts,
      testAssertions: request.testAssertions,
      extractionRules: request.extractionRules,
      graphqlQuery: request.graphqlQuery,
      graphqlVariables: request.graphqlVariables,
      graphqlOperationName: request.graphqlOperationName,
      isGraphQL: request.isGraphQL,
      formDataEntries: request.formDataEntries,
      networkConfig: request.networkConfig,
    })
    setTabs((prev: Tab[]) => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [createNewTab, setTabs, setActiveTab])

  return (
    <div className={`${themeClass} h-screen overflow-hidden`}>
      <Toaster
        theme={themeClass.includes("dark") ? "dark" : "light"}
        position="bottom-right"
        toastOptions={{
          className: 'bg-card border-border/40 text-foreground shadow-xl backdrop-blur-xl',
        }}
      />
      <div className="h-full flex flex-col bg-background text-foreground min-w-0">
        <TitleBar
          currentRequest={currentTab}
          onRequestSelect={(request) => {
            setTabs((prev: Tab[]) => [...prev, request])
            setActiveTab(request.id)
          }}
        />
        <div className="flex-1 min-h-0 min-w-0 flex">
          {historyCollapsed && (
            <div className="shrink-0 p-3 pr-0">
              <button
                type="button"
                onClick={toggleHistoryCollapsed}
                title="Show history"
                aria-label="Show history"
                className="h-full w-10 flex flex-col items-center pt-3 gap-2 rounded-xl border border-border/20 bg-card/40 text-muted-foreground/60 hover:text-primary hover:border-border/50 transition-colors"
              >
                <History className="h-4 w-4" />
              </button>
            </div>
          )}
          <PanelGroup direction="horizontal" className="flex-1 min-w-0">
            {!historyCollapsed && (
              <>
                <Panel id="history" order={1} defaultSize={20} minSize={15}>
                  <div className="h-full p-3 pr-0">
                    <Suspense fallback={<PanelFallback label="Loading history..." />}>
                      <HistoryPanel
                        history={history}
                        onSelect={handleHistorySelect}
                        onRemove={removeHistoryItem}
                        onClear={clearHistory}
                        onCollapse={toggleHistoryCollapsed}
                      />
                    </Suspense>
                  </div>
                </Panel>
                <PanelResizeHandle className="w-1 mx-0.5 rounded-full bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors cursor-col-resize" />
              </>
            )}
            <Panel id="main" order={2} minSize={50}>
              <div className="h-full p-3 pl-0 flex flex-col gap-3 min-w-0">
                <div className="min-w-0">
                  <TabBar
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onAddTab={addTab}
                    onCloseTab={closeTab}
                    onStartEditing={startEditing}
                    onStopEditing={stopEditing}
                  />
                </div>

                {currentTab && (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <div className="shrink-0">
                      <Suspense fallback={<PanelFallback label="Loading request panel..." />}>
                        <RequestPanel
                          method={currentTab.method}
                          url={currentTab.rawUrl}
                          loading={currentTab.loading}
                          params={currentTab.params}
                          headers={currentTab.headers}
                          body={currentTab.body}
                          contentType={currentTab.contentType}
                          auth={currentTab.auth}
                          cookies={currentTab.cookies}
                          response={currentTab.response}
                          testScripts={currentTab.testScripts}
                          preRequestScripts={currentTab.preRequestScripts}
                          testAssertions={currentTab.testAssertions}
                          testResults={currentTab.testResults}
                          extractionRules={currentTab.extractionRules}
                          onMethodChange={(method) => updateTab(currentTab.id, { method })}
                          onUrlChange={(rawUrl) => {
                            updateTab(currentTab.id, {
                              rawUrl,
                              url: rawUrl,
                              name: getRequestNameFromUrl(rawUrl)
                            })
                          }}
                          onParamsChange={(params) => updateTab(currentTab.id, { params })}
                          onHeadersChange={(headers) => updateTab(currentTab.id, { headers })}
                          onBodyChange={(body) => updateTab(currentTab.id, { body })}
                          onContentTypeChange={(contentType) => updateTab(currentTab.id, { contentType })}
                          onAuthChange={(auth) => updateTab(currentTab.id, { auth })}
                          onCookiesChange={(cookies) => updateTab(currentTab.id, { cookies })}
                          onTestScriptsChange={(testScripts) => updateTab(currentTab.id, { testScripts })}
                          onPreRequestScriptsChange={(preRequestScripts) => updateTab(currentTab.id, { preRequestScripts })}
                          onTestAssertionsChange={(testAssertions) => updateTab(currentTab.id, { testAssertions })}
                          onTestResultsChange={(testResults) => updateTab(currentTab.id, { testResults })}
                          onStreamingStateChange={(streaming, cancelStream) =>
                            updateTab(currentTab.id, {
                              streaming,
                              cancelStream: cancelStream || undefined,
                            })
                          }
                          onSend={(overrides) => handleSend(currentTab.id, overrides)}
                          isGraphQL={currentTab.isGraphQL}
                          graphqlQuery={currentTab.graphqlQuery}
                          graphqlVariables={currentTab.graphqlVariables}
                          graphqlOperationName={currentTab.graphqlOperationName}
                          onGraphQLChange={(updates) => updateTab(currentTab.id, updates)}
                          formDataEntries={currentTab.formDataEntries}
                          onFormDataEntriesChange={(entries) => updateTab(currentTab.id, { formDataEntries: entries })}
                          networkConfig={currentTab.networkConfig}
                          onNetworkConfigChange={(networkConfig) => updateTab(currentTab.id, { networkConfig })}
                        />
                      </Suspense>
                    </div>
                    <div className="flex-1 min-h-0">
                      <Suspense fallback={<PanelFallback label="Loading response panel..." />}>
                        <ResponsePanel
                          response={currentTab.response}
                          streamingResponse={currentTab.streaming}
                          onCancelStream={currentTab.cancelStream}
                          extractionRules={currentTab.extractionRules}
                          onExtractionRulesChange={(extractionRules) => updateTab(currentTab.id, { extractionRules })}
                          onLoadSample={handleSampleSelect}
                        />
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          history={history}
          onSelectHistory={handleHistorySelect}
          onSelectSaved={handleSavedSelect}
          onNewTab={addTab}
          onToggleHistory={toggleHistoryCollapsed}
        />
        {enableUpdateChecker && (
          <Suspense fallback={null}>
            <UpdateChecker />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default App
