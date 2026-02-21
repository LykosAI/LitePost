import { Window } from '@tauri-apps/api/window'
import { Button } from './ui/button'
import { X, Minus, Square } from 'lucide-react'
import icon from '../assets/icon_1024.png'
import { SettingsPanel } from './SettingsPanel'
import { EnvironmentPanel } from './EnvironmentPanel'
import { CollectionsPanel } from './CollectionsPanel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useEnvironmentStore } from '@/store/environments'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useState } from 'react'
import { Tab } from '@/types'
import { useThemeClass } from '@/hooks/useThemeClass'

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
  const themeClass = useThemeClass()

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
      <div data-tauri-drag-region className="relative h-11 flex justify-between items-center bg-background/80 backdrop-blur-md border-b border-border/30">
        {/* Subtle gradient accent line at the very top */}
        <div className="absolute top-0 left-0 right-0 gradient-line opacity-40" />

        <div data-tauri-drag-region className="flex-1 px-3 flex items-center gap-2.5">
          <div className="relative">
            <img src={icon} alt="LitePost" className="h-6 w-6 rounded-lg shadow-sm" />
            <div className="absolute -inset-0.5 rounded-lg bg-primary/10 blur-sm -z-10" />
          </div>
          <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">LitePost</span>
        </div>
        <div className="flex items-center gap-1.5 px-2">
          {renderTooltip("Switch environment",
            <div>
              <Select
                value={activeEnvironmentId || "null"}
                onValueChange={(value) => setActiveEnvironment(value === "null" ? null : value)}
              >
                <SelectTrigger className="w-[180px] h-7 text-xs bg-secondary/40 border-border/30 hover:bg-secondary/60 transition-colors">
                  <SelectValue placeholder="No environment" />
                </SelectTrigger>
                <SelectContent className={`${themeClass} bg-popover border-border/40 backdrop-blur-xl shadow-xl`}>
                  <SelectItem value="null" className="hover:bg-accent/10 focus:bg-accent/10 text-foreground">None</SelectItem>
                  {environments.map((env) => (
                    <SelectItem
                      key={env.id}
                      value={env.id}
                      className="hover:bg-accent/10 focus:bg-accent/10 text-foreground"
                    >
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-px h-5 bg-border/30 mx-0.5" />

          {renderTooltip("Manage environments",
            <EnvironmentPanel
              open={isEnvironmentPanelOpen}
              onOpenChange={setIsEnvironmentPanelOpen}
            />
          )}

          {renderTooltip("Settings",
            <SettingsPanel
              open={isSettingsPanelOpen}
              onOpenChange={setIsSettingsPanelOpen}
            />
          )}

          {renderTooltip("Collections",
            <CollectionsPanel
              open={isCollectionsPanelOpen}
              onOpenChange={setIsCollectionsPanelOpen}
              currentRequest={currentRequest}
              onRequestSelect={onRequestSelect}
            />
          )}

          <div className="w-px h-5 bg-border/30 mx-0.5" />

          {renderTooltip("Minimize",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Minimize"
              className="h-9 w-9 rounded-md hover:bg-muted/60"
              onClick={() => appWindow.minimize()}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          )}

          {renderTooltip("Maximize",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Maximize"
              className="h-9 w-9 rounded-md hover:bg-muted/60"
              onClick={() => appWindow.toggleMaximize()}
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          )}

          {renderTooltip("Close",
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close"
              className="h-9 w-9 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
              onClick={() => appWindow.close()}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}