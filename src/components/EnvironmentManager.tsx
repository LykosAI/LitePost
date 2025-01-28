import { PlusCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEnvironmentStore } from "@/store/environments"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KeyValueList } from "./KeyValueList"

export function EnvironmentManager() {
  const {
    environments,
    activeEnvironmentId,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironmentStore()

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
            <SelectContent className="dark bg-popover text-popover-foreground">
              <SelectItem value="null">None</SelectItem>
              {environments.map((env) => (
                <SelectItem 
                  key={env.id} 
                  value={env.id}
                  className="hover:bg-accent/50"
                >
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {environments.map((env, index) => (
          <div key={env.id} className="space-y-4 p-4 rounded-lg border border-border bg-card/50 shadow-sm">
            <div className="flex items-center gap-2">
              <Input
                value={env.name}
                onChange={(e) => handleUpdateName(env.id, e.target.value)}
                className="flex-1 bg-background text-foreground"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteEnvironment(env.id)}
                className="text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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