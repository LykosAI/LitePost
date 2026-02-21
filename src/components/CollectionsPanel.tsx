import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, FolderPlus, Download, Upload } from "lucide-react"
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

interface CollectionsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRequest?: Tab
  onRequestSelect: (request: Tab) => void
}

export const CollectionsPanel = forwardRef<HTMLButtonElement, CollectionsPanelProps>(
  ({ open, onOpenChange, currentRequest, onRequestSelect }, ref) => {
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
        <SheetTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-none hover:bg-muted"
            aria-label="Open Collections Panel"
          >
            <Folder className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          className={`${themeClass} w-[600px] sm:w-[800px] sm:max-w-none border-l border-border bg-background text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60`}
          side="right"
        >
          <SheetHeader>
            <SheetTitle className="text-foreground">Collections</SheetTitle>
            <SheetDescription>
              Manage your saved API requests and collections
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-5rem)]">
            <div className="flex items-center justify-between py-6">
              <div>
                <h3 className="text-lg font-medium">Collections</h3>
                <p className="text-sm text-muted-foreground">
                  Organize and save your API requests
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="dark bg-background border-border">
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
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="dark bg-background border-border">
                    <DropdownMenuItem onClick={handleExport}>
                      LitePost Format
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPostman}>
                      Postman Format
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCollection}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Collection
                </Button>
              </div>
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
      </Sheet>
    )
  }
)
CollectionsPanel.displayName = "CollectionsPanel" 
