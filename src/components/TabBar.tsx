import { Copy, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tab } from "@/types"
import { useEffect, useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useThemeClass } from "@/hooks/useThemeClass"

import { methodGlowColors as methodColors } from "@/utils/methodColors"

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onAddTab: () => void
  onCloseTab: (tabId: string) => void
  onCloseOtherTabs?: (tabId: string) => void
  onCloseTabsToRight?: (tabId: string) => void
  onDuplicateTab?: (tabId: string) => void
  onStartEditing: (tabId: string) => void
  onStopEditing: (tabId: string, newName: string) => void
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  onAddTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onDuplicateTab,
  onStartEditing,
  onStopEditing,
}: TabBarProps) {
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const themeClass = useThemeClass()

  const handleWheel = (event: React.WheelEvent) => {
    if (!tabsListRef.current) return

    // Prevent vertical scrolling if there's horizontal overflow
    if (tabsListRef.current.scrollWidth > tabsListRef.current.clientWidth) {
      event.preventDefault()

      // Use shift + wheel for horizontal scrolling by default
      const delta = event.shiftKey ? event.deltaY : event.deltaX
      tabsListRef.current.scrollLeft += delta
    }
  }

  // The right-edge fade exists to hint at overflow — showing it with nothing
  // to scroll just dims the last tab.
  useEffect(() => {
    const el = tabsListRef.current
    if (!el) return
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1)
    check()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [tabs.length])

  // Keep the active tab visible when it changes via palette/history/shortcut.
  useEffect(() => {
    const el = tabsListRef.current?.querySelector('[data-state="active"]')
    el?.scrollIntoView?.({ inline: "nearest", block: "nearest" })
  }, [activeTab])

  return (
    <TooltipProvider>
      <div className="flex items-center w-full gap-2 min-w-0 pt-1 pb-2">
        <div className="flex-1 min-w-0 overflow-hidden relative">
          <Tabs value={activeTab}>
            <TabsList
              ref={tabsListRef}
              onWheel={handleWheel}
              className="h-[38px] p-1 bg-secondary/20 border border-border/30 backdrop-blur-xl
              flex gap-1.5 rounded-xl overflow-x-auto
              scrollbar-thin scrollbar-track-transparent
              scrollbar-thumb-border/50
              hover:scrollbar-thumb-border/80
              flex-nowrap min-w-0 whitespace-nowrap
              shadow-inner"
            >
              {tabs.map((tab, index) => (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className="flex-none flex items-center relative group h-full"
                      // Middle-click closes, like every tabbed UI
                      onMouseDown={(e) => { if (e.button === 1) e.preventDefault() }}
                      onAuxClick={(e) => { if (e.button === 1) onCloseTab(tab.id) }}
                    >
                      <TabsTrigger
                        value={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          onStartEditing(tab.id)
                        }}
                        className={cn(
                          "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border-border/60",
                          "border border-transparent",
                          "hover:bg-secondary/40 rounded-lg h-full transition-all duration-300",
                          "flex items-center gap-2",
                          // Cap the width so one hash-named tab cannot eat the
                          // whole bar; the title attr carries the full name.
                          "px-3.5 pr-8 max-w-[240px]"
                        )}
                        title={tab.name}
                      >
                        {/* Method color indicator with label */}
                        <span className={cn(
                          "text-[10px] font-bold tracking-wider shrink-0 transition-all",
                          methodColors[tab.method] || "text-gray-400"
                        )}>
                          {tab.method}
                        </span>
                        {tab.isEditing ? (
                          <Input
                            className="h-6 px-1.5 py-0 w-28 bg-background border border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-inner rounded text-[13px]"
                            defaultValue={tab.name}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onStopEditing(tab.id, e.currentTarget.value)
                              } else if (e.key === 'Escape') {
                                onStopEditing(tab.id, tab.name)
                              }
                            }}
                            onBlur={(e) => onStopEditing(tab.id, e.target.value)}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                          />
                        ) : (
                          <span className="text-[13px] font-medium tracking-tight text-foreground/80 group-data-[state=active]:text-foreground relative top-[0.5px] truncate min-w-0">{tab.name}</span>
                        )}
                      </TabsTrigger>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Close ${tab.name}`}
                            className="h-[22px] w-[22px] p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-destructive/15 hover:text-destructive rounded-md transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              onCloseTab(tab.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Close tab</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                    {onDuplicateTab && (
                      <ContextMenuItem onClick={() => onDuplicateTab(tab.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator className="bg-border/40" />
                    <ContextMenuItem onClick={() => onCloseTab(tab.id)}>
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </ContextMenuItem>
                    {onCloseOtherTabs && (
                      <ContextMenuItem
                        disabled={tabs.length === 1}
                        onClick={() => onCloseOtherTabs(tab.id)}
                      >
                        Close Others
                      </ContextMenuItem>
                    )}
                    {onCloseTabsToRight && (
                      <ContextMenuItem
                        disabled={index === tabs.length - 1}
                        onClick={() => onCloseTabsToRight(tab.id)}
                      >
                        Close to the Right
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </TabsList>
          </Tabs>
          {/* Subtle fade effect hinting that more tabs are off-screen */}
          {overflowing && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="New request tab"
              className="flex-shrink-0 h-[38px] w-[38px] p-0 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm relative group overflow-hidden"
              onClick={onAddTab}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-5 w-5 relative z-10" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-popover border-border/50 text-foreground shadow-xl rounded-lg">
            <p>New request (Ctrl+T)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
