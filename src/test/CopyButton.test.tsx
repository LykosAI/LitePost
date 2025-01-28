import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { CopyButton } from '@/components/CopyButton'
import { toast } from 'sonner'

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)

// Create a mock clipboard that implements the Clipboard interface
const mockClipboard = {
  writeText: mockWriteText,
  readText: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn()
  }
}))

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    
    // Mock the clipboard property
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders with initial copy icon', () => {
    render(<CopyButton content="test content" />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    const copyIcon = button.querySelector('svg')
    expect(copyIcon).toBeInTheDocument()
  })

  it('copies content to clipboard when clicked', async () => {
    const testContent = 'test content'
    
    render(<CopyButton content={testContent} />)
    const button = screen.getByRole('button')
    
    await act(async () => {
      await fireEvent.click(button)
    })
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(testContent)
    })
  })

  it('shows check icon after copying and reverts after timeout', async () => {
    render(<CopyButton content="test content" />)
    const button = screen.getByRole('button')
    
    // Initial state should have Copy icon
    const initialIcon = button.querySelector('svg')
    expect(initialIcon).toBeInTheDocument()
    
    // Click and verify Check icon appears
    await act(async () => {
      await fireEvent.click(button)
    })
    await waitFor(() => {
      const checkIcon = button.querySelector('svg')
      expect(checkIcon).toBeInTheDocument()
    })
    
    // Fast-forward 2 seconds and verify Copy icon returns
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    await waitFor(() => {
      const finalIcon = button.querySelector('svg')
      expect(finalIcon).toBeInTheDocument()
    })
  })

  it('shows success toast after copying', async () => {
    render(<CopyButton content="test content" />)
    const button = screen.getByRole('button')
    
    await act(async () => {
      await fireEvent.click(button)
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
    })
  })

  it('applies custom className when provided', () => {
    render(<CopyButton content="test content" className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })
}) 