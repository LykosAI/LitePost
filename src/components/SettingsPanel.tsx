import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Settings, RotateCw, Palette, Sliders, RefreshCw } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/store/settings"
import { useThemeStore, ThemeColor } from "@/store/theme"
import { useThemeClass } from "@/hooks/useThemeClass"
import { forwardRef, useState } from "react"
import { checkForUpdatesManually } from "./UpdateChecker"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SettingsPanel = forwardRef<HTMLButtonElement, SettingsPanelProps>(
  ({ open, onOpenChange }, ref) => {
    const { jsonViewer, updateJSONViewerSettings } = useSettingsStore()
    const { color: themeColor, setColor: setThemeColor } = useThemeStore()
    const themeClass = useThemeClass()
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

    const handleCheckUpdate = async () => {
      setIsCheckingUpdate(true)
      try {
        await checkForUpdatesManually()
      } finally {
        setIsCheckingUpdate(false)
      }
    }

    const themes = [
      { id: 'blue' as ThemeColor, label: 'Sapphire', gradient: 'from-blue-500 to-indigo-600' },
      { id: 'green' as ThemeColor, label: 'Emerald', gradient: 'from-emerald-500 to-teal-600' },
      { id: 'purple' as ThemeColor, label: 'Amethyst', gradient: 'from-violet-500 to-purple-600' },
      { id: 'black' as ThemeColor, label: 'Obsidian', gradient: 'from-zinc-500 to-zinc-800' },
    ]

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-md hover:bg-muted/60"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          className={`${themeClass} w-[400px] sm:w-[480px] border-l border-border/30 bg-background/95 backdrop-blur-xl text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60`}
          side="right"
        >
          <SheetHeader>
            <SheetTitle className="text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary/70" />
              Settings
            </SheetTitle>
            <SheetDescription>
              Configure application settings and preferences
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)] pr-4">
            <div className="space-y-8 py-6">
              {/* Theme Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary/60" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Theme</h3>
                    <p className="text-xs text-muted-foreground">
                      Customize the application appearance
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {themes.map(({ id, label, gradient }) => (
                    <button
                      key={id}
                      onClick={() => setThemeColor(id)}
                      className={cn(
                        "group flex flex-col items-center gap-2.5 p-3 rounded-xl transition-all duration-200",
                        themeColor === id
                          ? 'bg-accent/15 ring-2 ring-primary/30 shadow-sm'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full bg-gradient-to-br transition-transform duration-200 group-hover:scale-110 shadow-inner",
                          gradient,
                          themeColor === id && "ring-2 ring-white/20"
                        )}
                      />
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Updates Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary/60" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Updates</h3>
                    <p className="text-xs text-muted-foreground">
                      Check for application updates
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border border-border/20">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-sm">Auto Updates</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Checks daily for new versions
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="border-border/40"
                  >
                    <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    {isCheckingUpdate ? 'Checking…' : 'Check Now'}
                  </Button>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* JSON Viewer Settings Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary/60" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">JSON Viewer</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure JSON response display
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 bg-muted/30 rounded-lg p-4 border border-border/20">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-sm">Auto-expand Depth</Label>
                      <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                        {jsonViewer.maxAutoExpandDepth}
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[data-orientation=horizontal]]:bg-muted"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Maximum nesting depth to automatically expand
                    </p>
                  </div>
                  <Separator className="bg-border/20" />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-sm">Max Array Size</Label>
                      <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                        {jsonViewer.maxAutoExpandArraySize}
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[data-orientation=horizontal]]:bg-muted"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Arrays larger than this will be collapsed by default
                    </p>
                  </div>
                  <Separator className="bg-border/20" />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-sm">Max Object Size</Label>
                      <span className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md">
                        {jsonViewer.maxAutoExpandObjectSize}
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[data-orientation=horizontal]]:bg-muted"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Objects with more properties will be collapsed by default
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Future Settings Sections */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-muted-foreground/40" />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground/60">Request Defaults</h3>
                    <p className="text-xs text-muted-foreground/40">
                      Configure default settings for new requests
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground/40 italic bg-muted/20 rounded-lg p-3 border border-border/10 text-center">
                  Coming soon…
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }
)
SettingsPanel.displayName = "SettingsPanel"