import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import React from "react"
import { cn } from "@/lib/utils"

interface KeyValueListProps<T extends { key: string; value: string; enabled: boolean }> {
  items: T[]
  onItemsChange: (items: T[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  disabled?: boolean
  envIndex?: number
}

export function KeyValueList<T extends { key: string; value: string; enabled: boolean }>({
  items,
  onItemsChange,
  keyPlaceholder = "Name",
  valuePlaceholder = "Value",
  disabled = false,
}: KeyValueListProps<T>) {
  const updateItem = (index: number, field: keyof T, value: string | boolean) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onItemsChange(newItems)
  }

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index))
  }

  const addItem = () => {
    onItemsChange([...items, { key: "", value: "", enabled: true } as T])
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-1.5">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Input
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) => updateItem(index, 'key', e.target.value)}
              disabled={disabled}
              className={cn(
                "bg-muted/30 border-border/30 text-foreground text-[13px] h-8",
                "focus-visible:ring-ring/30 font-mono",
                !item.enabled && "opacity-40"
              )}
            />
            <Input
              placeholder={valuePlaceholder}
              value={item.value}
              onChange={(e) => updateItem(index, 'value', e.target.value)}
              disabled={disabled}
              className={cn(
                "bg-muted/30 border-border/30 text-foreground text-[13px] h-8",
                "focus-visible:ring-ring/30 font-mono",
                !item.enabled && "opacity-40"
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              role="checkbox"
              aria-checked={item.enabled}
              onClick={() => updateItem(index, 'enabled', !item.enabled)}
              className={cn(
                "h-8 w-8 rounded-md",
                item.enabled ? "text-primary" : "text-muted-foreground/40"
              )}
              disabled={disabled}
            >
              <div className={cn(
                "h-4 w-4 rounded border-2 transition-colors",
                item.enabled
                  ? "border-primary bg-primary/20"
                  : "border-muted-foreground/30"
              )}>
                {item.enabled && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-full w-full">
                    <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              disabled={disabled}
              aria-label="trash"
              className="h-8 w-8 rounded-md hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </React.Fragment>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-xs"
        onClick={addItem}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Item
      </Button>
    </div>
  )
}