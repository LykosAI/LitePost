import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Beaker } from "lucide-react"
import { EnvironmentManager } from "./EnvironmentManager"
import { forwardRef } from "react"

interface EnvironmentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EnvironmentPanel = forwardRef<HTMLButtonElement, EnvironmentPanelProps>(
  ({ open, onOpenChange }, ref) => {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-none hover:bg-muted"
          >
            <Beaker className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          className="dark w-[600px] sm:w-[800px] sm:max-w-none border-l border-border bg-background text-foreground [&_button>svg]:text-foreground [&_.close-button]:hover:bg-muted/60"
          side="right"
        >
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