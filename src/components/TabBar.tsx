import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tab } from "@/types"
import { useRef } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Method color mapping with refined, harmonious colors
const methodColors: { [key: string]: string } = {
  GET: "bg-sky-400",
  POST: "bg-emerald-400",
  PUT: "bg-amber-400",
  PATCH: "bg-orange-400",
  DELETE: "bg-rose-400",
  HEAD: "bg-violet-400",
  OPTIONS: "bg-cyan-400"
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onAddTab: () => void
  onCloseTab: (tabId: string) => void
  onStartEditing: (tabId: string) => void
  onStopEditing: (tabId: string, newName: string) => void
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  onAddTab,
  onCloseTab,
  onStartEditing,
  onStopEditing,
}: TabBarProps) {
  const tabsListRef = useRef<HTMLDivElement>(null)

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

  return (
    <TooltipProvider>
      <div className="flex items-center w-full gap-2 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <Tabs value={activeTab}>
            <TabsList
              ref={tabsListRef}
              onWheel={handleWheel}
              className="h-auto p-1 bg-card/60 border border-border/30 backdrop-blur-sm
              flex gap-1 rounded-xl overflow-x-auto 
              scrollbar-thin scrollbar-track-transparent 
              scrollbar-thumb-muted-foreground/20 
              hover:scrollbar-thumb-muted-foreground/30 
              flex-nowrap min-w-0 whitespace-nowrap
              shadow-[0_1px_3px_hsl(var(--background)/0.2)]">
              {tabs.map(tab => (
                <div key={tab.id} className="flex-none flex items-center relative group">
                  <TabsTrigger
                    value={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      onStartEditing(tab.id)
                    }}
                    className={cn(
                      "data-[state=active]:bg-accent/15 data-[state=active]:text-foreground",
                      "data-[state=active]:shadow-[inset_0_-2px_0_hsl(var(--primary))]",
                      "hover:bg-muted/40 rounded-lg py-1.5 transition-all duration-150",
                      "flex items-center gap-2",
                      tabs.length > 1 ? 'px-3 pr-7 truncate' : 'px-3'
                    )}
                  >
                    {/* Method color indicator with glow */}
                    <div className="relative">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full ring-1 ring-white/10",
                          methodColors[tab.method] || "bg-gray-400"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full blur-[3px] opacity-40",
                          methodColors[tab.method] || "bg-gray-400"
                        )}
                      />
                    </div>
                    {tab.isEditing ? (
                      <Input
                        className="h-6 px-1 py-0 w-24 bg-transparent border-none focus-visible:ring-0 focus-visible:shadow-none"
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
                      <span className="text-[13px]">{tab.name}</span>
                    )}
                  </TabsTrigger>
                  {tabs.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-destructive/15 hover:text-red-400 rounded-full transition-all duration-150"
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
                  )}
                </div>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-8 w-8 p-0 rounded-lg border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              onClick={onAddTab}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New request</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}