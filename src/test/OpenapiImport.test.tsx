import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenapiImportModal } from '@/components/OpenapiImportModal'
import { CollectionsPanel } from '@/components/CollectionsPanel'
import { importFromOpenapi } from '@/utils/collection-converter'
import { toast } from 'sonner'

// Mock the toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}))

// Mock the collection converter
vi.mock('@/utils/collection-converter', () => ({
  importFromOpenapi: vi.fn((apiDoc, baseUrl) => {
    if (!apiDoc || !baseUrl) {
      throw new Error('Invalid OpenAPI document or base URL')
    }
    return [{ id: '1', name: 'Test Collection', requests: [{ id: 'r1', name: 'GET /things' }] }]
  })
}))

describe('OpenapiImportModal', () => {
  const mockOnImport = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(
      <OpenapiImportModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )

    expect(screen.getByPlaceholderText(/paste the openapi json/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter the base url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('validates empty JSON input', async () => {
    render(
      <OpenapiImportModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(toast.error).toHaveBeenCalledWith('Please paste the OpenAPI JSON content.')
    expect(mockOnImport).not.toHaveBeenCalled()
  })

  it('validates invalid JSON input', async () => {
    render(
      <OpenapiImportModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )

    const textarea = screen.getByPlaceholderText(/paste the openapi json/i)
    fireEvent.change(textarea, { target: { value: 'invalid json' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(toast.error).toHaveBeenCalledWith('Invalid JSON. Please check the pasted content.')
    expect(mockOnImport).not.toHaveBeenCalled()
  })

  it('validates empty base URL', async () => {
    render(
      <OpenapiImportModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )

    const textarea = screen.getByPlaceholderText(/paste the openapi json/i)
    fireEvent.change(textarea, { target: { value: '{"valid": "json"}' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(toast.error).toHaveBeenCalledWith('Please enter a valid base URL.')
    expect(mockOnImport).not.toHaveBeenCalled()
  })

  it('successfully imports valid OpenAPI JSON', async () => {
    render(
      <OpenapiImportModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )

    const textarea = screen.getByPlaceholderText(/paste the openapi json/i)
    const baseUrlInput = screen.getByPlaceholderText(/enter the base url/i)

    fireEvent.change(textarea, { target: { value: '{"valid": "json"}' } })
    fireEvent.change(baseUrlInput, { target: { value: 'https://api.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    // Third argument is the {{baseUrl}} variable name, on by default.
    expect(mockOnImport).toHaveBeenCalledWith({ valid: 'json' }, 'https://api.example.com', 'baseUrl')
    expect(textarea).toHaveValue('')
    expect(baseUrlInput).toHaveValue('')
  })
})

describe('CollectionsPanel OpenAPI Import', () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const SPEC = { openapi: '3.0.0', info: { title: 'Test API' }, servers: [{ url: 'https://api.example.com' }] }

  const okResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  })

  const openUrlModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /import/i }))
    const item = await screen.findByRole('menuitem', { name: /openapi from url/i })
    fireEvent.click(item)
    return screen.findByPlaceholderText(/swagger\/v1\/swagger\.json/i)
  }

  it('imports a spec fetched from a URL', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(okResponse(SPEC))

    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/swagger/v1/swagger.json' } })
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }))

    // The base URL is pre-filled from the spec's `servers` entry
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/base url/i)).toHaveValue('https://api.example.com/')
    })

    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Imported 1 request'))
    })
  })

  it('parameterizes the base URL by default so the collection is not welded to one host', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(okResponse(SPEC))

    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/swagger/v1/swagger.json' } })
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/base url/i)).toHaveValue('https://api.example.com/'))

    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))

    await waitFor(() => {
      expect(importFromOpenapi).toHaveBeenCalledWith(
        expect.anything(),
        'https://api.example.com/',
        { baseUrlVariable: 'baseUrl' }
      )
    })
  })

  it('bakes in the absolute host when the toggle is turned off', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce(okResponse(SPEC))

    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/swagger/v1/swagger.json' } })
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/base url/i)).toHaveValue('https://api.example.com/'))

    fireEvent.click(screen.getByTestId('base-url-variable-toggle'))
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))

    await waitFor(() => {
      expect(importFromOpenapi).toHaveBeenCalledWith(
        expect.anything(),
        'https://api.example.com/',
        { baseUrlVariable: undefined }
      )
    })
  })

  // The bug this whole path was rewritten for: the import used the webview's
  // fetch(), which enforces CORS and so could never reach an internal API host.
  // Requests now go out through the Rust backend, and the only reason fetch()
  // appears at all here is the browser-mode fallback these tests exercise.
  it('surfaces a fetch failure in the dialog instead of failing silently', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    fireEvent.change(urlInput, { target: { value: 'https://internal.corp/swagger/v1/swagger.json' } })
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }))

    expect(await screen.findByText(/Failed to fetch/i)).toBeInTheDocument()
  })

  it('explains an HTML login-page response rather than a JSON parse error', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<!DOCTYPE html><html><body>Sign in</body></html>'),
    })

    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    fireEvent.change(urlInput, { target: { value: 'https://internal.corp/swagger/v1/swagger.json' } })
    fireEvent.click(screen.getByRole('button', { name: /^load$/i }))

    expect(await screen.findByText(/HTML page instead of JSON/i)).toBeInTheDocument()
  })

  it('does not fetch on every keystroke', async () => {
    const user = userEvent.setup()
    render(<CollectionsPanel open={true} onOpenChange={() => { }} onRequestSelect={() => { }} />)

    const urlInput = await openUrlModal(user)
    await user.type(urlInput, 'https://api.example.com/spec.json')

    expect(mockFetch).not.toHaveBeenCalled()
  })
}) 
