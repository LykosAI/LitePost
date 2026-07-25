import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Settings, RotateCw, Palette, Sliders, RefreshCw, Globe, ShieldCheck } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/store/settings"
import { useThemeStore, ThemeColor } from "@/store/theme"
import { useThemeClass } from "@/hooks/useThemeClass"
import { forwardRef, useState } from "react"
import { checkForUpdatesManually } from "./UpdateChecker"
import { cn } from "@/lib/utils"
import { useResizablePanel } from "@/hooks/useResizablePanel"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SettingsPanel = forwardRef<HTMLDivElement, SettingsPanelProps>(
  ({ open, onOpenChange }, _ref) => {
    const { jsonViewer, updateJSONViewerSettings, network: networkRaw, updateNetworkSettings } = useSettingsStore()
    const network = networkRaw ?? { timeout: 30, connectTimeout: 10, sslVerification: true, proxy: '' }
    const { color: themeColor, setColor: setThemeColor } = useThemeStore()
    const themeClass = useThemeClass()
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
    const { width, isDragging, setIsDragging } = useResizablePanel(480, 400)

    const handleCheckUpdate = async () => {
      setIsCheckingUpdate(true)
      try {
        await checkForUpdatesManually()
      } finally {
        setIsCheckingUpdate(false)
      }
    }

    const themes = [
      { id: 'amber' as ThemeColor, label: 'Night Desk', gradient: 'from-amber-400 to-orange-500' },
      { id: 'green' as ThemeColor, label: 'Green C', gradient: 'from-emerald-500 to-teal-600' },
      { id: 'schematic' as ThemeColor, label: 'Schematic', gradient: 'from-stone-100 to-blue-600' },
      { id: 'blue' as ThemeColor, label: 'Sapphire', gradient: 'from-blue-500 to-indigo-600' },
      { id: 'purple' as ThemeColor, label: 'Amethyst', gradient: 'from-violet-500 to-purple-600' },
      { id: 'black' as ThemeColor, label: 'Obsidian', gradient: 'from-zinc-500 to-zinc-800' },
    ]

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
                <div className="grid grid-cols-2 gap-3 p-1">
                  {themes.map(({ id, label, gradient }) => (
                    <button
                      key={id}
                      onClick={() => setThemeColor(id)}
                      className={cn(
                        "group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 overflow-hidden",
                        themeColor === id
                          ? 'bg-primary/5 border-primary shadow-sm'
                          : 'bg-secondary/20 border-border/40 hover:bg-secondary/40 hover:border-border/60'
                      )}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full bg-gradient-to-br transition-all duration-300 group-hover:scale-110 shadow-inner",
                            gradient,
                            themeColor === id && "ring-2 ring-background ring-offset-2 ring-offset-primary/40"
                          )}
                        />
                        <span className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          themeColor === id ? 'text-primary' : 'text-foreground/70 group-hover:text-foreground'
                        )}>
                          {label}
                        </span>
                      </div>
                      {themeColor === id && (
                        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 transition-opacity" />
                      )}
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
                <div className="flex items-center justify-between glass-card bg-secondary/10 p-4 border-border/30">
                  <div className="space-y-1">
                    <Label className="text-foreground text-[13px] font-semibold">Auto Updates</Label>
                    <p className="text-[11px] text-muted-foreground/80">
                      We check daily for new background patches
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="border-border/40 h-9 bg-background/40 hover:bg-secondary/60 shadow-sm"
                  >
                    <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span className="text-[13px] font-medium">{isCheckingUpdate ? 'Checking…' : 'Check Now'}</span>
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
                <div className="grid gap-6 glass-card bg-secondary/10 p-5 border-border/30">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-[13px] font-semibold">Auto-expand Depth</Label>
                      <span className="text-[11px] font-mono font-bold text-primary/90 bg-primary/15 px-2 py-0.5 rounded-md border border-primary/20">
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[role=slider]]:shadow-glow-sm cursor-col-resize"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Determine the deepest nesting level to automatically uncollapse.
                    </p>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-[13px] font-semibold">Max Array Size</Label>
                      <span className="text-[11px] font-mono font-bold text-primary/90 bg-primary/15 px-2 py-0.5 rounded-md border border-primary/20">
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[role=slider]]:shadow-glow-sm cursor-col-resize"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Arrays exceeding this size default to a collapsed view.
                    </p>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-[13px] font-semibold">Max Object Size</Label>
                      <span className="text-[11px] font-mono font-bold text-primary/90 bg-primary/15 px-2 py-0.5 rounded-md border border-primary/20">
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
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[role=slider]]:shadow-glow-sm cursor-col-resize"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Objects with expansive property lists will collapse to save space.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Network Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary/60" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Network</h3>
                    <p className="text-xs text-muted-foreground">
                      Default timeout, SSL, and proxy settings for all requests
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 glass-card bg-secondary/10 p-5 border-border/30">
                  {/* Timeout */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-[13px] font-semibold">Request Timeout</Label>
                      <span className="text-[11px] font-mono font-bold text-primary/90 bg-primary/15 px-2 py-0.5 rounded-md border border-primary/20">
                        {network.timeout === 0 ? 'None' : `${network.timeout}s`}
                      </span>
                    </div>
                    <Slider
                      value={[network.timeout]}
                      min={0}
                      max={300}
                      step={5}
                      onValueChange={([value]) =>
                        updateNetworkSettings({ timeout: value })
                      }
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[role=slider]]:shadow-glow-sm cursor-col-resize"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Maximum time for the entire request. Set to 0 for no timeout.
                    </p>
                  </div>
                  <Separator className="bg-border/30" />
                  {/* Connect Timeout */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-foreground text-[13px] font-semibold">Connection Timeout</Label>
                      <span className="text-[11px] font-mono font-bold text-primary/90 bg-primary/15 px-2 py-0.5 rounded-md border border-primary/20">
                        {network.connectTimeout === 0 ? 'None' : `${network.connectTimeout}s`}
                      </span>
                    </div>
                    <Slider
                      value={[network.connectTimeout]}
                      min={0}
                      max={60}
                      step={1}
                      onValueChange={([value]) =>
                        updateNetworkSettings({ connectTimeout: value })
                      }
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/80 [&_[role=slider]]:shadow-glow-sm cursor-col-resize"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Maximum time to establish a TCP connection.
                    </p>
                  </div>
                  <Separator className="bg-border/30" />
                  {/* SSL Verification */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                        <Label className="text-foreground text-[13px] font-semibold">SSL Certificate Verification</Label>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70">
                        Disable for self-signed certificates in development.
                      </p>
                    </div>
                    <Switch
                      checked={network.sslVerification}
                      onCheckedChange={(checked) =>
                        updateNetworkSettings({ sslVerification: checked })
                      }
                    />
                  </div>
                  <Separator className="bg-border/30" />
                  {/* Proxy */}
                  <div className="space-y-3.5">
                    <Label className="text-foreground text-[13px] font-semibold">Proxy URL</Label>
                    <Input
                      value={network.proxy}
                      onChange={(e) => updateNetworkSettings({ proxy: e.target.value })}
                      placeholder="http://proxy:8080 or socks5://proxy:1080"
                      className="bg-background/40 border-border/40 font-mono text-xs h-9"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Route all requests through a proxy. Leave empty for direct connections.
                    </p>
                  </div>
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