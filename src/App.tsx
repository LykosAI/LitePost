import { useEffect } from "react"
import { RequestPanel } from "./components/RequestPanel"
import { ResponsePanel } from "./components/ResponsePanel"
import { TitleBar } from "./components/Titlebar"
import { HistoryPanel } from "./components/HistoryPanel"
import { TabBar } from "./components/TabBar"
import { useTabs } from "./hooks/useTabs"
import { useUrlParams } from "./hooks/useUrlParams"
import { useRequest } from "./hooks/useRequest"
import { useHistory } from "./hooks/useHistory"
import { HistoryItem, Tab } from "./types"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { Toaster } from "sonner"
import { getRequestNameFromUrl } from "./utils/url"
import { UpdateChecker } from './components/UpdateChecker'

function App() {
  const { history, addHistoryItem, removeHistoryItem, clearHistory } = useHistory()
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

  // Update raw URL when params change without affecting user input
  useEffect(() => {
    if (!currentTab) return

    try {
      const urlParts = currentTab.rawUrl.split('?')
      const baseUrl = urlParts[0]
      const enabledParams = currentTab.params.filter(p => p.enabled && p.key)
      
      if (enabledParams.length === 0) {
        // Only update URL if we have no params and there's a query string
        if (urlParts.length > 1) {
          updateTab(currentTab.id, { rawUrl: baseUrl })
        }
        return
      }

      const searchParams = new URLSearchParams()
      enabledParams.forEach(param => {
        searchParams.append(param.key, param.value)
      })

      const queryString = searchParams.toString()
      if (queryString) {
        updateTab(currentTab.id, { rawUrl: `${baseUrl}?${queryString}` })
      }
    } catch (error) {
      console.error('Error updating URL with params:', error)
    }
  }, [currentTab?.params])

  const handleSend = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    updateTab(tabId, { loading: true, response: null })
    const response = await sendRequest(tab)
    if (response) {
      updateTab(tabId, { loading: false, response })
    }
  }

  const handleHistorySelect = (item: HistoryItem) => {
    const newTab = createNewTab({
      name: getRequestNameFromUrl(item.url),
      method: item.method,
      url: item.url,
      rawUrl: item.rawUrl,
      params: item.params,
      headers: item.headers,
      body: item.body,
      contentType: item.contentType,
      auth: item.auth
    })
    setTabs((prev: Tab[]) => [...prev, newTab])
    setActiveTab(newTab.id)
  }

  return (
    <div className="dark h-screen overflow-hidden">
      <Toaster theme="dark" position="bottom-right" />
      <div className="h-full flex flex-col bg-background text-foreground min-w-0">
        <TitleBar 
          currentRequest={currentTab} 
          onRequestSelect={(request) => {
            setTabs((prev: Tab[]) => [...prev, request])
            setActiveTab(request.id)
          }}
        />
        <div className="flex-1 min-h-0 min-w-0">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={20} minSize={15}>
              <div className="h-full p-4">
                <HistoryPanel 
                  history={history} 
                  onSelect={handleHistorySelect} 
                  onRemove={removeHistoryItem}
                  onClear={clearHistory}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-border hover:bg-accent transition-colors cursor-col-resize" />
            <Panel minSize={50}>
              <div className="h-full p-4 flex flex-col gap-4 min-w-0">
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
                  <PanelGroup direction="vertical">
                    <Panel>
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
                        testAssertions={currentTab.testAssertions}
                        testResults={currentTab.testResults}
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
                        onTestAssertionsChange={(testAssertions) => updateTab(currentTab.id, { testAssertions })}
                        onTestResultsChange={(testResults) => updateTab(currentTab.id, { testResults })}
                        onSend={() => handleSend(currentTab.id)}
                      />
                    </Panel>
                    <PanelResizeHandle className="h-1.5 bg-border hover:bg-accent transition-colors cursor-row-resize" />
                    <Panel>
                      <ResponsePanel response={currentTab.response} />
                    </Panel>
                  </PanelGroup>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>
        <UpdateChecker />
      </div>
    </div>
  )
}

export default App
