import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FolderPlus, Download, Upload } from "lucide-react"
import { useCollectionStore } from "@/store/collections"
import { Tab } from "@/types"
import { getRequestNameFromUrl } from "@/utils/url"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, forwardRef, useRef } from "react"
import { toast } from "sonner"
import { useThemeClass } from "@/hooks/useThemeClass"
import { importFromOpenapi } from '@/utils/collection-converter'
import { CollectionCard } from "./collections/CollectionCard"
import { savedRequestToTab } from "./collections/collectionUtils"
import { useResizablePanel } from "@/hooks/useResizablePanel"

interface CollectionsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRequest?: Tab
  onRequestSelect: (request: Tab) => void
}

export const CollectionsPanel = forwardRef<HTMLDivElement, CollectionsPanelProps>(
  ({ open, onOpenChange, currentRequest, onRequestSelect }, _ref) => {
    const {
      collections,
      addCollection,
      updateCollection,
      deleteCollection,
      addRequest,
      deleteRequest,
      exportCollections,
      exportToPostman,
      importCollections,
      importFromPostman,
    } = useCollectionStore()

    const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
    const fileInputRef = useRef<HTMLInputElement>(null)
    const themeClass = useThemeClass()
    const { width, isDragging, setIsDragging } = useResizablePanel(600, 450)
    const shouldLogImportErrors =
      typeof import.meta !== "undefined" &&
      Boolean(import.meta.env?.DEV) &&
      import.meta.env?.MODE !== "test"

    const toggleCollection = (id: string) => {
      setExpandedCollections(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }

    const handleAddCollection = () => {
      addCollection("New Collection")
    }

    const handleSaveCurrentRequest = (collectionId: string) => {
      if (!currentRequest) return

      const { id, loading, response, isEditing, activeSession, ...requestData } = currentRequest
      addRequest(collectionId, {
        ...requestData,
        name: getRequestNameFromUrl(requestData.url)
      })
    }

    const handleSelectRequest = (request: Tab) => {
      onRequestSelect(request)
      onOpenChange(false)
    }

    const handleSelectSavedRequest = (request: Parameters<typeof savedRequestToTab>[0]) => {
      handleSelectRequest(savedRequestToTab(request))
    }

    const handleRestoreAllRequests = (collectionId: string) => {
      const targetCollection = collections.find((collection) => collection.id === collectionId)
      if (!targetCollection) return
      targetCollection.requests.forEach((request) => {
        onRequestSelect(savedRequestToTab(request))
      })
      onOpenChange(false)
    }

    const handleExport = () => {
      const blob = new Blob([exportCollections()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'litepost-collections.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const handleExportPostman = () => {
      const blob = new Blob([exportToPostman()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'postman-collections.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const collections = JSON.parse(e.target?.result as string)
          importCollections(collections)
          toast.success('Collections imported successfully')
        } catch (error) {
          if (shouldLogImportErrors) {
            console.error('Failed to import collections:', error)
          }
          toast.error('Failed to import collections')
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    }

    const handleImportPostmanClick = () => {
      if (fileInputRef.current) {
        const originalOnChange = fileInputRef.current.onchange
        fileInputRef.current.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (!file) return

          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              importFromPostman(e.target?.result as string)
              toast.success('Postman collections imported successfully')
            } catch (error) {
              if (shouldLogImportErrors) {
                console.error('Failed to import Postman collections:', error)
              }
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Invalid Postman collection format'
              )
            }
          }
          reader.readAsText(file)
          if (event.target) {
            (event.target as HTMLInputElement).value = ''
          }
          fileInputRef.current!.onchange = originalOnChange
        }
        fileInputRef.current.click()
      }
    }

    const handleImportOpenapiClick = async () => {
      const openapiUrl = window.prompt("Enter the URL for the OpenAPI JSON file:");
      if (!openapiUrl) return;
      try {
        const response = await fetch(openapiUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch the OpenAPI document.");
        }
        const apiDoc = await response.json();
        const baseUrl = window.prompt("Enter the base URL for the API:");
        if (!baseUrl) return;
        const importedCollections = importFromOpenapi(apiDoc, baseUrl);
        importCollections(importedCollections);
        toast.success("OpenAPI collections imported successfully");
      } catch (error) {
        if (shouldLogImportErrors) {
          console.error("Error importing OpenAPI:", error);
        }
        toast.error(error instanceof Error ? error.message : "Invalid OpenAPI format");
      }
    };

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={`${themeClass} w-full sm:max-w-none border-l border-border/30 bg-background/95 backdrop-blur-xl text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60 ${isDragging ? "transition-none !duration-0" : ""}`}
          style={{ width: width ? `${width}px` : undefined }}
          side="right"
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-50 transition-colors group"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          >
            <div className="absolute left-1 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border/50 group-hover:bg-primary/50 rounded-full transition-colors" />
          </div>
          <SheetHeader>
            <SheetTitle className="text-foreground">Collections</SheetTitle>
            <SheetDescription>
              Manage your saved API requests and collections
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-5rem)]">
            <div className="flex flex-wrap items-center justify-end gap-2.5 py-4 mt-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImport}
                aria-label="Import Collections"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 shadow-sm bg-background/40 hover:bg-secondary/60 transition-colors">
                    <Download className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    LitePost Format
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportPostmanClick}>
                    Postman Format
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImportOpenapiClick}>
                    OpenAPI Format
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 shadow-sm bg-background/40 hover:bg-secondary/60 transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                  <DropdownMenuItem onClick={handleExport}>
                    LitePost Format
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPostman}>
                    Postman Format
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="default"
                size="sm"
                className="h-9 shadow-sm shadow-primary/20 transition-all font-medium"
                onClick={handleAddCollection}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    currentRequest={currentRequest}
                    isExpanded={expandedCollections.has(collection.id)}
                    onToggle={toggleCollection}
                    onUpdateCollection={updateCollection}
                    onSaveCurrentRequest={handleSaveCurrentRequest}
                    onRestoreAllRequests={(targetCollection) =>
                      handleRestoreAllRequests(targetCollection.id)
                    }
                    onDeleteCollection={deleteCollection}
                    onSelectRequest={handleSelectSavedRequest}
                    onDeleteRequest={deleteRequest}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet >
    )
  }
)
CollectionsPanel.displayName = "CollectionsPanel" 
