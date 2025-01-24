import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AuthConfig, AuthType } from "@/types"

interface AuthConfiguratorProps {
  auth: AuthConfig
  onAuthChange: (auth: AuthConfig) => void
}

const AUTH_TYPES = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
]

export function AuthConfigurator({ auth, onAuthChange }: AuthConfiguratorProps) {
  return (
    <div className="space-y-4">
      <Select value={auth.type} onValueChange={(value: AuthType) => onAuthChange({ ...auth, type: value })}>
        <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
          <SelectValue placeholder="Authentication Type" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-border">
          {AUTH_TYPES.map((type) => (
            <SelectItem
              key={type.value}
              value={type.value}
              className="hover:bg-muted focus:bg-muted text-white"
            >
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {auth.type === 'basic' && (
        <div className="space-y-2">
          <Input
            placeholder="Username"
            value={auth.username || ''}
            onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Password"
            value={auth.password || ''}
            onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
          />
        </div>
      )}

      {auth.type === 'bearer' && (
        <Input
          placeholder="Bearer Token"
          value={auth.token || ''}
          onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
        />
      )}

      {auth.type === 'api-key' && (
        <div className="space-y-2">
          <Input
            placeholder="Key"
            value={auth.key || ''}
            onChange={(e) => onAuthChange({ ...auth, key: e.target.value })}
          />
          <Input
            placeholder="Value"
            value={auth.value || ''}
            onChange={(e) => onAuthChange({ ...auth, value: e.target.value })}
          />
          <Select 
            value={auth.addTo || 'header'} 
            onValueChange={(value: 'header' | 'query') => onAuthChange({ ...auth, addTo: value })}
          >
            <SelectTrigger className="w-[200px] bg-background border-input focus:ring-0 focus-visible:ring-1">
              <SelectValue placeholder="Add to" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-border">
              <SelectItem value="header" className="hover:bg-muted focus:bg-muted text-white">
                Header
              </SelectItem>
              <SelectItem value="query" className="hover:bg-muted focus:bg-muted text-white">
                Query Parameter
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
} 