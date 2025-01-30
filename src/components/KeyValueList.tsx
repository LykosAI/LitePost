import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import React from "react"

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
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr,1fr,auto,auto] gap-2">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Input
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) => updateItem(index, 'key', e.target.value)}
              disabled={disabled}
              className="bg-background border-input text-foreground focus-visible:ring-ring"
            />
            <Input
              placeholder={valuePlaceholder}
              value={item.value}
              onChange={(e) => updateItem(index, 'value', e.target.value)}
              disabled={disabled}
              className="bg-background border-input text-foreground focus-visible:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateItem(index, 'enabled', !item.enabled)}
              className={item.enabled ? "text-foreground" : "text-muted-foreground"}
              disabled={disabled}
            >
              <input
                type="checkbox"
                checked={item.enabled}
                className="h-4 w-4"
                onChange={() => {}} // Handled by button click
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              disabled={disabled}
              aria-label="trash"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </React.Fragment>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addItem}
        disabled={disabled}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  )
} 