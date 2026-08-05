import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import { OAuthConfigurator } from '@/components/OAuthConfigurator'
import { useOAuthFlowStore } from '@/store/oauthFlows'
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

/** A flow whose resolution this test controls, standing in for a browser sign-in. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('an in-flight sign-in surviving a tab switch', () => {
  beforeEach(() => {
    invoke.mockReset()
    useOAuthFlowStore.setState({ flows: {} })
  })

  // The bug: OAuthConfigurator only renders while auth.type === 'oauth2', so
  // switching to a tab with different auth unmounts it. With the state held in
  // the component, coming back showed an idle button for a sign-in that was
  // still very much waiting.
  it('is still pending after the component unmounts and comes back', async () => {
    invoke.mockImplementation(() => new Promise(() => { }))

    const { unmount } = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))
    expect(await screen.findByTestId('cancel-token-request')).toBeInTheDocument()

    unmount() // switch to a tab whose auth is not OAuth

    render(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />)

    expect(screen.getByTestId('cancel-token-request')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for sign-in/)).toBeInTheDocument()
  })

  // The mirror of the same problem: switching to *another* OAuth tab keeps the
  // component mounted with new props, so one tab's pending flow showed up on a
  // different tab's screen.
  it('is invisible on a tab it does not belong to', async () => {
    invoke.mockImplementation(() => new Promise(() => { }))

    const { rerender } = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))
    expect(await screen.findByTestId('cancel-token-request')).toBeInTheDocument()

    rerender(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-2" />)

    expect(screen.queryByTestId('cancel-token-request')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Get Access Token/i })).toBeEnabled()

    // ...and is still there on the tab that owns it.
    rerender(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />)
    expect(screen.getByTestId('cancel-token-request')).toBeInTheDocument()
  })

  it('delivers the token to the original tab even if that tab is not on screen', async () => {
    // This already worked — onAuthChange closes over the tab it was created for
    // — but nothing pinned it down, and it is the part that actually matters:
    // completing a sign-in while looking at another tab must not lose the token.
    const flow = deferred<Record<string, unknown>>()
    invoke.mockReturnValue(flow.promise)
    const onOAuth2Change = vi.fn()

    const { unmount } = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={onOAuth2Change} flowKey="tab-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))
    await screen.findByTestId('cancel-token-request')

    unmount()

    await act(async () => {
      flow.resolve({ access_token: 'the-token', token_type: 'Bearer' })
    })

    expect(onOAuth2Change).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'the-token', tokenType: 'Bearer' })
    )
    expect(useOAuthFlowStore.getState().flows['tab-1'].isLoading).toBe(false)
  })

  it('shows the outcome of a flow that finished while the tab was away', async () => {
    const flow = deferred<Record<string, unknown>>()
    invoke.mockReturnValue(flow.promise)

    const { unmount } = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))
    await screen.findByTestId('cancel-token-request')

    unmount()
    await act(async () => {
      flow.reject('Authorization cancelled')
    })

    render(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />)

    expect(screen.getByText(/Authorization cancelled/)).toBeInTheDocument()
    expect(screen.queryByTestId('cancel-token-request')).not.toBeInTheDocument()
  })

  it('keeps two tabs signing in at once apart', async () => {
    invoke.mockImplementation(() => new Promise(() => { }))

    // Queries are scoped to each render's own container — RTL's returned
    // queries search the whole document by default, which would cross over.
    const first = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />
    )
    fireEvent.click(within(first.container).getByRole('button', { name: /Get Access Token/i }))

    const second = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-2" />
    )
    fireEvent.click(within(second.container).getByRole('button', { name: /Get Access Token/i }))

    await waitFor(() => {
      const flows = useOAuthFlowStore.getState().flows
      expect(flows['tab-1'].flowId).toBeTruthy()
      expect(flows['tab-2'].flowId).toBeTruthy()
      // Distinct ids, so cancelling one cannot abort the other.
      expect(flows['tab-1'].flowId).not.toBe(flows['tab-2'].flowId)
    })
  })

  it('isolates instances that are given no key at all', async () => {
    invoke.mockImplementation(() => new Promise(() => { }))

    const first = render(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} />)
    fireEvent.click(within(first.container).getByRole('button', { name: /Get Access Token/i }))
    await waitFor(() => expect(invoke).toHaveBeenCalled())

    const second = render(<OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} />)
    expect(within(second.container).queryByTestId('cancel-token-request')).not.toBeInTheDocument()
    expect(within(first.container).getByTestId('cancel-token-request')).toBeInTheDocument()
  })

  it('drops a stale error when the token is cleared', async () => {
    invoke.mockRejectedValueOnce('Something went wrong')

    const { rerender } = render(
      <OAuthConfigurator oauth2={base} onOAuth2Change={vi.fn()} flowKey="tab-1" />
    )
    fireEvent.click(screen.getByRole('button', { name: /Get Access Token/i }))
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument()

    rerender(
      <OAuthConfigurator
        oauth2={{ ...base, accessToken: 'tok' }}
        onOAuth2Change={vi.fn()}
        flowKey="tab-1"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^Clear$/i }))

    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
  })
})
