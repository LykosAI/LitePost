import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveRequestDialog } from '@/components/SaveRequestDialog'
import { Collection } from '@/types'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
}))

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? (
      <div 
        data-testid="dialog" 
        onClick={() => onOpenChange(false)}
      >
        {children}
      </div>
    ) : null
  ),
  DialogContent: ({ children }: any) => (
    <div 
      data-testid="dialog-content"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}))

describe('SaveRequestDialog', () => {
  const mockCollections: Collection[] = [
    { id: '1', name: 'Collection 1', requests: [], description: '' },
    { id: '2', name: 'Collection 2', requests: [], description: '' },
  ]

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
    onNewCollection: vi.fn(),
    collections: mockCollections,
  }

  const setup = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props }
    const user = userEvent.setup()
    const utils = render(<SaveRequestDialog {...mergedProps} />)
    return {
      user,
      ...utils,
      ...mergedProps,
    }
  }

  it('renders when open is true', () => {
    setup()
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByText('Save to Collection')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    setup({ open: false })
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('displays existing collections', () => {
    setup()
    
    mockCollections.forEach(collection => {
      expect(screen.getByText(collection.name)).toBeInTheDocument()
    })
  })

  it('shows empty state message when no collections exist', () => {
    setup({ collections: [] })
    
    expect(screen.getByText(/No collections found/)).toBeInTheDocument()
  })

  it('shows new collection input when clicking New Collection button', async () => {
    const { user } = setup()
    
    await user.click(screen.getByText('New Collection'))
    
    expect(screen.getByPlaceholderText('Collection name')).toBeInTheDocument()
    expect(screen.getByText('Add')).toBeInTheDocument()
  })

  it('calls onNewCollection when adding a new collection', async () => {
    const { user, onNewCollection } = setup()
    
    await user.click(screen.getByText('New Collection'))
    await user.type(screen.getByPlaceholderText('Collection name'), 'New Collection')
    await user.click(screen.getByText('Add'))
    
    expect(onNewCollection).toHaveBeenCalledWith('New Collection')
  })

  it('calls onNewCollection when pressing Enter in input', async () => {
    const { user, onNewCollection } = setup()
    
    await user.click(screen.getByText('New Collection'))
    const input = screen.getByPlaceholderText('Collection name')
    await user.type(input, 'New Collection{enter}')
    
    expect(onNewCollection).toHaveBeenCalledWith('New Collection')
  })

  it('cancels new collection input when pressing Escape', async () => {
    const { user } = setup()
    
    await user.click(screen.getByText('New Collection'))
    const input = screen.getByPlaceholderText('Collection name')
    await user.type(input, 'New Collection{escape}')
    
    expect(screen.queryByPlaceholderText('Collection name')).not.toBeInTheDocument()
  })

  it('disables Add button when collection name is empty', async () => {
    const { user } = setup()
    
    await user.click(screen.getByText('New Collection'))
    
    expect(screen.getByText('Add')).toBeDisabled()
  })

  it('enables Add button when collection name is not empty', async () => {
    const { user } = setup()
    
    await user.click(screen.getByText('New Collection'))
    await user.type(screen.getByPlaceholderText('Collection name'), 'New Collection')
    
    expect(screen.getByText('Add')).toBeEnabled()
  })

  it('trims whitespace from collection name', async () => {
    const { user, onNewCollection } = setup()
    
    await user.click(screen.getByText('New Collection'))
    await user.type(screen.getByPlaceholderText('Collection name'), '  New Collection  ')
    await user.click(screen.getByText('Add'))
    
    expect(onNewCollection).toHaveBeenCalledWith('New Collection')
  })

  it('calls onSave when clicking on a collection', async () => {
    const { user, onSave } = setup()
    
    await user.click(screen.getByText('Collection 1'))
    
    expect(onSave).toHaveBeenCalledWith('1')
  })

  it('clears input when adding a new collection', async () => {
    const { user } = setup()
    
    await user.click(screen.getByText('New Collection'))
    const input = screen.getByPlaceholderText('Collection name')
    await user.type(input, 'New Collection')
    await user.click(screen.getByText('Add'))
    
    // Input should be removed from the DOM
    expect(screen.queryByPlaceholderText('Collection name')).not.toBeInTheDocument()
  })

  it('calls onOpenChange when clicking outside the dialog', async () => {
    const { user, onOpenChange } = setup()
    
    // Click outside the dialog content (on the backdrop)
    await user.click(screen.getByTestId('dialog'))
    
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not call onOpenChange when clicking inside the dialog', async () => {
    const { user, onOpenChange } = setup()
    
    // Click inside the dialog content
    await user.click(screen.getByTestId('dialog-content'))
    
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('does not call onNewCollection when collection name is empty', () => {
    const onNewCollection = vi.fn()
    render(
      <SaveRequestDialog
        open={true}
        onOpenChange={() => {}}
        onSave={() => {}}
        onNewCollection={onNewCollection}
        collections={[]}
      />
    )

    // Click new collection button
    fireEvent.click(screen.getByText('New Collection'))

    // Try to add with empty name
    fireEvent.click(screen.getByText('Add'))

    // Try to add with whitespace only
    fireEvent.change(screen.getByPlaceholderText('Collection name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByText('Add'))

    expect(onNewCollection).not.toHaveBeenCalled()
  })
}) 