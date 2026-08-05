import { useEffect, useMemo, useState, memo } from "react"
import { Button } from "./ui/button"
import { ChevronRight, ChevronDown } from "lucide-react"

// Cap children rendered per node so expanding huge arrays stays fast;
// a "Show more" row reveals the rest in chunks.
const CHILDREN_PAGE_SIZE = 100

interface CollapsibleJSONProps {
  data: any
  level?: number
  isExpanded?: boolean
  maxAutoExpandDepth?: number
  maxAutoExpandArraySize?: number
  maxAutoExpandObjectSize?: number
}

// Memoize the JSON node to prevent unnecessary re-renders
export const CollapsibleJSON = memo(function CollapsibleJSON({ 
  data, 
  level = 0, 
  isExpanded = true,
  maxAutoExpandDepth = 2,
  maxAutoExpandArraySize = 10,
  maxAutoExpandObjectSize = 5
}: CollapsibleJSONProps) {
  const autoExpanded = useMemo(
    () => {
      const shouldAutoExpand = () => {
        if (level >= maxAutoExpandDepth) return false

        const isObject = typeof data === 'object' && data !== null
        if (!isObject) return true

        const entries = Object.entries(data)
        if (Array.isArray(data) && entries.length > maxAutoExpandArraySize) return false
        if (!Array.isArray(data) && entries.length > maxAutoExpandObjectSize) return false

        return true
      }

      return isExpanded && shouldAutoExpand()
    },
    [data, isExpanded, level, maxAutoExpandArraySize, maxAutoExpandDepth, maxAutoExpandObjectSize]
  )

  const [expanded, setExpanded] = useState(autoExpanded)
  const [visibleCount, setVisibleCount] = useState(CHILDREN_PAGE_SIZE)
  useEffect(() => {
    setExpanded(autoExpanded)
    setVisibleCount(CHILDREN_PAGE_SIZE)
  }, [autoExpanded, data])

  const isObject = typeof data === 'object' && data !== null
  const isArray = Array.isArray(data)

  if (!isObject) {
    return (
      <span className={typeof data === 'string'
        ? 'text-emerald-700 dark:text-green-400'
        : 'text-blue-700 dark:text-blue-400'}>
        {JSON.stringify(data)}
      </span>
    )
  }

  const entries = Object.entries(data)
  const isEmpty = entries.length === 0

  if (isEmpty) {
    return <span>{isArray ? '[]' : '{}'}</span>
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  return (
    <div className="relative" style={{ paddingLeft: level > 0 ? '0.5rem' : 0 }}>
      <div className="flex items-center gap-0.5 cursor-pointer hover:bg-muted/50 rounded px-0.5" onClick={toggleExpand}>
        <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
        <span>{isArray ? '[' : '{'}</span>
        {!expanded && (
          <span className="text-muted-foreground text-xs ml-1">
            {isArray ? `${entries.length} items` : `${entries.length} properties`}
          </span>
        )}
      </div>
      {expanded && (
        <div className="pl-3 border-l border-muted-foreground/20">
          {entries.slice(0, visibleCount).map(([key, value]) => (
            <div key={key} className="flex items-start py-0.5">
              <div className="flex-1 flex">
                <span className="text-amber-700 dark:text-yellow-400 whitespace-nowrap">
                  {!isArray && `"${key}"`}{isArray && key}
                </span>
                <span className="mx-1">:</span>
                <div className="flex-1 min-w-0">
                  <CollapsibleJSON
                    data={value}
                    level={level + 1}
                    maxAutoExpandDepth={maxAutoExpandDepth}
                    maxAutoExpandArraySize={maxAutoExpandArraySize}
                    maxAutoExpandObjectSize={maxAutoExpandObjectSize}
                  />
                </div>
              </div>
            </div>
          ))}
          {entries.length > visibleCount && (
            <button
              type="button"
              data-testid="json-show-more"
              onClick={(e) => {
                e.stopPropagation()
                setVisibleCount((count) => count + CHILDREN_PAGE_SIZE * 5)
              }}
              className="text-xs text-primary/80 hover:text-primary py-0.5 px-1 rounded hover:bg-primary/10 transition-colors"
            >
              … show {Math.min(entries.length - visibleCount, CHILDREN_PAGE_SIZE * 5)} more of {entries.length - visibleCount} hidden
            </button>
          )}
        </div>
      )}
      <div className={expanded ? "pl-3" : ""}>
        <span>{isArray ? ']' : '}'}</span>
      </div>
    </div>
  )
}) 
