import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadFromFile, saveToFile } from '@/utils/persistence'

export type ThemeColor = 'blue' | 'green' | 'black' | 'purple'

interface ThemeState {
  color: ThemeColor
  setColor: (newColor: ThemeColor) => Promise<void>
}

const THEME_FILE = 'theme.json'
const DEFAULT_THEME: ThemeColor = 'blue'

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      color: DEFAULT_THEME,
      setColor: async (newColor) => {
        set({ color: newColor })
        await saveToFile(THEME_FILE, newColor)
      }
    }),
    {
      name: 'theme-storage',
      storage: {
        getItem: async () => {
          const data = await loadFromFile<ThemeColor>(THEME_FILE, DEFAULT_THEME)
          return { state: { color: data } }
        },
        setItem: async (_, value) => {
          await saveToFile(THEME_FILE, value.state.color)
        },
        removeItem: () => {} // Not needed for this implementation
      }
    }
  )
) 