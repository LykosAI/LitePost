import { useState, useEffect } from 'react'
import { Tab, AuthConfig } from '@/types'
import { getRequestNameFromUrl } from '@/utils/url'

const DEFAULT_HEADERS = [
  { key: "Accept", value: "application/json", enabled: true },
  { key: "User-Agent", value: "LitePost/0.1.0", enabled: true },
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
  const [nextId, setNextId] = useState(1)

  // Initialize with one tab
  useEffect(() => {
    if (tabs.length === 0) {
      const initialTab = createNewTab()
      setTabs([initialTab])
      setActiveTab(initialTab.id)
    }
  }, [])

  const generateUniqueId = () => {
    const id = String(nextId)
    setNextId(prev => prev + 1)
    return id
  }

  const createNewTab = (overrides: Partial<Tab> = {}): Tab => {
    const id = generateUniqueId()
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
      testAssertions: [],
      testResults: null,
      ...overrides
    }
  }

  const addTab = () => {
    const newTab = createNewTab()
    setTabs(prev => [...prev, newTab])
    setActiveTab(newTab.id)
  }

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)
      if (newTabs.length === 0) {
        const newTab = createNewTab()
        setActiveTab(newTab.id)
        return [newTab]
      }
      if (tabId === activeTab) {
        const index = prev.findIndex(t => t.id === tabId)
        const newActiveIndex = Math.max(0, index - 1)
        setActiveTab(newTabs[newActiveIndex].id)
      }
      return newTabs
    })
  }

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(current => {
      const tabIndex = current.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return current

      const newTabs = [...current]
      newTabs[tabIndex] = { ...newTabs[tabIndex], ...updates }
      return newTabs
    })
  }

  const startEditing = (tabId: string) => {
    updateTab(tabId, { isEditing: true })
  }

  const stopEditing = (tabId: string, newName: string) => {
    updateTab(tabId, { 
      isEditing: false,
      name: newName.trim() || getRequestNameFromUrl(tabs.find(t => t.id === tabId)?.rawUrl || "") || "New Request"
    })
  }

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