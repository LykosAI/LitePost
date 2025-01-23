import { Window } from '@tauri-apps/api/window'
import { Button } from './ui/button'
import { X, Minus, Square } from 'lucide-react'
import icon from '../assets/icon_1024.png'
import { SettingsPanel } from './SettingsPanel'

export function TitleBar() {
  const appWindow = Window.getCurrent()
  
  return (
    <div data-tauri-drag-region className="h-10 flex justify-between items-center bg-background border-b">
      <div data-tauri-drag-region className="flex-1 px-2 flex items-center gap-2">
        <img src={icon} alt="LitePost" className="h-6 w-6 rounded-lg" />
        <span className="text-xl font-semibold">LitePost</span>
      </div>
      <div className="flex items-center">
        <SettingsPanel />
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-none hover:bg-muted"
          onClick={() => appWindow.minimize()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-none hover:bg-muted"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-none hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.close()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 