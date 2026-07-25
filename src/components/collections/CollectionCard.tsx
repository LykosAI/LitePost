import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useThemeClass } from "@/hooks/useThemeClass"
import { Collection, SavedRequest, Tab } from "@/types"
import { methodColors } from "./collectionUtils"
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  RotateCw,
  Save,
  Trash2,
} from "lucide-react"

interface CollectionCardProps {
  collection: Collection
  currentRequest?: Tab
  isExpanded: boolean
  onToggle: (collectionId: string) => void
  onUpdateCollection: (collectionId: string, updates: Partial<Collection>) => void
  onSaveCurrentRequest: (collectionId: string) => void
  onRestoreAllRequests: (collection: Collection) => void
  onDeleteCollection: (collectionId: string) => void
  onSelectRequest: (request: SavedRequest) => void
  onDeleteRequest: (collectionId: string, requestId: string) => void
}

export function CollectionCard({
  collection,
  currentRequest,
  isExpanded,
  onToggle,
  onUpdateCollection,
  onSaveCurrentRequest,
  onRestoreAllRequests,
  onDeleteCollection,
  onSelectRequest,
  onDeleteRequest,
}: CollectionCardProps) {
  const themeClass = useThemeClass()
  return (
    <div className="space-y-2 p-4 rounded-lg border border-border bg-card/50 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => onToggle(collection.id)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted/50"
            aria-label={
              isExpanded
                ? `Collapse Collection ${collection.name}`
                : `Expand Collection ${collection.name}`
            }
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={collection.name}
            onChange={(e) =>
              onUpdateCollection(collection.id, { name: e.target.value })
            }
            onClick={(e) => e.stopPropagation()}
            className="h-8 bg-background text-foreground"
            aria-label={`Collection Name ${collection.name}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {currentRequest && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSaveCurrentRequest(collection.id)}
              className="h-8"
              aria-label="Save Current Request"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestoreAllRequests(collection)}
            className="h-8"
            title="Restore all requests"
            aria-label="Restore All Requests"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteCollection(collection.id)}
            className="h-8 text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive"
            aria-label={`Delete Collection ${collection.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {collection.description && (
        <Textarea
          value={collection.description}
          onChange={(e) =>
            onUpdateCollection(collection.id, { description: e.target.value })
          }
          placeholder="Collection description"
          className="h-20 bg-background text-foreground"
        />
      )}

      {isExpanded && (
        <div className="space-y-1 mt-3 pl-4 border-l-2 border-border/20">
          {collection.requests.length === 0 && (
            <p className="text-xs text-muted-foreground/50 py-3 pl-2">
              No saved requests. Click the save icon above to add the current request.
            </p>
          )}
          {collection.requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors group"
            >
              <div
                className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
                onClick={() => onSelectRequest(request)}
              >
                <span
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-semibold rounded-md shrink-0",
                    methodColors[request.method] || "bg-muted-foreground/10"
                  )}
                >
                  {request.method}
                </span>
                <span className="flex-1 truncate text-sm">{request.name}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                  <DropdownMenuItem
                    onClick={() => onDeleteRequest(collection.id, request.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
