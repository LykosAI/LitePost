import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeadersView } from '@/components/HeadersView'

// Mock CopyButton component
vi.mock('@/components/CopyButton', () => ({
  CopyButton: ({ content }: { content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      Copy
    </button>
  )
}))

describe('HeadersView', () => {
  const mockHeaders = {
    'content-type': 'application/json',
    'x-powered-by': 'Express',
    'content-length': '123'
  }

  it('renders headers correctly', () => {
    render(<HeadersView headers={mockHeaders} />)

    // Each header key and value should be rendered
    expect(screen.getByText('content-type')).toBeInTheDocument()
    expect(screen.getByText('application/json')).toBeInTheDocument()
    expect(screen.getByText('x-powered-by')).toBeInTheDocument()
    expect(screen.getByText('Express')).toBeInTheDocument()
    expect(screen.getByText('content-length')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()

    // Should show header count
    expect(screen.getByText('3 headers')).toBeInTheDocument()
  })

  it('provides copy functionality with correct content', async () => {
    render(<HeadersView headers={mockHeaders} />)

    const copyButton = screen.getByTestId('copy-button')
    const expectedContent = 'content-type: application/json\nx-powered-by: Express\ncontent-length: 123'
    expect(copyButton).toHaveAttribute('data-content', expectedContent)
  })

  it('renders empty state when no headers', () => {
    render(<HeadersView headers={{}} />)

    expect(screen.getByText('No headers')).toBeInTheDocument()
  })
}) 