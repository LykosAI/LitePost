import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StreamingResponse } from "@/types"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSettingsStore } from "@/store/settings"
import { CopyButton } from "./CopyButton"
import { CollapsibleJSON } from "./CollapsibleJSON"
import { HeadersView } from "./HeadersView"
import { PlayIcon, PauseIcon, AlertCircle } from "lucide-react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { tryParseStreamingJson } from "@/utils/streaming"

interface ResponseStreamerProps {
  streaming: StreamingResponse | null
  onCancel: () => void
}

export function ResponseStreamer({ 
  streaming,
  onCancel
}: ResponseStreamerProps) {
  const [activeTab, setActiveTab] = useState("stream")
  const [isPaused, setIsPaused] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isErrorStatus = streaming?.status && streaming.status >= 400
  const { jsonViewer } = useSettingsStore()

  const parsedJSON = useMemo(() => {
    if (!streaming?.currentContent) {
      return null
    }

    const contentType = streaming.headers["content-type"] || ""
    if (!contentType.includes("application/json")) {
      return null
    }

    return tryParseStreamingJson(streaming.currentContent)
  }, [streaming?.currentContent, streaming?.headers])

  const isJsonContent = parsedJSON !== null

  useEffect(() => {
    if (!streaming?.currentContent || isPaused) {
      return
    }

    requestAnimationFrame(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
      }
    })
  }, [streaming?.currentContent, streaming?.chunks.length, isPaused])

  const togglePause = () => {
    setIsPaused((prev) => !prev)
  }

  if (!streaming) {
    return null
  }

  const statusClass = isErrorStatus ? "text-red-400 font-medium" : "text-muted-foreground"
  const getElapsedTime = () => {
    if (!streaming.timing) return "0ms"
    return `${Math.round(streaming.timing.duration)}ms`
  }

  return (
    <Card className="h-full flex flex-col relative">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex flex-col gap-2 ps-4 pt-3 pb-1">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <TabsList>
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-4 ps-1 pe-4 text-sm items-center">
              <span className={statusClass}>Status: {streaming.statusText}</span>
              <Badge 
                variant={streaming.isComplete ? "outline" : "default"} 
                className={streaming.isComplete ? "" : "animate-pulse"}
              >
                {streaming.isComplete ? "Complete" : `Streaming (${streaming.chunks.length} chunks)...`}
              </Badge>
              <span className="text-muted-foreground">
                Time: {getElapsedTime()}
              </span>
            </div>
          </div>
        </div>
        <TabsContent value="stream" className="flex-1 mt-0 px-4 pt-2 min-h-0 relative">
          <div className="absolute top-3 right-6 z-10 flex gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={togglePause}
              title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
            >
              {isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={onCancel}
              title="Cancel request"
            >
              <AlertCircle size={16} />
            </Button>
            {streaming.currentContent && (
              <CopyButton 
                content={streaming.currentContent}
                className="z-10"
              />
            )}
          </div>
          <ScrollArea 
            className="h-full pr-3 [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80"
            ref={scrollAreaRef}
          >
            <div className="relative bg-muted rounded-md p-1.5 mb-2">
              {streaming.error ? (
                <pre className="text-sm text-red-400 break-all overflow-wrap-anywhere">
                  Error: {streaming.error}
                </pre>
              ) : (
                isJsonContent && parsedJSON ? (
                  <div className="text-sm break-all">
                    <CollapsibleJSON 
                      data={parsedJSON}
                      {...jsonViewer}
                    />
                  </div>
                ) : (
                  <pre
                    className="text-sm font-mono text-foreground p-0 m-0 whitespace-pre overflow-visible"
                    style={{ 
                      fontFamily: 'monospace', 
                      lineHeight: '1.5',
                      tabSize: 2
                    }}
                  >
                    {streaming.currentContent || ""}
                  </pre>
                )
              )}
              
              {/* Visual indicator for new chunks */}
              {!streaming.isComplete && streaming.chunks.length > 0 && (
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse absolute bottom-1 right-1"></div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="headers" className="flex-1 mt-0 px-4 pt-2 min-h-0">
          <ScrollArea className="h-full [&_[data-radix-scroll-area-thumb]]:bg-accent [&_[data-radix-scroll-area-thumb]]:hover:bg-accent/80">
            <HeadersView headers={streaming.headers} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  )
} 
