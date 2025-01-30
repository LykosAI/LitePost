import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  onSave: (collectionId: string) => void
  onNewCollection: (name: string) => void
  collections: Collection[]
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  onSave,
  onNewCollection,
  collections,
}: SaveRequestDialogProps) {
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isAddingCollection, setIsAddingCollection] = useState(false)
  const themeClass = useThemeClass()

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return
    onNewCollection(newCollectionName.trim())
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
                className="w-full justify-start text-foreground hover:bg-muted"
                onClick={() => onSave(collection.id)}
              >
                <Save className="h-4 w-4 mr-2" />
                {collection.name}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 