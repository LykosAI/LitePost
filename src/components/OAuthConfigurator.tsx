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
import { detectEntraV1Url, fetchOidcDiscovery } from "@/utils/oidcDiscovery"
import { substituteVariables } from "@/utils/variables"
import { decodeToken } from "@/utils/jwt"
import { Loader2, KeyRound, RefreshCw, Globe, Shield, Wand2, X } from "lucide-react"
import { useMemo, useState } from "react"

interface OAuthConfiguratorProps {
  oauth2: OAuth2Config
  onOAuth2Change: (config: OAuth2Config) => void
  /** Scopes in-flight sign-in state to this tab or collection — see the store. */
  flowKey?: string
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

export function OAuthConfigurator({ oauth2, onOAuth2Change, flowKey }: OAuthConfiguratorProps) {
  const themeClass = useThemeClass()
  const { getVariable } = useEnvironmentStore()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null)
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null)
  const [entraV2Url, setEntraV2Url] = useState<string | null>(null)
  const [showAllClaims, setShowAllClaims] = useState(false)
  const decoded = useMemo(() => decodeToken(oauth2.accessToken), [oauth2.accessToken])
  const {
    isLoading,
    tokenError,
    getNewToken,
    refreshToken,
    clearToken,
    cancelTokenRequest,
    isExpired,
    expiresIn,
  } = useOAuth2TokenActions({ oauth2, onOAuth2Change, flowKey })

  const updateField = (field: keyof OAuth2Config, value: string) => {
    onOAuth2Change({ ...oauth2, [field]: value })
  }

  /**
   * Run discovery against an explicit URL rather than reading it off the prop.
   * The v2.0 switch below needs to discover against a URL it has only just
   * handed to the parent, which this render's `oauth2` does not know about yet.
   */
  const runDiscovery = async (rawUrl: string) => {
    if (!rawUrl.trim() || isDiscovering) return
    setIsDiscovering(true)
    setDiscoveryError(null)
    setDiscoveryNote(null)
    setDiscoveryWarning(null)
    setEntraV2Url(null)

    try {
      // Support {{var}} in the discovery URL, like every other field
      const resolvedUrl = substituteVariables(rawUrl, getVariable)
      const discovery = await fetchOidcDiscovery(resolvedUrl)

      const updates: Partial<OAuth2Config> = {}
      if (discovery.authorizationEndpoint) updates.authUrl = discovery.authorizationEndpoint
      if (discovery.tokenEndpoint) updates.tokenUrl = discovery.tokenEndpoint

      // Scope is deliberately NOT auto-filled for client credentials. The
      // discovery document's `scopes_supported` advertises what the identity
      // provider offers for OIDC sign-in — it says nothing about the API you
      // are actually calling. Filling in `openid profile email` yields a token
      // minted for the provider's own userinfo endpoint (on Entra, for
      // Microsoft Graph), which your API then rejects with a 401. Client
      // credentials in particular needs a resource-specific scope that only
      // the user knows, e.g. `api://<client-id>/.default`.
      if (!oauth2.scope && oauth2.grantType !== 'client_credentials' && discovery.scopesSupported?.length) {
        const preferred = ['openid', 'profile', 'email'].filter((scope) =>
          discovery.scopesSupported!.includes(scope)
        )
        if (preferred.length > 0) updates.scope = preferred.join(' ')
      }

      // rawUrl is carried through so the v2.0 switch is not undone by the
      // stale discoveryUrl still sitting on `oauth2`.
      onOAuth2Change({ ...oauth2, discoveryUrl: rawUrl, ...updates })
      const filled = [
        updates.authUrl && 'authorization URL',
        updates.tokenUrl && 'token URL',
        updates.scope && 'scope',
      ].filter(Boolean)
      setDiscoveryNote(`Filled ${filled.join(', ')}`)

      const v2Url = detectEntraV1Url(resolvedUrl)
      if (v2Url) {
        setEntraV2Url(v2Url)
        setDiscoveryWarning(
          'This is the Entra v1.0 discovery document. v1.0 selects the token audience with a ' +
          '`resource` parameter, which LitePost does not send — you will get a token, but for ' +
          'the wrong audience, and your API will answer 401. Use the v2.0 endpoint instead.'
        )
      } else if (!oauth2.scope && !updates.scope) {
        setDiscoveryWarning(
          'No scope set. Most providers need a scope naming the API you are calling ' +
          '(Entra: `api://<client-id>/.default`) — without it the token may be issued for ' +
          'a different audience and rejected with a 401.'
        )
      }
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleDiscover = () => runDiscovery(oauth2.discoveryUrl ?? '')

  /**
   * Swap in the v2.0 discovery URL and immediately re-run discovery against it.
   * The URL is passed explicitly rather than read back from `oauth2` because
   * the prop has not been updated yet at this point in the render cycle.
   */
  const applyEntraV2Url = () => {
    if (!entraV2Url) return
    const nextUrl = entraV2Url
    setEntraV2Url(null)
    setDiscoveryWarning(null)
    onOAuth2Change({ ...oauth2, discoveryUrl: nextUrl })
    void runDiscovery(nextUrl)
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
        {discoveryWarning && (
          <div className="text-[11px] text-amber-400 bg-amber-500/10 rounded px-2 py-1.5 space-y-1.5 border border-amber-500/20">
            <p className="leading-snug">⚠ {discoveryWarning}</p>
            {entraV2Url && (
              <Button
                size="sm"
                variant="outline"
                onClick={applyEntraV2Url}
                className="h-6 text-[11px] border-amber-500/30 hover:bg-amber-500/10"
                data-testid="use-entra-v2-button"
              >
                Use the v2.0 endpoint
              </Button>
            )}
          </div>
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

          {/*
            The claims answer "the provider gave me a token, so why is the API
            still saying 401?" — nearly always because `aud` names a different
            API, or because the token is app-only where a user token is wanted.
            Decoded locally and unverified; this is a read of what the token
            says about itself, not a trust decision.
          */}
          {decoded ? (
            <div className="space-y-2 pt-1">
              {decoded.highlights.map((claim) => (
                <div key={claim.label} className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-muted-foreground/70 shrink-0">{claim.label}</span>
                    <span className="text-[11px] font-mono text-foreground break-all">{claim.value}</span>
                  </div>
                  {claim.hint && (
                    <p className="text-[10px] text-muted-foreground/50 leading-snug">{claim.hint}</p>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowAllClaims((shown) => !shown)}
                className="text-[11px] text-primary hover:underline"
                data-testid="toggle-all-claims"
              >
                {showAllClaims ? 'Hide all claims' : `Show all ${Object.keys(decoded.claims).length} claims`}
              </button>

              {showAllClaims && (
                <pre className="text-[10px] font-mono bg-background/40 rounded p-2 overflow-x-auto max-h-56 overflow-y-auto">
                  {JSON.stringify(decoded.claims, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/50 leading-snug">
              Opaque token — no claims to decode. Check the audience with your API provider.
            </p>
          )}
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
              {cancelTokenRequest ? 'Waiting for sign-in…' : 'Getting Token…'}
            </>
          ) : (
            <>
              <KeyRound size={14} className="mr-2" />
              Get Access Token
            </>
          )}
        </Button>

        {/*
          Only the authorization code flow parks waiting on the browser, and it
          can wait forever: if the redirect URI is not registered the provider
          shows an error page and never redirects back, so nothing ever arrives
          on the callback listener.
        */}
        {cancelTokenRequest && (
          <Button
            onClick={cancelTokenRequest}
            size="sm"
            variant="outline"
            className="border-border/40"
            data-testid="cancel-token-request"
          >
            <X size={14} className="mr-1" />
            Cancel
          </Button>
        )}

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
