import { useState, useEffect } from 'react'
import { BaseDirectory, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { HistoryItem } from '@/types'

const HISTORY_FILE = 'history.json'

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      // Ensure the app data directory exists
      try {
        await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
      } catch (e) {
        // Directory might already exist, ignore error
      }

      const contents = await readFile(HISTORY_FILE, { baseDir: BaseDirectory.AppData })
      const loadedHistory = JSON.parse(new TextDecoder().decode(contents))
      // Convert ISO strings back to Date objects
      setHistory(loadedHistory.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })))
    } catch (error) {
      // File doesn't exist yet or other error, start with fresh history
      console.log('No history file found, starting fresh')
      setHistory([])
    }
  }

  const saveHistory = async (newHistory: HistoryItem[]) => {
    try {
      const data = new TextEncoder().encode(JSON.stringify(newHistory, null, 2))
      await writeFile(
        HISTORY_FILE,
        data,
        { baseDir: BaseDirectory.AppData }
      )
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  const addHistoryItem = async (item: HistoryItem) => {
    const newHistory = [item, ...history]
    setHistory(newHistory)
    await saveHistory(newHistory)
  }

  const removeHistoryItem = async (timestamp: Date) => {
    const newHistory = history.filter(item => item.timestamp.getTime() !== timestamp.getTime())
    setHistory(newHistory)
    await saveHistory(newHistory)
  }

  const clearHistory = async () => {
    setHistory([])
    await saveHistory([])
  }

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory
  }
} 