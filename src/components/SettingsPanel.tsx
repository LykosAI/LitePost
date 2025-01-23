import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSettings } from "@/store/settings"

export function SettingsPanel() {
  const { jsonViewer, updateJSONViewerSettings } = useSettings()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-none hover:bg-muted"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        className="w-[400px] sm:w-[540px] border-l border-border bg-primary"
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="text-primary-foreground">Settings</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)] pr-4">
          <div className="space-y-6 py-6">
            {/* JSON Viewer Settings Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-primary-foreground">JSON Viewer</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how JSON responses are displayed and auto-expanded.
                </p>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-foreground">Auto-expand Depth</Label>
                    <span className="text-sm text-muted-foreground">
                      {jsonViewer.maxAutoExpandDepth} levels
                    </span>
                  </div>
                  <Slider
                    value={[jsonViewer.maxAutoExpandDepth]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={([value]) =>
                      updateJSONViewerSettings({ maxAutoExpandDepth: value })
                    }
                    className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[data-orientation=horizontal]]:bg-zinc-800"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum nesting depth to automatically expand in JSON responses.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-foreground">Max Array Size to Auto-expand</Label>
                    <span className="text-sm text-muted-foreground">
                      {jsonViewer.maxAutoExpandArraySize} items
                    </span>
                  </div>
                  <Slider
                    value={[jsonViewer.maxAutoExpandArraySize]}
                    min={0}
                    max={200}
                    step={10}
                    onValueChange={([value]) =>
                      updateJSONViewerSettings({ maxAutoExpandArraySize: value })
                    }
                    className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[data-orientation=horizontal]]:bg-zinc-800"
                  />
                  <p className="text-xs text-muted-foreground">
                    Arrays larger than this size will be collapsed by default.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-foreground">Max Object Size to Auto-expand</Label>
                    <span className="text-sm text-muted-foreground">
                      {jsonViewer.maxAutoExpandObjectSize} properties
                    </span>
                  </div>
                  <Slider
                    value={[jsonViewer.maxAutoExpandObjectSize]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([value]) =>
                      updateJSONViewerSettings({ maxAutoExpandObjectSize: value })
                    }
                    className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[data-orientation=horizontal]]:bg-zinc-800"
                  />
                  <p className="text-xs text-muted-foreground">
                    Objects with more properties than this will be collapsed by default.
                  </p>
                </div>
              </div>
            </div>

            {/* Future Settings Sections */}
            {/* Example of how other sections would look */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">Request Defaults</h3>
                <p className="text-sm text-muted-foreground">
                  Configure default settings for new requests.
                </p>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="text-sm text-muted-foreground italic">
                Coming soon...
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">Theme</h3>
                <p className="text-sm text-muted-foreground">
                  Customize the application appearance.
                </p>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="text-sm text-muted-foreground italic">
                Coming soon...
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 