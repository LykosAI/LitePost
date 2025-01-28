import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import { Cookie } from "@/types"

interface CookieEditorProps {
  cookies: Cookie[]
  onCookiesChange: (cookies: Cookie[]) => void
}

export function CookieEditor({ cookies, onCookiesChange }: CookieEditorProps) {
  const updateCookie = (index: number, field: keyof Cookie, value: string | boolean) => {
    const newCookies = [...cookies]
    newCookies[index] = { ...newCookies[index], [field]: value }
    onCookiesChange(newCookies)
  }

  const removeCookie = (index: number) => {
    const newCookies = cookies.filter((_, i) => i !== index)
    onCookiesChange(newCookies)
  }

  const addCookie = () => {
    onCookiesChange([...cookies, { name: '', value: '' }])
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
        {cookies.map((cookie, index) => (
          <React.Fragment key={index}>
            <Input
              value={cookie.name}
              onChange={(e) => updateCookie(index, 'name', e.target.value)}
              placeholder="Cookie name"
            />
            <Input
              value={cookie.value}
              onChange={(e) => updateCookie(index, 'value', e.target.value)}
              placeholder="Cookie value"
            />
            <Button variant="ghost" onClick={() => removeCookie(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </React.Fragment>
        ))}
      </div>
      <Button onClick={addCookie}>
        <Plus className="h-4 w-4 mr-2" /> Add Cookie
      </Button>
    </div>
  )
} 
