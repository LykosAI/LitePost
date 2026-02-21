import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OAuth2Config, OAuth2GrantType } from "@/types"
import { useThemeClass } from "@/hooks/useThemeClass"
import { useOAuth2TokenActions } from "@/hooks/useOAuth2TokenActions"
import { Loader2, KeyRound, RefreshCw } from "lucide-react"

interface OAuthConfiguratorProps {
  oauth2: OAuth2Config
  onOAuth2Change: (config: OAuth2Config) => void
}

const GRANT_TYPES: { value: OAuth2GrantType; label: string }[] = [
  { value: 'authorization_code', label: 'Authorization Code' },
  { value: 'client_credentials', label: 'Client Credentials' },
  { value: 'password', label: 'Password' },
]

export function OAuthConfigurator({ oauth2, onOAuth2Change }: OAuthConfiguratorProps) {
  const themeClass = useThemeClass()
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

  return (
    <div className="space-y-3">
      {/* Grant Type */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Grant Type</label>
        <Select
          value={oauth2.grantType}
          onValueChange={(value: OAuth2GrantType) => onOAuth2Change({ ...oauth2, grantType: value })}
        >
          <SelectTrigger className="bg-background border-input focus:ring-0 focus-visible:ring-1">
            <SelectValue placeholder="Grant Type" />
          </SelectTrigger>
          <SelectContent className={`${themeClass} bg-background border-border`}>
            {GRANT_TYPES.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                className="hover:bg-accent focus:bg-accent text-foreground"
              >
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Auth URL & PKCE - for Authorization Code only */}
      {oauth2.grantType === 'authorization_code' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Authorization URL</label>
            <Input
              placeholder="https://provider.com/oauth/authorize"
              value={oauth2.authUrl || ''}
              onChange={(e) => updateField('authUrl', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Callback URL</label>
            <Input
              placeholder="http://localhost:17823/callback (default)"
              value={oauth2.redirectUri || ''}
              onChange={(e) => updateField('redirectUri', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Register this URL as a redirect URI with your OAuth provider.
              Leave blank to use the default.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={oauth2.usePkce ?? true}
              onChange={(e) => onOAuth2Change({ ...oauth2, usePkce: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">Use PKCE</span>
            <span className="text-xs text-muted-foreground">(recommended)</span>
          </label>
        </>
      )}

      {/* Token URL - for all grant types */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Token URL</label>
        <Input
          placeholder="https://provider.com/oauth/token"
          value={oauth2.tokenUrl || ''}
          onChange={(e) => updateField('tokenUrl', e.target.value)}
        />
      </div>

      {/* Client ID */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Client ID</label>
        <Input
          placeholder="Client ID"
          value={oauth2.clientId || ''}
          onChange={(e) => updateField('clientId', e.target.value)}
        />
      </div>

      {/* Client Secret */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Client Secret</label>
        <Input
          type="password"
          placeholder="Client Secret (optional)"
          value={oauth2.clientSecret || ''}
          onChange={(e) => updateField('clientSecret', e.target.value)}
        />
      </div>

      {/* Username/Password - for Password grant only */}
      {oauth2.grantType === 'password' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Username</label>
            <Input
              placeholder="Username"
              value={oauth2.username || ''}
              onChange={(e) => updateField('username', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Password</label>
            <Input
              type="password"
              placeholder="Password"
              value={oauth2.password || ''}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>
        </>
      )}

      {/* Scope */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Scope</label>
        <Input
          placeholder="openid profile email (space-separated)"
          value={oauth2.scope || ''}
          onChange={(e) => updateField('scope', e.target.value)}
        />
      </div>

      {/* Token Status */}
      {oauth2.accessToken && (
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium">Token</span>
            {isExpired ? (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Active</Badge>
            )}
            {expiresIn !== null && !isExpired && (
              <span className="text-xs text-muted-foreground">
                Expires in {expiresIn > 3600 ? `${Math.round(expiresIn / 3600)}h` : `${Math.round(expiresIn / 60)}m`}
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground truncate">
            {oauth2.tokenType || 'Bearer'} {oauth2.accessToken.substring(0, 40)}...
          </div>
        </div>
      )}

      {/* Error */}
      {tokenError && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-md p-2 break-all">
          {tokenError}
        </div>
      )}

      {/* Actions */}
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
              Getting Token...
            </>
          ) : (
            <>
              <KeyRound size={14} className="mr-2" />
              Get New Access Token
            </>
          )}
        </Button>

        {oauth2.refreshToken && (
          <Button
            onClick={refreshToken}
            disabled={isLoading}
            size="sm"
            variant="outline"
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
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
