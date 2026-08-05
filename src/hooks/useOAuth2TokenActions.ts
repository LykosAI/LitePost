import { useMemo, useRef } from 'react'
import { OAuth2Config } from '@/types'
import {
  OAuthTokenResponse,
  applyTokenResponse,
  cancelOAuthFlow,
  refreshOAuthToken,
  requestOAuthToken,
} from '@/services/oauth'
import { useEnvironmentStore } from '@/store/environments'
import { useOAuthFlowStore } from '@/store/oauthFlows'

interface UseOAuth2TokenActionsOptions {
  oauth2: OAuth2Config
  onOAuth2Change: (config: OAuth2Config) => void
  /**
   * Identifies whose auth this is — a request tab id, or `collection:<id>`.
   *
   * In-flight state is stored against this rather than in the component, so a
   * sign-in survives the component unmounting when you switch to a tab with
   * different auth, and stays invisible on tabs it does not belong to.
   *
   * Omitting it falls back to a per-instance key, which isolates the instance
   * but loses the state when it unmounts.
   */
  flowKey?: string
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
  flowKey,
}: UseOAuth2TokenActionsOptions): OAuth2TokenActions {
  const { getVariable } = useEnvironmentStore()

  // Stable for the lifetime of the instance, used only when no key is supplied.
  const fallbackKey = useRef<string>()
  if (!fallbackKey.current) fallbackKey.current = `instance:${crypto.randomUUID()}`
  const key = flowKey ?? fallbackKey.current

  // Subscribed by key, so a change to one tab's flow does not re-render another.
  const flow = useOAuthFlowStore((state) => state.flows[key])
  const isLoading = flow?.isLoading ?? false
  const tokenError = flow?.error ?? null
  const activeFlowId = flow?.flowId ?? null

  // Note this stores against the *unresolved* config: substitution happens on
  // the way out to the provider, so `{{clientSecret}}` stays `{{clientSecret}}`
  // in what gets persisted with the request.
  const handleTokenResponse = (token: OAuthTokenResponse) => {
    onOAuth2Change(applyTokenResponse(oauth2, token))
  }

  const getNewToken = async () => {
    // Only the authorization code flow parks waiting on the browser, so it is
    // the only one that can be cancelled.
    const flowId = oauth2.grantType === 'authorization_code' ? crypto.randomUUID() : undefined

    // Read actions off the store rather than through the hook, so the calls
    // below still land if this component unmounted while the flow was running —
    // which is exactly what happens when you switch tabs mid sign-in.
    const { beginFlow, endFlow } = useOAuthFlowStore.getState()
    beginFlow(key, flowId ?? null)

    try {
      const token = await requestOAuthToken(oauth2, getVariable, flowId)
      handleTokenResponse(token)
      endFlow(key)
    } catch (err) {
      endFlow(key, err instanceof Error ? err.message : String(err))
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

    const { beginFlow, endFlow } = useOAuthFlowStore.getState()
    beginFlow(key, null)

    try {
      const token = await refreshOAuthToken(oauth2, getVariable)
      handleTokenResponse(token)
      endFlow(key)
    } catch (err) {
      endFlow(key, err instanceof Error ? err.message : String(err))
    }
  }

  const clearToken = () => {
    useOAuthFlowStore.getState().clearError(key)
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
