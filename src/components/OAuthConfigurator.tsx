import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { OAuth2Config, OAuth2GrantType } from "@/types"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useOAuth2TokenActions } from "@/hooks/useOAuth2TokenActions"
import { useEnvironmentStore } from "@/store/environments"
import { fetchOidcDiscovery } from "@/utils/oidcDiscovery"
import { Loader2, KeyRound, RefreshCw, Globe, Shield, Wand2 } from "lucide-react"
import { useState } from "react"

interface OAuthConfiguratorProps {
  oauth2: OAuth2Config
  onOAuth2Change: (config: OAuth2Config) => void
}

const GRANT_TYPES: { value: OAuth2GrantType; label: string; description: string }[] = [
  { value: 'authorization_code', label: 'Authorization Code', description: 'Redirect-based flow for user auth' },
  { value: 'client_credentials', label: 'Client Credentials', description: 'Server-to-server auth' },
  { value: 'password', label: 'Password', description: 'Direct username/password auth' },
]

/** A small section wrapper with a label and icon */
function FormSection({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary/50" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</span>
      </div>
      <div className="space-y-2.5 bg-muted/20 rounded-lg p-3 border border-border/10">
        {children}
      </div>
    </div>
  )
}

/** A labeled input field */
function FormField({ label, hint, children }: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/50 leading-snug">{hint}</p>}
    </div>
  )
}

export function OAuthConfigurator({ oauth2, onOAuth2Change }: OAuthConfiguratorProps) {
  const themeClass = useThemeClass()
  const { getVariable } = useEnvironmentStore()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null)
  const {
    isLoading,
    tokenError,
    getNewToken,
    refreshToken,
    clearToken,
    isExpired,
    expiresIn,
  } = useOAuth2TokenActions({ oauth2, onOAuth2Change })

  const updateField = (field: keyof OAuth2Config, value: string) => {
    onOAuth2Change({ ...oauth2, [field]: value })
  }

  const handleDiscover = async () => {
    if (!oauth2.discoveryUrl?.trim() || isDiscovering) return
    setIsDiscovering(true)
    setDiscoveryError(null)
    setDiscoveryNote(null)

    try {
      // Support {{var}} in the discovery URL, like every other field
      const resolvedUrl = oauth2.discoveryUrl.replace(/\{\{([^}]+)\}\}/g, (match, name) =>
        getVariable(String(name).trim()) ?? match
      )
      const discovery = await fetchOidcDiscovery(resolvedUrl)

      const updates: Partial<OAuth2Config> = {}
      if (discovery.authorizationEndpoint) updates.authUrl = discovery.authorizationEndpoint
      if (discovery.tokenEndpoint) updates.tokenUrl = discovery.tokenEndpoint
      if (!oauth2.scope && discovery.scopesSupported?.length) {
        const preferred = ['openid', 'profile', 'email'].filter((scope) =>
          discovery.scopesSupported!.includes(scope)
        )
        if (preferred.length > 0) updates.scope = preferred.join(' ')
      }

      onOAuth2Change({ ...oauth2, ...updates })
      const filled = [
        updates.authUrl && 'authorization URL',
        updates.tokenUrl && 'token URL',
        updates.scope && 'scope',
      ].filter(Boolean)
      setDiscoveryNote(`Filled ${filled.join(', ')}`)
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsDiscovering(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Grant Type — always visible, stands alone */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Grant Type</label>
        <Select
          value={oauth2.grantType}
          onValueChange={(value: OAuth2GrantType) => onOAuth2Change({ ...oauth2, grantType: value })}
        >
          <SelectTrigger className="bg-secondary/40 border-border/40">
            <SelectValue placeholder="Grant Type" />
          </SelectTrigger>
          <SelectContent className={`${themeClass} bg-popover/95 backdrop-blur-xl border-border/40 shadow-xl`}>
            {GRANT_TYPES.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                className="hover:bg-accent/15 focus:bg-accent/15 text-foreground"
              >
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-[11px] text-muted-foreground">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Provider Configuration ──────────────────────── */}
      <FormSection icon={Globe} title="Provider">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <FormField label="Discovery URL">
              <Input
                placeholder="https://auth.example.com — or the full .well-known URL"
                value={oauth2.discoveryUrl || ''}
                onChange={(e) => updateField('discoveryUrl', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleDiscover() }}
                className="font-mono text-[13px] bg-background/50"
              />
            </FormField>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDiscover}
            disabled={isDiscovering || !oauth2.discoveryUrl?.trim()}
            className="h-9 border-border/40 shrink-0"
            data-testid="oidc-discover-button"
          >
            {isDiscovering ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Wand2 size={14} className="mr-1.5" />
            )}
            Auto-fill
          </Button>
        </div>
        {discoveryError && (
          <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1 break-all">⚠ {discoveryError}</p>
        )}
        {discoveryNote && (
          <p className="text-[11px] text-primary bg-primary/10 rounded px-2 py-1">✓ {discoveryNote}</p>
        )}

        {oauth2.grantType === 'authorization_code' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Authorization URL">
                <Input
                  placeholder="https://provider.com/oauth/authorize"
                  value={oauth2.authUrl || ''}
                  onChange={(e) => updateField('authUrl', e.target.value)}
                  className="font-mono text-[13px] bg-background/50"
                />
              </FormField>
              <FormField label="Token URL">
                <Input
                  placeholder="https://provider.com/oauth/token"
                  value={oauth2.tokenUrl || ''}
                  onChange={(e) => updateField('tokenUrl', e.target.value)}
                  className="font-mono text-[13px] bg-background/50"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Callback URL"
                hint="Register as a redirect URI with your provider — blank uses the default."
              >
                <Input
                  placeholder="http://localhost:17823/callback (default)"
                  value={oauth2.redirectUri || ''}
                  onChange={(e) => updateField('redirectUri', e.target.value)}
                  className="font-mono text-[13px] bg-background/50"
                />
              </FormField>
              <FormField label="Scope">
                <Input
                  placeholder="openid profile email (space-separated)"
                  value={oauth2.scope || ''}
                  onChange={(e) => updateField('scope', e.target.value)}
                  className="font-mono text-[13px] bg-background/50"
                />
              </FormField>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Token URL">
              <Input
                placeholder="https://provider.com/oauth/token"
                value={oauth2.tokenUrl || ''}
                onChange={(e) => updateField('tokenUrl', e.target.value)}
                className="font-mono text-[13px] bg-background/50"
              />
            </FormField>
            <FormField label="Scope">
              <Input
                placeholder="openid profile email (space-separated)"
                value={oauth2.scope || ''}
                onChange={(e) => updateField('scope', e.target.value)}
                className="font-mono text-[13px] bg-background/50"
              />
            </FormField>
          </div>
        )}

        {/* PKCE toggle — auth code only */}
        {oauth2.grantType === 'authorization_code' && (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Label className="text-sm text-foreground cursor-pointer">Use PKCE</Label>
              <p className="text-[11px] text-muted-foreground/50">Recommended for public clients</p>
            </div>
            <Switch
              checked={oauth2.usePkce ?? true}
              onCheckedChange={(checked) => onOAuth2Change({ ...oauth2, usePkce: checked })}
            />
          </div>
        )}
      </FormSection>

      {/* ── Credentials ──────────────────────── */}
      <FormSection icon={Shield} title="Credentials">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Client ID">
            <Input
              placeholder="Client ID"
              value={oauth2.clientId || ''}
              onChange={(e) => updateField('clientId', e.target.value)}
              className="bg-background/50"
            />
          </FormField>
          <FormField label="Client Secret">
            <Input
              type="password"
              placeholder="Optional"
              value={oauth2.clientSecret || ''}
              onChange={(e) => updateField('clientSecret', e.target.value)}
              className="bg-background/50"
            />
          </FormField>
        </div>

        {/* Username/Password - for Password grant only */}
        {oauth2.grantType === 'password' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <FormField label="Username">
              <Input
                placeholder="Username"
                value={oauth2.username || ''}
                onChange={(e) => updateField('username', e.target.value)}
                className="bg-background/50"
              />
            </FormField>
            <FormField label="Password">
              <Input
                type="password"
                placeholder="Password"
                value={oauth2.password || ''}
                onChange={(e) => updateField('password', e.target.value)}
                className="bg-background/50"
              />
            </FormField>
          </div>
        )}
      </FormSection>

      {/* ── Token Status ──────────────────────── */}
      {oauth2.accessToken && (
        <FormSection icon={KeyRound} title="Token">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status</span>
            {isExpired ? (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Active</Badge>
            )}
            {expiresIn !== null && !isExpired && (
              <span className="text-xs text-muted-foreground ml-auto">
                Expires in {expiresIn > 3600 ? `${Math.round(expiresIn / 3600)}h` : `${Math.round(expiresIn / 60)}m`}
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground/70 bg-background/30 rounded px-2 py-1.5 truncate">
            {oauth2.tokenType || 'Bearer'} {oauth2.accessToken.substring(0, 50)}…
          </div>
        </FormSection>
      )}

      {/* Error */}
      {tokenError && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20 break-all">
          ⚠ {tokenError}
        </div>
      )}

      {/* ── Actions ──────────────────────── */}
      <div className="flex gap-2">
        <Button
          onClick={getNewToken}
          disabled={isLoading || !oauth2.clientId}
          size="sm"
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Getting Token…
            </>
          ) : (
            <>
              <KeyRound size={14} className="mr-2" />
              Get Access Token
            </>
          )}
        </Button>

        {oauth2.refreshToken && (
          <Button
            onClick={refreshToken}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="border-border/40"
          >
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </Button>
        )}

        {oauth2.accessToken && (
          <Button
            onClick={clearToken}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
