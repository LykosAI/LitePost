import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPanel } from '@/components/HistoryPanel'
import { HistoryItem } from '@/types'

describe('HistoryPanel', () => {
  const mockHistory: HistoryItem[] = [
    {
      method: 'GET',
      url: 'https://api.example.com/users',
      rawUrl: 'https://api.example.com/users',
      timestamp: new Date('2024-01-01T10:00:00'),
      body: '',
      headers: [],
      params: [],
      contentType: 'application/json',
      auth: {
        type: 'none'
      }
    },
    {
      method: 'POST',
      url: 'https://api.example.com/users/create',
      rawUrl: 'https://api.example.com/users/create',
      timestamp: new Date('2024-01-01T11:00:00'),
      body: '{"name": "John"}',
      headers: [],
      params: [],
      contentType: 'application/json',
      auth: {
        type: 'none'
      }
    },
    {
      method: 'DELETE',
      url: 'https://api.example.com/users/1',
      rawUrl: 'https://api.example.com/users/1',
      timestamp: new Date('2024-01-01T12:00:00'),
      body: '',
      headers: [],
      params: [],
      contentType: 'application/json',
      auth: {
        type: 'none'
      }
    }
  ]

  const mockProps = {
    history: mockHistory,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onClear: vi.fn()
  }

  it('renders empty state when no history exists', () => {
    render(<HistoryPanel {...mockProps} history={[]} />)
    expect(screen.getByText('No requests yet')).toBeInTheDocument()
  })

  it('renders history items with correct styling', () => {
    render(<HistoryPanel {...mockProps} />)

    // URLs render as a dimmed host plus a bright path
    const paths = ['/users', '/users/create', '/users/1']
    mockHistory.forEach((item, index) => {
      const methodElement = screen.getByText(item.method)
      expect(methodElement).toBeInTheDocument()
      expect(screen.getByText(paths[index])).toBeInTheDocument()
    })
    expect(screen.getAllByText('api.example.com')).toHaveLength(mockHistory.length)
  })

  it('filters history items based on search query', () => {
    render(<HistoryPanel {...mockProps} />)

    const searchInput = screen.getByPlaceholderText('Search history…')

    // Search by URL
    fireEvent.change(searchInput, { target: { value: 'create' } })
    expect(screen.queryByText('/users')).not.toBeInTheDocument()
    expect(screen.getByText('/users/create')).toBeInTheDocument()

    // Search by method
    fireEvent.change(searchInput, { target: { value: 'GET' } })
    expect(screen.getByText('/users')).toBeInTheDocument()
    expect(screen.queryByText('/users/create')).not.toBeInTheDocument()

    // Search by body content
    fireEvent.change(searchInput, { target: { value: 'John' } })
    expect(screen.getByText('/users/create')).toBeInTheDocument()
    expect(screen.queryByText('/users')).not.toBeInTheDocument()
  })

  it('shows "No matching requests found" when search has no results', () => {
    render(<HistoryPanel {...mockProps} />)

    const searchInput = screen.getByPlaceholderText('Search history…')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('calls onSelect when clicking a history item', () => {
    render(<HistoryPanel {...mockProps} />)

    // Click bubbles from the path span up to the row's click handler
    fireEvent.click(screen.getByText('/users'))

    expect(mockProps.onSelect).toHaveBeenCalledWith(mockHistory[0])
  })

  it('calls onRemove when using context menu delete option', async () => {
    render(<HistoryPanel {...mockProps} />)

    fireEvent.contextMenu(screen.getByText('/users'))

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    expect(mockProps.onRemove).toHaveBeenCalledWith(mockHistory[0].timestamp)
  })

  it('calls onSelect when using context menu restore option', () => {
    render(<HistoryPanel {...mockProps} />)

    fireEvent.contextMenu(screen.getByText('/users'))

    const restoreButton = screen.getByText('Restore')
    fireEvent.click(restoreButton)

    expect(mockProps.onSelect).toHaveBeenCalledWith(mockHistory[0])
  })

  it('calls onClear when clear button is clicked', () => {
    render(<HistoryPanel {...mockProps} />)

    const clearButton = screen.getByRole('button', { name: '' }) // Trash icon button
    fireEvent.click(clearButton)

    const confirmButton = screen.getByRole('button', { name: 'Clear' })
    fireEvent.click(confirmButton)

    expect(mockProps.onClear).toHaveBeenCalled()
  })

  it('does not call onClear when clear dialog is cancelled', () => {
    render(<HistoryPanel {...mockProps} />)

    const clearButton = screen.getByRole('button', { name: '' }) // Trash icon button
    fireEvent.click(clearButton)

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(mockProps.onClear).not.toHaveBeenCalled()
  })

  it('does not show clear button when history is empty', () => {
    render(<HistoryPanel {...mockProps} history={[]} />)

    const clearButton = screen.queryByRole('button', { name: '' }) // Trash icon button
    expect(clearButton).not.toBeInTheDocument()
  })
}) 