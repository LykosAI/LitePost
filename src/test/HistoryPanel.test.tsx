import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
    
    // Check if all history items are rendered
    mockHistory.forEach(item => {
      const methodElement = screen.getByText(item.method)
      expect(methodElement).toBeInTheDocument()
      expect(methodElement).toHaveClass(
        item.method === 'GET' ? 'bg-blue-500/10 text-blue-500' :
        item.method === 'POST' ? 'bg-green-500/10 text-green-500' :
        'bg-red-500/10 text-red-500'
      )
      expect(screen.getByText(item.url)).toBeInTheDocument()
      expect(screen.getByText(item.timestamp.toLocaleTimeString())).toBeInTheDocument()
    })
  })

  it('filters history items based on search query', () => {
    render(<HistoryPanel {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search history...')
    
    // Search by URL
    fireEvent.change(searchInput, { target: { value: 'create' } })
    expect(screen.queryByText('https://api.example.com/users')).not.toBeInTheDocument()
    expect(screen.getByText('https://api.example.com/users/create')).toBeInTheDocument()
    
    // Search by method
    fireEvent.change(searchInput, { target: { value: 'GET' } })
    expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument()
    expect(screen.queryByText('https://api.example.com/users/create')).not.toBeInTheDocument()
    
    // Search by body content
    fireEvent.change(searchInput, { target: { value: 'John' } })
    expect(screen.getByText('https://api.example.com/users/create')).toBeInTheDocument()
    expect(screen.queryByText('https://api.example.com/users')).not.toBeInTheDocument()
  })

  it('shows "No matching requests found" when search has no results', () => {
    render(<HistoryPanel {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search history...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    expect(screen.getByText('No matching requests found')).toBeInTheDocument()
  })

  it('calls onSelect when clicking a history item', () => {
    render(<HistoryPanel {...mockProps} />)
    
    const firstItem = screen.getByText('https://api.example.com/users').parentElement?.parentElement
    fireEvent.click(firstItem!)
    
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockHistory[0])
  })

  it('calls onRemove when using context menu delete option', async () => {
    render(<HistoryPanel {...mockProps} />)
    
    const firstItem = screen.getByText('https://api.example.com/users').parentElement?.parentElement
    fireEvent.contextMenu(firstItem!)
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    expect(mockProps.onRemove).toHaveBeenCalledWith(mockHistory[0].timestamp)
  })

  it('calls onSelect when using context menu restore option', () => {
    render(<HistoryPanel {...mockProps} />)
    
    const firstItem = screen.getByText('https://api.example.com/users').parentElement?.parentElement
    fireEvent.contextMenu(firstItem!)
    
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