import { create } from 'zustand'

/**
 * In-flight OAuth token requests, keyed by whose auth they belong to.
 *
 * This state cannot live in the component. `OAuthConfigurator` is rendered only
 * while `auth.type === 'oauth2'`, so switching to a request tab with different
 * auth unmounts it — and a browser sign-in that is still waiting took its
 * spinner, its Cancel button and its error message down with it. Switching to
 * *another* OAuth tab is the mirror of the same problem: the component stays
 * mounted with new props, so the pending state of one tab's flow appeared on
 * another tab's screen.
 *
 * Keying by tab (or collection) fixes both: the flow is found again on return,
 * and is invisible everywhere else.
 *
 * Deliberately not persisted. A flow cannot outlive the process that is waiting
 * on the callback listener, so restoring one from disk would only ever show a
 * spinner for something already gone.
 */
/** The code a device flow is waiting on, and where the user must enter it. */
export interface OAuthDevicePrompt {
  userCode: string
  verificationUri: string
  verificationUriComplete?: string
}

export interface OAuthFlowState {
  isLoading: boolean
  /** Set only for grant types that can be cancelled: authorization code and device code. */
  flowId: string | null
  error: string | null
  /** Set while a device code flow waits for the user to approve in the browser. */
  devicePrompt: OAuthDevicePrompt | null
}

const IDLE: OAuthFlowState = { isLoading: false, flowId: null, error: null, devicePrompt: null }

interface OAuthFlowStore {
  flows: Record<string, OAuthFlowState>
  getFlow: (key: string) => OAuthFlowState
  beginFlow: (key: string, flowId: string | null) => void
  endFlow: (key: string, error?: string | null) => void
  setDevicePrompt: (key: string, prompt: OAuthDevicePrompt) => void
  clearError: (key: string) => void
}

export const useOAuthFlowStore = create<OAuthFlowStore>((set, get) => ({
  flows: {},

  getFlow: (key) => get().flows[key] ?? IDLE,

  beginFlow: (key, flowId) =>
    set((state) => ({
      flows: { ...state.flows, [key]: { isLoading: true, flowId, error: null, devicePrompt: null } },
    })),

  endFlow: (key, error = null) =>
    set((state) => ({
      flows: { ...state.flows, [key]: { isLoading: false, flowId: null, error, devicePrompt: null } },
    })),

  setDevicePrompt: (key, prompt) =>
    set((state) => ({
      flows: { ...state.flows, [key]: { ...(state.flows[key] ?? IDLE), devicePrompt: prompt } },
    })),

  clearError: (key) =>
    set((state) => ({
      flows: { ...state.flows, [key]: { ...(state.flows[key] ?? IDLE), error: null } },
    })),
}))
