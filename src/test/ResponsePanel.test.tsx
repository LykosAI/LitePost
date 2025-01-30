import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResponsePanel } from '@/components/ResponsePanel'
import { Response } from '@/types'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ZoomIn: () => <div data-testid="zoom-in" />,
  ZoomOut: () => <div data-testid="zoom-out" />,
  RotateCw: () => <div data-testid="rotate-cw" />
}))

// Mock react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => {
  const MockSyntaxHighlighter = ({ children }: { children: string }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  );
  return {
    Prism: MockSyntaxHighlighter,
    default: MockSyntaxHighlighter
  };
})

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {}
}))

// Mock CopyButton component
vi.mock('@/components/CopyButton', () => ({
  CopyButton: ({ content }: { content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      Copy
    </button>
  )
}))

// Mock settings store
vi.mock('@/store/settings', () => ({
  useSettings: () => ({
    jsonViewer: {
      maxAutoExpandDepth: 2,
      maxAutoExpandArraySize: 10,
      maxAutoExpandObjectSize: 5
    }
  })
}))

describe('ResponsePanel', () => {
  const mockJsonResponse: Response = {
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ message: 'Success' }),
    redirectChain: [],
    timing: {
      start: Date.now(),
      end: Date.now() + 100,
      total: 100,
      duration: 100,
      dns: 10,
      first_byte: 50,
      download: 40
    },
    size: {
      headers: 100,
      body: 100,
      total: 200
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no response', () => {
    render(<ResponsePanel response={null} />)
    expect(screen.getByText('No response yet')).toBeInTheDocument()
  })

  it('renders error state', () => {
    const errorResponse: Response = {
      ...mockJsonResponse,
      error: 'Network Error'
    }
    render(<ResponsePanel response={errorResponse} />)
    expect(screen.getByText('Error: Network Error')).toBeInTheDocument()
  })

  it('displays status and timing information', () => {
    render(<ResponsePanel response={mockJsonResponse} />)
    expect(screen.getByText('Status: OK')).toBeInTheDocument()
    expect(screen.getByText('Time: 100ms')).toBeInTheDocument()
    expect(screen.getByText('Size: 0.2KB')).toBeInTheDocument()
  })

  it('renders JSON response with collapsible viewer', async () => {
    const user = userEvent.setup()
    render(<ResponsePanel response={mockJsonResponse} />)

    // Check if JSON is rendered in the collapsible viewer
    expect(screen.getByText('"message"')).toBeInTheDocument()
    expect(screen.getByText('"Success"')).toBeInTheDocument()

    // Test collapse/expand functionality
    const expandButton = screen.getByTestId('chevron-down')
    await user.click(expandButton)
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    const user = userEvent.setup()
    render(<ResponsePanel response={mockJsonResponse} />)

    // Test switching to Headers tab
    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    expect(screen.getByText('content-type: application/json')).toBeInTheDocument()

    // Test switching to Timing tab
    await user.click(screen.getByRole('tab', { name: 'Timing' }))
    expect(screen.getByText('DNS Lookup')).toBeInTheDocument()
    expect(screen.getByText('Time to First Byte')).toBeInTheDocument()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('renders HTML response with preview option', () => {
    const htmlResponse: Response = {
      ...mockJsonResponse,
      headers: { 'content-type': 'text/html' },
      body: '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>'
    }
    render(<ResponsePanel response={htmlResponse} />)
    
    expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument()
    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
  })

  it('renders image response with viewer controls', () => {
    const imageResponse: Response = {
      ...mockJsonResponse,
      headers: { 'content-type': 'image/png' },
      body: 'base64-encoded-image-data',
      is_base64: true
    }
    render(<ResponsePanel response={imageResponse} />)
    
    expect(screen.getByTestId('zoom-in')).toBeInTheDocument()
    expect(screen.getByTestId('zoom-out')).toBeInTheDocument()
    expect(screen.getByTestId('rotate-cw')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('shows redirect chain when present', async () => {
    const responseWithRedirects: Response = {
      ...mockJsonResponse,
      redirectChain: [
        {
          url: 'http://example.com/redirect1',
          status: 301,
          statusText: '301 Moved Permanently',
          headers: { location: 'http://example.com/final' },
          cookies: [{ name: 'session', value: '123' }]
        }
      ]
    }
    const user = userEvent.setup()
    render(<ResponsePanel response={responseWithRedirects} />)

    await user.click(screen.getByRole('tab', { name: 'Redirects' }))
    expect(screen.getByText('1. http://example.com/redirect1')).toBeInTheDocument()
    expect(screen.getByText('Status: 301 Moved Permanently')).toBeInTheDocument()
  })

  it('handles copy functionality', async () => {
    const user = userEvent.setup()
    render(<ResponsePanel response={mockJsonResponse} />)

    const copyButton = screen.getByTestId('copy-button')
    expect(copyButton).toHaveAttribute('data-content', mockJsonResponse.body)
    await user.click(copyButton)
  })
}) 
