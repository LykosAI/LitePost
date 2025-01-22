import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tab } from "@/types"
import { useRef } from "react"

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
    <div className="flex items-center w-full gap-2 min-w-0">
      <div className="flex-1 min-w-0 overflow-hidden">
        <Tabs value={activeTab}>
          <TabsList 
            ref={tabsListRef}
            onWheel={handleWheel}
            className="h-auto p-1 bg-card border border-border 
            flex gap-1 rounded-lg overflow-x-auto 
            scrollbar-thin scrollbar-track-transparent 
            scrollbar-thumb-muted-foreground/20 
            hover:scrollbar-thumb-muted-foreground/30 
            flex-nowrap min-w-0 whitespace-nowrap">
            {tabs.map(tab => (
              <div key={tab.id} className="flex-none flex items-center relative group">
                <TabsTrigger
                  value={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    onStartEditing(tab.id)
                  }}
                  className={`data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-muted rounded-md py-1.5 transition-colors ${tabs.length > 1 ? 'px-5 truncate' : 'px-3'}`}
                >
                  {tab.isEditing ? (
                    <Input
                      className="h-6 px-1 py-0 w-24 bg-transparent border-none focus-visible:ring-0"
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
                    tab.name
                  )}
                </TabsTrigger>
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 hover:bg-accent hover:text-accent-foreground rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0 h-8 w-8 p-0 rounded-full hover:bg-accent hover:text-accent-foreground"
        onClick={onAddTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
} 