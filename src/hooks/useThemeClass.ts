import { useThemeStore } from "@/store/theme"

export function useThemeClass() {
  const { color } = useThemeStore()
  
  const themeClass = {
    blue: '',
    green: 'theme-green',
    black: 'theme-black',
    purple: 'theme-purple'
  }[color]
  
  return `dark ${themeClass}`
} 