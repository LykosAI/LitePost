import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EnvironmentManager } from "./EnvironmentManager"
import { forwardRef } from "react"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useResizablePanel } from "@/hooks/useResizablePanel"

interface EnvironmentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EnvironmentPanel = forwardRef<HTMLDivElement, EnvironmentPanelProps>(
  ({ open, onOpenChange }, _ref) => {
    const themeClass = useThemeClass()
    const { width, isDragging, setIsDragging } = useResizablePanel(600, 400)

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={`${themeClass} w-full sm:max-w-none border-l border-border bg-background text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60 ${isDragging ? "transition-none !duration-0" : ""}`}
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
            <SheetTitle className="text-foreground">Environment Manager</SheetTitle>
            <SheetDescription>Manage your environment variables and configurations</SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100vh-5rem)] pr-4 overflow-y-auto">
            <div className="py-6">
              <EnvironmentManager />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }
)
EnvironmentPanel.displayName = "EnvironmentPanel" 