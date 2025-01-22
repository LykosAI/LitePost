import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Response {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  error?: string
}

interface ResponsePanelProps {
  response: Response | null
}

export function ResponsePanel({ response }: ResponsePanelProps) {
  const isErrorStatus = response?.status && response.status >= 400
  const statusClass = isErrorStatus ? "text-red-400 font-medium" : "text-muted-foreground"

  return (
    <Card className="flex-1 p-4 min-h-0">
      <Tabs defaultValue="response" className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>
          {response && !response.error && (
            <div className={`text-sm ${statusClass}`}>
              Status: {response.status} {response.statusText}
            </div>
          )}
        </div>
        <TabsContent value="response" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-scrollbar]]:w-4 [&_[data-radix-scroll-area-scrollbar]]:ml-2 [&_[data-radix-scroll-area-thumb]]:rounded-sm [&_[data-radix-scroll-area-thumb]]:bg-secondary">
            <div className="bg-muted rounded-md p-2 mr-2">
              {response?.error ? (
                <pre className="text-sm text-red-400 break-all overflow-wrap-anywhere">
                  Error: {response.error}
                </pre>
              ) : response ? (
                <pre className={`text-sm whitespace-pre-wrap break-all overflow-wrap-anywhere ${isErrorStatus ? "text-red-400" : ""}`}>
                  {response.body}
                </pre>
              ) : (
                <pre className="text-sm">
                  No response yet
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="headers" className="flex-1 mt-0 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-scrollbar]]:w-4 [&_[data-radix-scroll-area-scrollbar]]:ml-2 [&_[data-radix-scroll-area-thumb]]:rounded-sm [&_[data-radix-scroll-area-thumb]]:bg-secondary">
            <div className="bg-muted rounded-md p-2 mr-2">
              {response ? (
                <pre className="text-sm whitespace-pre-wrap">
                  {Object.entries(response.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')}
                </pre>
              ) : (
                <pre className="text-sm">No headers yet</pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 