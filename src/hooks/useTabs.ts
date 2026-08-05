import { useState, useEffect, useCallback, useRef } from 'react'
import { Tab, AuthConfig } from '@/types'
import { getRequestNameFromUrl } from '@/utils/url'

const DEFAULT_HEADERS = [
  { key: "Accept", value: "application/json", enabled: true },
  { key: "User-Agent", value: "LitePost/0.3.1", enabled: true },
  { key: "Accept-Language", value: "en-US,en;q=0.9", enabled: true },
  { key: "Cache-Control", value: "no-cache", enabled: false },
  { key: "Content-Type", value: "application/json", enabled: false }
]

const DEFAULT_AUTH: AuthConfig = {
  type: 'none',
  addTo: 'header'
}

export function useTabs() {
  const [activeTab, setActiveTab] = useState<string>("")
  const [tabs, setTabs] = useState<Tab[]>([])
  // Ref instead of state so createNewTab/addTab stay referentially stable —
  // these callbacks feed memoized children and must not change per render.
  const nextIdRef = useRef(1)

  const createNewTab = useCallback((overrides: Partial<Tab> = {}): Tab => {
    const id = String(nextIdRef.current++)
    return {
      id,
      name: "New Request",
      method: "GET",
      url: "",
      rawUrl: "",
      params: [],
      headers: [...DEFAULT_HEADERS],
      body: "",
      contentType: "application/json",
      response: null,
      loading: false,
      auth: { ...DEFAULT_AUTH },
      cookies: [],
      testScripts: [],
      preRequestScripts: [],
      testAssertions: [],
      testResults: null,
      extractionRules: [],
      ...overrides
    }
  }, [])

  // Initialize with one tab. Depending on tabs.length rather than running
  // mount-only also makes this self-healing: if the list is ever emptied, a
  // fresh tab reappears. createNewTab is stable, so this cannot loop.
  useEffect(() => {
    if (tabs.length === 0) {
      const initialTab = createNewTab()
      setTabs([initialTab])
      setActiveTab(initialTab.id)
    }
  }, [createNewTab, tabs.length])

  const addTab = useCallback(() => {
    const newTab = createNewTab()
    setTabs(prev => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [createNewTab])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)
      if (newTabs.length === 0) {
        const newTab = createNewTab()
        setActiveTab(newTab.id)
        return [newTab]
      }
      setActiveTab(currentActive => {
        if (tabId !== currentActive) return currentActive
        const index = prev.findIndex(t => t.id === tabId)
        const newActiveIndex = Math.max(0, index - 1)
        return newTabs[newActiveIndex].id
      })
      return newTabs
    })
  }, [createNewTab])

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(current => {
      const tabIndex = current.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return current

      const newTabs = [...current]
      newTabs[tabIndex] = { ...newTabs[tabIndex], ...updates }
      return newTabs
    })
  }, [])

  const startEditing = useCallback((tabId: string) => {
    updateTab(tabId, { isEditing: true })
  }, [updateTab])

  const stopEditing = useCallback((tabId: string, newName: string) => {
    setTabs(current => {
      const tabIndex = current.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return current

      const tab = current[tabIndex]
      const newTabs = [...current]
      newTabs[tabIndex] = {
        ...tab,
        isEditing: false,
        name: newName.trim() || getRequestNameFromUrl(tab.rawUrl || "") || "New Request"
      }
      return newTabs
    })
  }, [])

  const currentTab = tabs.find(t => t.id === activeTab)

  return {
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
  }
} 
