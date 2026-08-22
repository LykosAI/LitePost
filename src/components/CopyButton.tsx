import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface CopyButtonProps {
  content: string
  className?: string
  /** Accessible name; defaults to "Copy to clipboard". */
  label?: string
}

export function CopyButton({ content, className = "", label = "Copy to clipboard" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Clipboard access can be denied (permissions, non-secure context) —
      // surface it instead of silently doing nothing.
      toast.error("Couldn't copy to clipboard")
      return
    }
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={`h-8 w-8 ${className}`}
      onClick={copy}
      title={label}
      aria-label={label}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}
