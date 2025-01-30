import { CopyButton } from "./CopyButton"

interface HeadersViewProps {
  headers: Record<string, string>
}

export function HeadersView({ headers }: HeadersViewProps) {
  const formattedHeaders = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  return (
    <div className="relative bg-muted rounded-md p-1.5 mb-2">
      <CopyButton 
        content={formattedHeaders}
        className="absolute right-2 top-2 z-10"
      />
      <pre className="text-sm font-mono whitespace-pre-wrap break-all">
        {formattedHeaders}
      </pre>
    </div>
  )
} 