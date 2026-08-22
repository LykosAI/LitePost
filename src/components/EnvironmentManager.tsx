import { Globe, PlusCircle, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEnvironmentStore } from "@/store/environments"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KeyValueList } from "./KeyValueList"
import { useThemeClass } from "@/hooks/useThemeClass"

export function EnvironmentManager() {
  const {
    environments,
    activeEnvironmentId,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironmentStore()
  const themeClass = useThemeClass()

  const handleAddEnvironment = () => {
    addEnvironment("New Environment")
  }

  const handleUpdateVariables = (id: string, variables: Record<string, string>) => {
    updateEnvironment(id, { variables })
  }

  const handleUpdateName = (id: string, name: string) => {
    updateEnvironment(id, { name })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Environments</h3>
          <p className="text-sm text-muted-foreground">
            Manage environment variables for your requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddEnvironment}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Environment
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-medium text-foreground">
            Active Environment
          </Label>
          <Select
            value={activeEnvironmentId || "null"}
            onValueChange={(value) => setActiveEnvironment(value === "null" ? null : value)}
          >
            <SelectTrigger className="w-full bg-background text-foreground">
              <SelectValue placeholder="No environment selected" />
            </SelectTrigger>
            <SelectContent className={`${themeClass} bg-background border-border`}>
              <SelectItem value="null" className="hover:bg-accent focus:bg-accent text-foreground">None</SelectItem>
              {environments.map((env) => (
                <SelectItem 
                  key={env.id} 
                  value={env.id}
                  className="hover:bg-accent focus:bg-accent text-foreground"
                >
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {environments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center rounded-lg border border-dashed border-border/40">
            <Globe className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No environments yet</p>
            <p className="text-xs text-muted-foreground/60 max-w-[28ch]">
              Create one to use {'{{variables}}'} like base URLs and tokens across requests.
            </p>
          </div>
        )}

        {environments.map((env, index) => (
          <div key={env.id} className="space-y-4 p-4 rounded-lg border border-border bg-card/50 shadow-sm">
            <div className="flex items-center gap-2">
              <Input
                value={env.name}
                onChange={(e) => handleUpdateName(env.id, e.target.value)}
                aria-label={`Environment name ${env.name}`}
                className="flex-1 bg-background text-foreground"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={`Delete ${env.name}`}
                    aria-label={`Delete environment ${env.name}`}
                    className="text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={`${themeClass} bg-background border-border/40 shadow-2xl rounded-2xl`}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground font-bold">Delete Environment</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will permanently delete "{env.name}" and its {Object.keys(env.variables).length} variable{Object.keys(env.variables).length === 1 ? '' : 's'}.
                      {env.id === activeEnvironmentId && ' It is the active environment — any {{variable}} references will stop resolving.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-secondary/50 text-foreground hover:bg-secondary border-none rounded-xl transition-colors">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteEnvironment(env.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl transition-all shadow-lg shadow-destructive/20"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <KeyValueList
              envIndex={index}
              items={Object.entries(env.variables).map(([key, value]) => ({ 
                key, 
                value,
                enabled: true 
              }))}
              onItemsChange={(items) => {
                const variables = Object.fromEntries(
                  items.map((item) => [item.key, item.value])
                )
                handleUpdateVariables(env.id, variables)
              }}
              keyPlaceholder="Variable name"
              valuePlaceholder="Value"
            />
          </div>
        ))}
      </div>
    </div>
  )
} 