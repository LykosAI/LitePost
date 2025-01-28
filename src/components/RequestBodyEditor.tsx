import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain",
  "text/html",
  "multipart/form-data",
]

interface RequestBodyEditorProps {
  body: string
  contentType: string
  onBodyChange: (body: string) => void
  onContentTypeChange: (contentType: string) => void
}

export function RequestBodyEditor({
  body,
  contentType,
  onBodyChange,
  onContentTypeChange,
}: RequestBodyEditorProps) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <Select value={contentType} onValueChange={onContentTypeChange}>
        <SelectTrigger className="bg-background border-input focus:ring-0 focus-visible:ring-1">
          <SelectValue placeholder="Content Type" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-border">
          {CONTENT_TYPES.map((type) => (
            <SelectItem 
              key={type} 
              value={type}
              className="hover:bg-muted focus:bg-muted text-white"
            >
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 min-h-0 rounded-md border">
        <Textarea
          placeholder="Enter request body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onKeyDown={(e) => {
            const bracketPairs: { [key: string]: string } = {
              '{': '}',
              '[': ']',
              '(': ')',
            }
            
            if (e.key in bracketPairs) {
              e.preventDefault()
              const textarea = e.currentTarget
              const { selectionStart, selectionEnd } = textarea
              const openBracket = e.key
              const closeBracket = bracketPairs[openBracket]
              
              // Get current cursor position and text
              const currentText = textarea.value
              const beforeCursor = currentText.substring(0, selectionStart)
              const afterCursor = currentText.substring(selectionEnd)
              
              // Insert brackets and move cursor between them
              const newText = beforeCursor + openBracket + closeBracket + afterCursor
              onBodyChange(newText)
              
              // Set cursor position between brackets (needs to be done after React re-render)
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = selectionStart + 1
              }, 0)
            }
          }}
          className="h-full resize-none border-0 focus-visible:ring-0"
        />
      </div>
    </div>
  )
} 