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
    
    const expectedContent = 'content-type: application/json\nx-powered-by: Express\ncontent-length: 123'
    const preElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'pre' && 
             content.replace(/\s+/g, '') === expectedContent.replace(/\s+/g, '')
    })
    expect(preElement).toBeInTheDocument()
  })

  it('provides copy functionality with correct content', async () => {
    render(<HeadersView headers={mockHeaders} />)
    
    const copyButton = screen.getByTestId('copy-button')
    const expectedContent = 'content-type: application/json\nx-powered-by: Express\ncontent-length: 123'
    expect(copyButton).toHaveAttribute('data-content', expectedContent)
  })
}) 