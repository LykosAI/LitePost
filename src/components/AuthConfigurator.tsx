import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AuthConfig, AuthType } from "@/types"
import { useThemeClass } from "@/hooks/useThemeClass"
import { OAuthConfigurator } from "./OAuthConfigurator"
import { VariablePeek } from "./VariablePeek"
import { ShieldOff, KeyRound, Lock, Key, ShieldCheck } from "lucide-react"

interface AuthConfiguratorProps {
  auth: AuthConfig
  onAuthChange: (auth: AuthConfig) => void
  /**
   * Identifies whose auth this is — a request tab id, or `collection:<id>`.
   * Passed through so an in-flight OAuth sign-in is scoped to it rather than to
   * this component, which unmounts whenever the auth type changes.
   */
  flowKey?: string
}

const AUTH_TYPES = [
  { value: 'none', label: 'No Auth', icon: ShieldOff },
  { value: 'basic', label: 'Basic Auth', icon: Lock },
  { value: 'bearer', label: 'Bearer Token', icon: KeyRound },
  { value: 'api-key', label: 'API Key', icon: Key },
  { value: 'oauth2', label: 'OAuth 2.0', icon: ShieldCheck },
]

export function AuthConfigurator({ auth, onAuthChange, flowKey }: AuthConfiguratorProps) {
  const themeClass = useThemeClass()
  // Every auth field that supports {{var}} substitution, for the peek badge
  const authText = [
    auth.username, auth.password, auth.token, auth.key, auth.value,
    auth.oauth2?.clientId, auth.oauth2?.clientSecret, auth.oauth2?.scope,
    auth.oauth2?.authUrl, auth.oauth2?.tokenUrl, auth.oauth2?.discoveryUrl,
    auth.oauth2?.username, auth.oauth2?.password,
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={auth.type} onValueChange={(value: AuthType) => onAuthChange({ ...auth, type: value })}>
        <SelectTrigger className="w-[200px] bg-secondary/40 border-border/40">
          <SelectValue placeholder="Authentication Type" />
        </SelectTrigger>
        <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
          {AUTH_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <SelectItem
                key={type.value}
                value={type.value}
                className="hover:bg-accent/15 focus:bg-accent/15 text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {type.label}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
        </Select>
        <VariablePeek text={authText} />
      </div>

      {auth.type === 'none' && (
        <div className="flex items-center gap-3 text-muted-foreground/50 bg-muted/20 rounded-lg px-4 py-3 border border-border/10">
          <ShieldOff className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-muted-foreground/60">No authentication</p>
            <p className="text-xs text-muted-foreground/40">This request will be sent without any auth credentials.</p>
          </div>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-3 bg-muted/20 rounded-lg p-4 border border-border/10">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <Input
              placeholder="Username"
              value={auth.username || ''}
              onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="Password"
              value={auth.password || ''}
              onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
              className="bg-background/50"
            />
          </div>
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="space-y-1.5 bg-muted/20 rounded-lg p-4 border border-border/10">
          <label className="text-xs font-medium text-muted-foreground">Token</label>
          <Input
            placeholder="Bearer Token"
            value={auth.token || ''}
            onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
            className="font-mono text-[13px] bg-background/50"
          />
          <p className="text-[11px] text-muted-foreground/50 pt-0.5">
            The token will be sent as <code className="text-primary/60 bg-primary/5 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="space-y-3 bg-muted/20 rounded-lg p-4 border border-border/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Key</label>
              <Input
                placeholder="Key"
                value={auth.key || ''}
                onChange={(e) => onAuthChange({ ...auth, key: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <Input
                placeholder="Value"
                value={auth.value || ''}
                onChange={(e) => onAuthChange({ ...auth, value: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Add to</label>
            <Select
              value={auth.addTo || 'header'}
              onValueChange={(value: 'header' | 'query') => onAuthChange({ ...auth, addTo: value })}
            >
              <SelectTrigger className="w-[200px] bg-background/50 border-border/40">
                <SelectValue placeholder="Add to" />
              </SelectTrigger>
              <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
                <SelectItem value="header" className="hover:bg-accent/15 focus:bg-accent/15 text-foreground">
                  Header
                </SelectItem>
                <SelectItem value="query" className="hover:bg-accent/15 focus:bg-accent/15 text-foreground">
                  Query Parameter
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {auth.type === 'oauth2' && (
        <OAuthConfigurator
          oauth2={auth.oauth2 || { grantType: 'authorization_code', clientId: '' }}
          onOAuth2Change={(oauth2) => onAuthChange({ ...auth, oauth2 })}
          flowKey={flowKey}
        />
      )}
    </div>
  )
} 