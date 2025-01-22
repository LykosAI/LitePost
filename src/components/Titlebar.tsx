import { Window } from '@tauri-apps/api/window'
import { Button } from './ui/button'
import { X, Minus, Square } from 'lucide-react'

export function TitleBar() {
  const appWindow = Window.getCurrent()
  
  return (
    <div data-tauri-drag-region className="h-8 flex justify-between items-center bg-background border-b">
      <div data-tauri-drag-region className="flex-1 px-2">
        <span className="text-xl font-semibold">LitePost</span>
      </div>
      <div className="flex">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-none hover:bg-muted"
          onClick={() => appWindow.minimize()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-none hover:bg-muted"
          onClick={() => appWindow.toggleMaximize()}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-none hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.close()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 