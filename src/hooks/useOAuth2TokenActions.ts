import { useMemo, useState } from 'react'
import { OAuth2Config } from '@/types'
import {
  OAuthTokenResponse,
  applyTokenResponse,
  cancelOAuthFlow,
  refreshOAuthToken,
  requestOAuthToken,
} from '@/services/oauth'
import { useEnvironmentStore } from '@/store/environments'

interface UseOAuth2TokenActionsOptions {
  oauth2: OAuth2Config
  onOAuth2Change: (config: OAuth2Config) => void
}

interface OAuth2TokenActions {
  isLoading: boolean
  tokenError: string | null
  getNewToken: () => Promise<void>
  refreshToken: () => Promise<void>
  clearToken: () => void
  /** Abort an in-flight browser sign-in. Null when there is nothing to cancel. */
  cancelTokenRequest: (() => Promise<void>) | null
  isExpired: boolean
  expiresIn: number | null
}

export function useOAuth2TokenActions({
  oauth2,
  onOAuth2Change,
}: UseOAuth2TokenActionsOptions): OAuth2TokenActions {
  const [isLoading, setIsLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const { getVariable } = useEnvironmentStore()

  // Note this stores against the *unresolved* config: substitution happens on
  // the way out to the provider, so `{{clientSecret}}` stays `{{clientSecret}}`
  // in what gets persisted with the request.
  const handleTokenResponse = (token: OAuthTokenResponse) => {
    onOAuth2Change(applyTokenResponse(oauth2, token))
  }

  /**
   * Only the authorization code flow parks waiting on the browser, so it is the
   * only one that needs cancelling. Held in state rather than a ref so the
   * Cancel button appears and disappears with it.
   */
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)

  const getNewToken = async () => {
    setIsLoading(true)
    setTokenError(null)

    const flowId = oauth2.grantType === 'authorization_code' ? crypto.randomUUID() : undefined
    setActiveFlowId(flowId ?? null)

    try {
      const token = await requestOAuthToken(oauth2, getVariable, flowId)
      handleTokenResponse(token)
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
      setActiveFlowId(null)
    }
  }

  const cancelTokenRequest = async () => {
    if (!activeFlowId) return
    await cancelOAuthFlow(activeFlowId)
    // The flow itself rejects with "Authorization cancelled", which is what
    // clears isLoading and surfaces the message — nothing to do here.
  }

  const refreshToken = async () => {
    if (!oauth2.refreshToken || !oauth2.tokenUrl) {
      return
    }

    setIsLoading(true)
    setTokenError(null)

    try {
      const token = await refreshOAuthToken(oauth2, getVariable)
      handleTokenResponse(token)
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const clearToken = () => {
    onOAuth2Change({
      ...oauth2,
      accessToken: undefined,
      refreshToken: undefined,
      tokenType: undefined,
      expiresAt: undefined,
    })
  }

  const isExpired = useMemo(() => {
    return oauth2.expiresAt ? Date.now() > oauth2.expiresAt : false
  }, [oauth2.expiresAt])

  const expiresIn = useMemo(() => {
    if (!oauth2.expiresAt) {
      return null
    }

    return Math.max(0, Math.round((oauth2.expiresAt - Date.now()) / 1000))
  }, [oauth2.expiresAt])

  return {
    isLoading,
    tokenError,
    getNewToken,
    refreshToken,
    clearToken,
    cancelTokenRequest: activeFlowId ? cancelTokenRequest : null,
    isExpired,
    expiresIn,
  }
}
