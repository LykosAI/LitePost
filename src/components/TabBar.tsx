import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tab } from "@/types"

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
  return (
    <div className="flex items-center">
      <Tabs value={activeTab} className="flex-1">
        <TabsList className="w-full h-auto p-1 bg-muted flex gap-1 rounded-lg">
          {tabs.map(tab => (
            <div key={tab.id} className="flex items-center relative group">
              <div className="relative flex items-center">
                <TabsTrigger
                  value={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    onStartEditing(tab.id)
                  }}
                  className={`data-[state=active]:bg-background rounded-md data-[state=active]:shadow-none py-1.5 ${tabs.length > 1 ? 'px-7' : 'px-3'}`}
                >
                  {tab.isEditing ? (
                    <Input
                      className="h-6 px-1 py-0 w-24 bg-transparent"
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
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 hover:bg-muted-foreground/20 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-8 w-8 p-0 rounded-full hover:bg-muted"
        onClick={onAddTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
} 