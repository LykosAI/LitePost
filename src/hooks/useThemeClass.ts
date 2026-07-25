import { useThemeStore } from "@/store/theme"

export function useThemeClass() {
  const { color } = useThemeStore()
  
  // Schematic is the one light theme: it defines its own full token set and
  // must NOT get the `.dark` base class.
  if (color === 'schematic') {
    return 'schematic'
  }

  const themeClass = {
    amber: 'theme-amber',
    blue: '',
    green: 'theme-green',
    black: 'theme-black',
    purple: 'theme-purple',
    schematic: 'schematic'
  }[color]

  return `dark ${themeClass}`
} 