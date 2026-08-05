import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResponsePanel } from '@/components/ResponsePanel'
import { Response, StreamingResponse } from '@/types'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ZoomIn: () => <div data-testid="zoom-in" />,
  ZoomOut: () => <div data-testid="zoom-out" />,
  RotateCw: () => <div data-testid="rotate-cw" />,
  Send: () => <div data-testid="send" />,
  ArrowUpRight: () => <div data-testid="arrow-up-right" />,
  Clock: () => <div data-testid="clock" />,
  HardDrive: () => <div data-testid="hard-drive" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Filter: () => <div data-testid="filter-icon" />,
  // Used by ResponseStreamer, which ResponsePanel swaps in while streaming
  PlayIcon: () => <div data-testid="play-icon" />,
  PauseIcon: () => <div data-testid="pause-icon" />,
  AlertCircle: () => <div data-testid="alert-circle" />
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
  useSettingsStore: () => ({
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
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('100ms')).toBeInTheDocument()
    expect(screen.getByText('0.2KB')).toBeInTheDocument()
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
    await user.click(screen.getByRole('tab', { name: /Headers/i }))
    // Headers are now rendered as separate key/value elements
    expect(screen.getByText('content-type')).toBeInTheDocument()
    expect(screen.getByText('application/json')).toBeInTheDocument()

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

  it('falls back to plain text for very large non-image responses', () => {
    const largeResponse: Response = {
      ...mockJsonResponse,
      headers: { 'content-type': 'text/plain' },
      body: 'x'.repeat(600_000),
    }

    render(<ResponsePanel response={largeResponse} />)

    expect(screen.getByText(/Large response/)).toBeInTheDocument()
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
          cookies: ['session=123; Path=/']
        }
      ]
    }
    const user = userEvent.setup()
    render(<ResponsePanel response={responseWithRedirects} />)

    await user.click(screen.getByRole('tab', { name: /Redirects/i }))
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

  describe('streaming transitions', () => {
    const mockStreaming: StreamingResponse = {
      status: 200,
      statusText: '200 OK',
      headers: { 'content-type': 'text/event-stream' },
      chunkCount: 2,
      currentContent: 'hello from the stream',
      isComplete: false
    }

    // Regression: the streaming early-return used to sit above every hook.
    // React 18 does not throw for that shape (zero hooks run, so it silently
    // falls back to the mount dispatcher), it resets the panel's hook state
    // instead — the selected tab and body filter snapped back to defaults as
    // soon as a stream finished. rerender() keeps the same instance, which is
    // what exposes it; a remount would hide the bug.
    it('keeps tab state across a streaming round-trip', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<ResponsePanel response={mockJsonResponse} />)

      await user.click(screen.getByRole('tab', { name: /Headers/i }))
      expect(screen.getByRole('tab', { name: /Headers/i })).toHaveAttribute('aria-selected', 'true')

      rerender(
        <ResponsePanel
          response={mockJsonResponse}
          streamingResponse={mockStreaming}
          onCancelStream={() => { }}
        />
      )
      expect(screen.getByText('hello from the stream')).toBeInTheDocument()

      rerender(<ResponsePanel response={mockJsonResponse} />)
      expect(screen.getByRole('tab', { name: /Headers/i })).toHaveAttribute('aria-selected', 'true')
    })

    it('flips between streaming and non-streaming without remounting', () => {
      const { rerender } = render(<ResponsePanel response={mockJsonResponse} />)
      expect(screen.getByText('"Success"')).toBeInTheDocument()

      // Stream starts on a panel that already rendered a response
      rerender(
        <ResponsePanel
          response={mockJsonResponse}
          streamingResponse={mockStreaming}
          onCancelStream={() => { }}
        />
      )
      expect(screen.getByText('hello from the stream')).toBeInTheDocument()

      // More chunks arrive
      rerender(
        <ResponsePanel
          response={mockJsonResponse}
          streamingResponse={{ ...mockStreaming, chunkCount: 3, currentContent: 'hello from the stream more' }}
          onCancelStream={() => { }}
        />
      )
      expect(screen.getByText('hello from the stream more')).toBeInTheDocument()

      // Stream finishes and the panel swaps back to the static response
      rerender(<ResponsePanel response={mockJsonResponse} />)
      expect(screen.getByText('"Success"')).toBeInTheDocument()

      // And back into streaming once more
      rerender(
        <ResponsePanel
          response={mockJsonResponse}
          streamingResponse={mockStreaming}
          onCancelStream={() => { }}
        />
      )
      expect(screen.getByText('hello from the stream')).toBeInTheDocument()
    })

    it('renders the streamer when mounted mid-stream with no response yet', () => {
      render(<ResponsePanel response={null} streamingResponse={mockStreaming} onCancelStream={() => { }} />)

      expect(screen.getByText('hello from the stream')).toBeInTheDocument()
      expect(screen.queryByText('No response yet')).not.toBeInTheDocument()
    })
  })
}) 
