import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Collection } from "@/types"
import { useThemeClass } from "@/hooks/useThemeClass"

interface SaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (collectionId: string, name: string) => void
  onNewCollection: (collectionName: string, name: string) => void
  collections: Collection[]
  /** Prefills the request-name field; falls back to a URL-derived name. */
  defaultName?: string
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  onSave,
  onNewCollection,
  collections,
  defaultName = '',
}: SaveRequestDialogProps) {
  const [requestName, setRequestName] = useState(defaultName)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isAddingCollection, setIsAddingCollection] = useState(false)
  const themeClass = useThemeClass()

  // Re-seed the name each time the dialog opens for the current tab.
  useEffect(() => {
    if (open) {
      setRequestName(defaultName)
      setIsAddingCollection(false)
      setNewCollectionName('')
    }
  }, [open, defaultName])

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return
    onNewCollection(newCollectionName.trim(), requestName)
    setNewCollectionName('')
    setIsAddingCollection(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClass} bg-background border-border`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Save to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="save-request-name" className="text-foreground">Request name</Label>
            <Input
              id="save-request-name"
              placeholder="Request name"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          {isAddingCollection ? (
            <div className="flex gap-2">
              <Input
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCollection()
                  } else if (e.key === 'Escape') {
                    setIsAddingCollection(false)
                    setNewCollectionName('')
                  }
                }}
                autoFocus
                className="flex-1 bg-background text-foreground"
              />
              <Button
                variant="secondary"
                onClick={handleAddCollection}
                disabled={!newCollectionName.trim()}
              >
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start text-foreground hover:bg-muted"
              onClick={() => setIsAddingCollection(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          )}

          {collections.length === 0 ? (
            !isAddingCollection && (
              <p className="text-sm text-muted-foreground">
                No collections found. Create a collection first to save requests.
              </p>
            )
          ) : (
            collections.map((collection) => (
              <Button
                key={collection.id}
                variant="outline"
                title={collection.name}
                className="w-full justify-start text-foreground hover:bg-muted"
                onClick={() => onSave(collection.id, requestName)}
              >
                <Save className="h-4 w-4 mr-2 shrink-0" />
                {/* Buttons are whitespace-nowrap; an uncapped long collection
                    name would stretch the row past the dialog edge. */}
                <span className="truncate">{collection.name}</span>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
