import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OAuthConfigurator } from '@/components/OAuthConfigurator'
import { OAuth2Config } from '@/types'

const invoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }))

vi.mock('@/store/environments', () => ({
  useEnvironmentStore: () => ({ getVariable: () => undefined }),
}))

const base: OAuth2Config = {
  grantType: 'authorization_code',
  clientId: 'client-abc',
  authUrl: 'https://id.example.com/authorize',
  tokenUrl: 'https://id.example.com/token',
}

const renderConfigurator = (oauth2: Partial<OAuth2Config> = {}) => {
  const onOAuth2Change = vi.fn()
  render(<OAuthConfigurator oauth2={{ ...base, ...oauth2 }} onOAuth2Change={onOAuth2Change} />)
  return onOAuth2Change
}

/** A flow that never resolves, standing in for a provider that never redirects. */
function neverResolves() {
  return new Promise(() => { })
}

describe('cancelling an authorization code flow', () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  // The bug: an unregistered redirect URI means the provider shows an error page
  // and never redirects back, so the callback listener waits and the button sat
  // on "Getting Token…" with no way out until the timeout fired.
  it('offers a cancel button once the browser sign-in is waiting', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator()

    expect(screen.queryByTestId('cancel-token-request')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    expect(await screen.findByTestId('cancel-token-request')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for sign-in/)).toBeInTheDocument()
  })

  it('cancels the flow by the same id it was started with', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    fireEvent.click(await screen.findByTestId('cancel-token-request'))

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('oauth2_cancel_flow', expect.anything())
    })

    const started = invoke.mock.calls.find(([cmd]) => cmd === 'oauth2_auth_code_flow')
    const cancelled = invoke.mock.calls.find(([cmd]) => cmd === 'oauth2_cancel_flow')
    expect(cancelled![1].flowId).toBe(started![1].options.flow_id)
    expect(started![1].options.flow_id).toBeTruthy()
  })

  it('surfaces the cancellation as the flow rejecting, and clears the spinner', async () => {
    invoke.mockRejectedValueOnce('Authorization cancelled')
    renderConfigurator()

    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    expect(await screen.findByText(/Authorization cancelled/)).toBeInTheDocument()
    expect(screen.queryByTestId('cancel-token-request')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Get Access Token/i })).toBeEnabled()
  })

  it('does not offer cancel for client credentials, which never waits on a browser', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator({ grantType: 'client_credentials' })

    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(screen.queryByTestId('cancel-token-request')).not.toBeInTheDocument()
    expect(screen.getByText(/Getting Token/)).toBeInTheDocument()
  })

  it('sends no flow id for grant types that cannot be cancelled', async () => {
    invoke.mockImplementation(neverResolves)
    renderConfigurator({ grantType: 'client_credentials' })

    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => expect(invoke).toHaveBeenCalled())
    expect(invoke.mock.calls[0][0]).toBe('oauth2_token_exchange')
    expect(invoke.mock.calls[0][1].options.flow_id).toBeUndefined()
  })

  it('leaves the error visible after a failed cancel attempt', async () => {
    // cancelOAuthFlow swallows its own failure so it cannot mask whatever the
    // flow itself is about to report.
    invoke.mockImplementation((cmd: string) =>
      cmd === 'oauth2_cancel_flow' ? Promise.reject('no such flow') : neverResolves()
    )
    renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))

    fireEvent.click(await screen.findByTestId('cancel-token-request'))

    // No unhandled rejection, and the flow is still considered in-flight.
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('oauth2_cancel_flow', expect.anything())
    })
    expect(screen.getByTestId('cancel-token-request')).toBeInTheDocument()
  })
})
