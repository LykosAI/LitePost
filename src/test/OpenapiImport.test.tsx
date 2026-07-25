import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenapiImportModal } from '@/components/OpenapiImportModal'
import { CollectionsPanel } from '@/components/CollectionsPanel'
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
    return [{ id: '1', name: 'Test Collection', requests: [] }]
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

    expect(mockOnImport).toHaveBeenCalledWith({ valid: 'json' }, 'https://api.example.com')
    expect(textarea).toHaveValue('')
    expect(baseUrlInput).toHaveValue('')
  })
})

describe('CollectionsPanel OpenAPI Import', () => {
  // Mock the fetch function
  const mockFetch = vi.fn()
  global.fetch = mockFetch
  const mockPrompt = vi.fn()
  global.prompt = mockPrompt as unknown as typeof window.prompt

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const openImportMenu = async () => {
    const user = userEvent.setup()
    const importButton = screen.getByRole('button', { name: /import/i })
    await user.click(importButton)
    return screen.findByRole('menuitem', { name: /openapi format/i })
  }

  it('handles URL import correctly', async () => {
    const mockApiDoc = { openapi: '3.0.0', info: { title: 'Test API' } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiDoc)
    })
    mockPrompt
      .mockReturnValueOnce('https://api.example.com/openapi.json') // URL prompt
      .mockReturnValueOnce('https://api.example.com') // Base URL prompt

    render(
      <CollectionsPanel
        open={true}
        onOpenChange={() => {}}
        onRequestSelect={() => {}}
      />
    )

    // Find and click the OpenAPI URL import option
    const urlImportOption = await openImportMenu()
    fireEvent.click(urlImportOption)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/openapi.json')
      expect(toast.success).toHaveBeenCalledWith('OpenAPI collections imported successfully')
    })
  })

  it('handles URL import errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockPrompt.mockReturnValueOnce('https://api.example.com/openapi.json')

    render(
      <CollectionsPanel
        open={true}
        onOpenChange={() => {}}
        onRequestSelect={() => {}}
      />
    )

    const urlImportOption = await openImportMenu()
    fireEvent.click(urlImportOption)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
}) 
