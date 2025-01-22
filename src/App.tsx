import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
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

function App() {
  const { history, addHistoryItem } = useHistory()
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
  })

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
      name: item.url.split('/').pop() || "New Request",
      method: item.method,
      url: item.url,
      rawUrl: item.url,
    })
    setTabs((prev: Tab[]) => [...prev, newTab])
    setActiveTab(newTab.id)
  }

  return (
    <div className="dark h-screen overflow-hidden">
      <div className="h-full flex flex-col bg-background text-foreground">
        <TitleBar />
        <div className="flex-1 flex min-h-0">
          <div className="p-4 border-r border-border">
            <HistoryPanel history={history} onSelect={handleHistorySelect} />
          </div>
          <div className="flex-1 p-4">
            <div className="h-full flex flex-col gap-4">
              <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddTab={addTab}
                onCloseTab={closeTab}
                onStartEditing={startEditing}
                onStopEditing={stopEditing}
              />

              {currentTab && (
                <>
                  <RequestPanel
                    method={currentTab.method}
                    url={currentTab.rawUrl}
                    params={currentTab.params}
                    headers={currentTab.headers}
                    loading={currentTab.loading}
                    body={currentTab.body}
                    contentType={currentTab.contentType}
                    onMethodChange={(method) => updateTab(currentTab.id, { method })}
                    onUrlChange={(url) => updateTab(currentTab.id, { rawUrl: url })}
                    onParamsChange={(params) => updateTab(currentTab.id, { params })}
                    onHeadersChange={(headers) => updateTab(currentTab.id, { headers })}
                    onBodyChange={(body) => updateTab(currentTab.id, { body })}
                    onContentTypeChange={(contentType) => updateTab(currentTab.id, { contentType })}
                    onSend={() => handleSend(currentTab.id)}
                  />

                  <Separator />

                  <ResponsePanel response={currentTab.response} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
