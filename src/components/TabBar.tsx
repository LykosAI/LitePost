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
  GET: "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]",
  POST: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]",
  PUT: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  PATCH: "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]",
  DELETE: "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]",
  HEAD: "text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.3)]",
  OPTIONS: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
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
              {tabs.map(tab => (
                <div key={tab.id} className="flex-none flex items-center relative group h-full">
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
                      tabs.length > 1 ? 'px-3.5 pr-8 truncate' : 'px-3.5'
                    )}
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
                      <span className="text-[13px] font-medium tracking-tight text-foreground/80 group-data-[state=active]:text-foreground relative top-[0.5px]">{tab.name}</span>
                    )}
                  </TabsTrigger>
                  {tabs.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-[22px] w-[22px] p-0 opacity-0 group-hover:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-destructive/15 hover:text-destructive rounded-md transition-all duration-200"
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
          {/* Subtle fade effect on the right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 h-[38px] w-[38px] p-0 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-300 shadow-sm relative group overflow-hidden"
              onClick={onAddTab}
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-5 w-5 relative z-10" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-popover border-border/50 text-foreground shadow-xl rounded-lg">
            <p>New request</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}