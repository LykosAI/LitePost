import { useState, useEffect, useCallback, useRef } from 'react'
import { Tab, AuthConfig } from '@/types'
import { getRequestNameFromUrl } from '@/utils/url'

const DEFAULT_HEADERS = [
  { key: "Accept", value: "application/json", enabled: true },
  { key: "User-Agent", value: "LitePost/0.5.0", enabled: true },
  { key: "Accept-Language", value: "en-US,en;q=0.9", enabled: true },
  { key: "Cache-Control", value: "no-cache", enabled: false },
  { key: "Content-Type", value: "application/json", enabled: false }
]

const DEFAULT_AUTH: AuthConfig = {
  type: 'none',
  addTo: 'header'
}

const TABS_STORAGE_KEY = 'litepost:tabs'

/**
 * Restore open tabs from a previous session. Responses, loading flags, and
 * in-flight streaming state are transient and were never persisted, so a
 * restored tab comes back as its request definition only.
 */
function loadPersistedTabs(): { tabs: Tab[]; activeTab: string } | null {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { tabs?: Partial<Tab>[]; activeTab?: string }
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return null

    const tabs = data.tabs
      .filter((tab): tab is Partial<Tab> & { id: string } => typeof tab?.id === 'string')
      .map((tab): Tab => ({
        name: "New Request",
        method: "GET",
        url: "",
        rawUrl: "",
        params: [],
        headers: [...DEFAULT_HEADERS],
        body: "",
        contentType: "application/json",
        auth: { ...DEFAULT_AUTH },
        cookies: [],
        testScripts: [],
        preRequestScripts: [],
        testAssertions: [],
        testResults: null,
        extractionRules: [],
        ...tab,
        id: tab.id,
        response: null,
        loading: false,
        isEditing: false,
      }))
    if (tabs.length === 0) return null

    const activeTab = tabs.some((tab) => tab.id === data.activeTab)
      ? data.activeTab as string
      : tabs[0].id
    return { tabs, activeTab }
  } catch {
    return null
  }
}

function persistTabs(tabs: Tab[], activeTab: string): void {
  try {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify({
      activeTab,
      tabs: tabs.map((tab) => {
        const {
          response: _response,
          loading: _loading,
          isEditing: _isEditing,
          streaming: _streaming,
          cancelStream: _cancelStream,
          testResults: _testResults,
          ...rest
        } = tab
        return rest
      }),
    }))
  } catch {
    // persistence is best-effort
  }
}

export function useTabs() {
  const [persisted] = useState(loadPersistedTabs)
  const [activeTab, setActiveTab] = useState<string>(persisted?.activeTab ?? "")
  const [tabs, setTabs] = useState<Tab[]>(persisted?.tabs ?? [])
  // Ref instead of state so createNewTab/addTab stay referentially stable —
  // these callbacks feed memoized children and must not change per render.
  const nextIdRef = useRef(
    (persisted?.tabs ?? []).reduce((max, tab) => {
      const id = Number(tab.id)
      return Number.isFinite(id) && id >= max ? id + 1 : max
    }, 1)
  )

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

  // Persist open tabs (request definitions only — responses can be megabytes
  // and are transient anyway). Debounced: tabs change on every URL keystroke.
  useEffect(() => {
    const timer = setTimeout(() => persistTabs(tabs, activeTab), 400)
    return () => clearTimeout(timer)
  }, [tabs, activeTab])

  // Ref mirrors so the flush listener below stays subscribed once.
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // Closing the window inside the debounce interval must not lose the last
  // edit — flush synchronously when the page is being torn down.
  useEffect(() => {
    const flush = () => persistTabs(tabsRef.current, activeTabRef.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

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

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prev => {
      const kept = prev.filter(t => t.id === tabId)
      if (kept.length === 0) return prev
      setActiveTab(tabId)
      return kept
    })
  }, [])

  const closeTabsToRight = useCallback((tabId: string) => {
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === tabId)
      if (index === -1 || index === prev.length - 1) return prev
      const kept = prev.slice(0, index + 1)
      setActiveTab(currentActive =>
        kept.some(t => t.id === currentActive) ? currentActive : tabId
      )
      return kept
    })
  }, [])

  const duplicateTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === tabId)
      if (index === -1) return prev
      // Drop the id so the override spread cannot clobber the fresh one.
      const { id: _id, ...source } = prev[index]
      const duplicated = createNewTab({
        ...source,
        response: null,
        loading: false,
        isEditing: false,
        streaming: null,
        cancelStream: undefined,
        testResults: null,
      })
      setActiveTab(duplicated.id)
      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]
    })
  }, [createNewTab])

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(current => {
      const tabIndex = current.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return current

      // Bail out when nothing actually changed. Callers fire from effects on
      // every render (e.g. streaming-state sync); returning a fresh array for
      // a no-op update turns those into an infinite render loop.
      const tab = current[tabIndex]
      const changed = (Object.keys(updates) as (keyof Tab)[])
        .some((key) => !Object.is(tab[key], updates[key]))
      if (!changed) return current

      const newTabs = [...current]
      newTabs[tabIndex] = { ...tab, ...updates }
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
      const trimmed = newName.trim()
      const newTabs = [...current]
      newTabs[tabIndex] = {
        ...tab,
        isEditing: false,
        name: trimmed || getRequestNameFromUrl(tab.rawUrl || "") || "New Request",
        // A hand-typed name sticks; clearing it hands naming back to the URL.
        nameEdited: trimmed ? true : false,
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
    closeOtherTabs,
    closeTabsToRight,
    duplicateTab,
    updateTab,
    startEditing,
    stopEditing,
    createNewTab,
    setTabs
  }
}
