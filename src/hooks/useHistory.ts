import { useState, useEffect, useCallback, useRef } from 'react'
import { HistoryItem } from '@/types'
import { loadFromFile, saveToFile } from '@/utils/persistence'

const HISTORY_FILE = 'history.json'
// Unbounded history makes startup and every re-render slower forever; cap it.
const MAX_HISTORY_ITEMS = 300

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  // Mirror of `history` so the mutation callbacks can stay referentially stable
  // (they feed memoized components; recreating them defeats the memo).
  const historyRef = useRef<HistoryItem[]>([])

  const applyHistory = useCallback((newHistory: HistoryItem[]) => {
    historyRef.current = newHistory
    setHistory(newHistory)
  }, [])

  // Declared before the effect that lists it as a dependency: a dep array is
  // evaluated during render, so referencing a `const` defined below would hit
  // the temporal dead zone. Stable via applyHistory, so the effect runs once.
  const loadHistory = useCallback(async () => {
    try {
      const loadedHistory = await loadFromFile<any[]>(HISTORY_FILE, [])
      // Convert ISO strings back to Date objects
      applyHistory(loadedHistory.slice(0, MAX_HISTORY_ITEMS).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })))
    } catch (error) {
      // File doesn't exist yet or other error, start with fresh history
      console.log('No history file found, starting fresh')
      applyHistory([])
    }
  }, [applyHistory])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const saveHistory = async (newHistory: HistoryItem[]) => {
    try {
      await saveToFile(HISTORY_FILE, newHistory)
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  const addHistoryItem = useCallback(async (item: HistoryItem) => {
    const newHistory = [item, ...historyRef.current].slice(0, MAX_HISTORY_ITEMS)
    applyHistory(newHistory)
    await saveHistory(newHistory)
  }, [applyHistory])

  const removeHistoryItem = useCallback(async (timestamp: Date) => {
    const newHistory = historyRef.current.filter(item => item.timestamp.getTime() !== timestamp.getTime())
    applyHistory(newHistory)
    await saveHistory(newHistory)
  }, [applyHistory])

  const clearHistory = useCallback(async () => {
    applyHistory([])
    await saveHistory([])
  }, [applyHistory])

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory
  }
} 
