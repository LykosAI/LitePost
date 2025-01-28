import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, FolderPlus, MoreVertical, ChevronRight, ChevronDown, Save, Trash2, RotateCw, Download, Upload } from "lucide-react"
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
import { cn } from "@/lib/utils"

const methodColors: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-500",
  PUT: "bg-yellow-500/10 text-yellow-500",
  PATCH: "bg-orange-500/10 text-orange-500",
  DELETE: "bg-red-500/10 text-red-500",
  HEAD: "bg-purple-500/10 text-purple-500",
  OPTIONS: "bg-cyan-500/10 text-cyan-500"
}

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
          console.error('Failed to import collections:', error)
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
              console.error('Failed to import Postman collections:', error)
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
          className="dark w-[600px] sm:w-[800px] sm:max-w-none border-l border-border bg-background text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60"
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
                  <div 
                    key={collection.id} 
                    className="space-y-2 p-4 rounded-lg border border-border bg-card/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div 
                        className="flex items-center gap-2 flex-1 cursor-pointer" 
                        onClick={() => toggleCollection(collection.id)}
                      >
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted/50"
                          aria-label={
                            expandedCollections.has(collection.id) 
                              ? `Collapse Collection ${collection.name}` 
                              : `Expand Collection ${collection.name}`
                          }
                        >
                          {expandedCollections.has(collection.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Input
                          value={collection.name}
                          onChange={(e) => updateCollection(collection.id, { name: e.target.value })}
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
                            onClick={() => handleSaveCurrentRequest(collection.id)}
                            className="h-8"
                            aria-label="Save Current Request"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            collection.requests.forEach(request => {
                              onRequestSelect({
                                id: crypto.randomUUID(),
                                name: request.name,
                                method: request.method,
                                url: request.url,
                                rawUrl: request.rawUrl,
                                params: request.params,
                                headers: request.headers,
                                body: request.body,
                                contentType: request.contentType,
                                auth: request.auth,
                                cookies: request.cookies,
                                loading: false,
                                response: null,
                                isEditing: false,
                                testScripts: request.testScripts || [],
                                testAssertions: request.testAssertions || [],
                                testResults: request.testResults || null
                              });
                            });
                            onOpenChange(false);
                          }}
                          className="h-8"
                          title="Restore all requests"
                          aria-label="Restore All Requests"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCollection(collection.id)}
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
                        onChange={(e) => updateCollection(collection.id, { description: e.target.value })}
                        placeholder="Collection description"
                        className="h-20 bg-background text-foreground"
                      />
                    )}

                    {expandedCollections.has(collection.id) && (
                      <div className="space-y-2 mt-4">
                        {collection.requests.map((request) => (
                          <div 
                            key={request.id}
                            className="flex items-center justify-between gap-2 p-2 rounded border border-border/50 hover:bg-accent/50"
                          >
                            <div 
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => {
                                onRequestSelect({
                                  id: crypto.randomUUID(),
                                  name: request.name,
                                  method: request.method,
                                  url: request.url,
                                  rawUrl: request.rawUrl,
                                  params: request.params,
                                  headers: request.headers,
                                  body: request.body,
                                  contentType: request.contentType,
                                  auth: request.auth,
                                  cookies: request.cookies,
                                  loading: false,
                                  response: null,
                                  isEditing: false,
                                  testScripts: request.testScripts || [],
                                  testAssertions: request.testAssertions || [],
                                  testResults: request.testResults || null
                                });
                                onOpenChange(false);
                              }}
                            >
                              <span className={cn(
                                "px-2 py-0.5 text-xs rounded",
                                methodColors[request.method] || "bg-muted-foreground/10"
                              )}>
                                {request.method}
                              </span>
                              <span className="flex-1 truncate">{request.name}</span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="dark bg-background border-border">
                                <DropdownMenuItem
                                  onClick={() => deleteRequest(collection.id, request.id)}
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