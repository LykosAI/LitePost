import { Window } from '@tauri-apps/api/window'
import { Button } from './ui/button'
import { X, Minus, Square, Settings, Beaker, FolderOpen } from 'lucide-react'
import icon from '../assets/icon_1024.png'
import { SettingsPanel } from './SettingsPanel'
import { EnvironmentPanel } from './EnvironmentPanel'
import { CollectionsPanel } from './CollectionsPanel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useEnvironmentStore } from '@/store/environments'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useState } from 'react'
import { Tab } from '@/types'

interface TitleBarProps {
  currentRequest?: Tab
  onRequestSelect: (request: Tab) => void
}

export function TitleBar({ currentRequest, onRequestSelect }: TitleBarProps) {
  const appWindow = Window.getCurrent()
  const { environments, activeEnvironmentId, setActiveEnvironment } = useEnvironmentStore()
  const [isEnvironmentPanelOpen, setIsEnvironmentPanelOpen] = useState(false)
  const [isCollectionsPanelOpen, setIsCollectionsPanelOpen] = useState(false)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)
  
  const showTooltips = !isEnvironmentPanelOpen && !isSettingsPanelOpen

  const renderTooltip = (content: string, children: React.ReactNode) => {
    if (!showTooltips) return children
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent>
      <div data-tauri-drag-region className="h-10 flex justify-between items-center bg-background border-b">
        <div data-tauri-drag-region className="flex-1 px-2 flex items-center gap-2">
          <img src={icon} alt="LitePost" className="h-6 w-6 rounded-lg" />
          <span className="text-xl font-semibold">LitePost</span>
        </div>
        <div className="flex items-center gap-2 px-2">
          {renderTooltip("Switch environment",
            <div>
              <Select
                value={activeEnvironmentId || "null"}
                onValueChange={(value) => setActiveEnvironment(value === "null" ? null : value)}
              >
                <SelectTrigger className="w-[200px] h-7 text-sm bg-background/10 border-border/20">
                  <SelectValue placeholder="No environment" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-border/20">
                  <SelectItem value="null" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus:bg-primary-foreground/10 focus:text-primary-foreground">None</SelectItem>
                  {environments.map((env) => (
                    <SelectItem 
                      key={env.id} 
                      value={env.id}
                      className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus:bg-primary-foreground/10 focus:text-primary-foreground"
                    >
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <EnvironmentPanel 
            open={isEnvironmentPanelOpen} 
            onOpenChange={setIsEnvironmentPanelOpen}
            trigger={
              renderTooltip("Manage environments",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Manage environments"
                  className="h-10 w-10 rounded-none hover:bg-muted"
                >
                  <Beaker className="h-4 w-4" />
                </Button>
              )
            }
          />

          <SettingsPanel 
            open={isSettingsPanelOpen} 
            onOpenChange={setIsSettingsPanelOpen}
            trigger={
              renderTooltip("Settings",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Settings"
                  className="h-10 w-10 rounded-none hover:bg-muted"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )
            }
          />

          <CollectionsPanel 
            open={isCollectionsPanelOpen}
            onOpenChange={setIsCollectionsPanelOpen}
            currentRequest={currentRequest}
            onRequestSelect={onRequestSelect}
            trigger={
              renderTooltip("Collections",
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Collections"
                  className="h-10 w-10 rounded-none hover:bg-muted"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              )
            }
          />

          {renderTooltip("Minimize",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Minimize"
              className="h-10 w-10 rounded-none hover:bg-muted"
              onClick={() => appWindow.minimize()}
            >
              <Minus className="h-4 w-4" />
            </Button>
          )}

          {renderTooltip("Maximize",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Maximize"
              className="h-10 w-10 rounded-none hover:bg-muted"
              onClick={() => appWindow.toggleMaximize()}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}

          {renderTooltip("Close",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close"
              className="h-10 w-10 rounded-none hover:bg-red-500 hover:text-white"
              onClick={() => appWindow.close()}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
} 