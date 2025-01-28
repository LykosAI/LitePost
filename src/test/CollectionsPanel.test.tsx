import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { CollectionsPanel } from '@/components/CollectionsPanel'
import { useCollectionStore } from '@/store/collections'
import { Tab } from '@/types'
import userEvent from '@testing-library/user-event'

vi.mock('@/store/collections')

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

// Mock HTMLAnchorElement.click
const mockAnchorClick = vi.fn()
HTMLAnchorElement.prototype.click = mockAnchorClick

describe('CollectionsPanel', () => {
  const mockCollections = [
    {
      id: '1',
      name: 'Collection One',
      description: 'First collection',
      requests: [
        {
          id: 'req1',
          name: 'Request 1',
          method: 'GET',
          url: 'https://api.example.com',
          rawUrl: 'https://api.example.com',
          params: [],
          headers: [],
          body: '',
          contentType: 'application/json',
          auth: { type: 'none' },
          cookies: [],
          testScripts: [],
          testAssertions: [],
          testResults: null
        }
      ]
    },
    {
      id: '2',
      name: 'Collection Two',
      description: 'Second collection',
      requests: []
    }
  ]

  const mockCurrentRequest: Tab = {
    id: 'current-req',
    name: 'Current Request',
    method: 'POST',
    url: 'https://api.test.com',
    rawUrl: 'https://api.test.com',
    params: [],
    headers: [],
    body: '{"test": true}',
    contentType: 'application/json',
    auth: { type: 'none' },
    cookies: [],
    loading: false,
    response: null,
    isEditing: false,
    testScripts: [],
    testAssertions: [],
    testResults: null
  }

  interface SetupOptions {
    currentRequest?: Tab;
  }

  const setup = (options: SetupOptions = {}) => {
    const user = userEvent.setup()
    const mockStore = {
      collections: mockCollections,
      addCollection: vi.fn(),
      updateCollection: vi.fn(),
      deleteCollection: vi.fn(),
      addRequest: vi.fn(),
      deleteRequest: vi.fn(),
      exportCollections: vi.fn(() => JSON.stringify(mockCollections)),
      exportToPostman: vi.fn(() => JSON.stringify({ collections: mockCollections })),
      importCollections: vi.fn(),
      importFromPostman: vi.fn(),
    }
    
    vi.mocked(useCollectionStore).mockReturnValue(mockStore)

    const onOpenChange = vi.fn()
    const onRequestSelect = vi.fn()

    const utils = render(
      <CollectionsPanel
        open={true}
        onOpenChange={onOpenChange}
        currentRequest={options.currentRequest}
        onRequestSelect={onRequestSelect}
      />
    )

    return {
      user,
      ...utils,
      ...mockStore,
      onOpenChange,
      onRequestSelect
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders collections correctly', () => {
    setup()
    const headings = screen.getAllByRole('heading', { name: /Collections/i })
    expect(headings).toHaveLength(2)
  })

  it('adds a new collection when "Add Collection" button is clicked', async () => {
    const { addCollection, user } = setup()
    
    const addButton = screen.getByRole('button', { name: /Add Collection/i })
    await user.click(addButton)

    expect(addCollection).toHaveBeenCalledWith('New Collection')
  })

  it('deletes a collection when delete button is clicked', async () => {
    const { deleteCollection, user } = setup()
    
    const deleteButtons = screen.getAllByRole('button', { name: /Delete Collection/i })
    await user.click(deleteButtons[0])

    expect(deleteCollection).toHaveBeenCalledWith('1')
  })

  it('updates collection name when input changes', async () => {
    const { updateCollection } = setup()
    
    const nameInput = screen.getByRole('textbox', { name: /Collection Name Collection One/i })
    fireEvent.change(nameInput, { target: { value: 'Updated Collection' } })
    fireEvent.blur(nameInput)
    
    expect(updateCollection).toHaveBeenLastCalledWith('1', { name: 'Updated Collection' })
  })

  it('updates collection description when textarea changes', async () => {
    const { updateCollection } = setup()
    
    const descriptionInputs = screen.getAllByPlaceholderText('Collection description')
    const firstCollectionDescription = descriptionInputs[0]
    fireEvent.change(firstCollectionDescription, { target: { value: 'Updated description' } })
    fireEvent.blur(firstCollectionDescription)
    
    expect(updateCollection).toHaveBeenLastCalledWith('1', { description: 'Updated description' })
  })

  it('saves current request to collection when save button is clicked', async () => {
    const { addRequest, user } = setup({
      currentRequest: {
        id: 'current-request',
        method: 'POST',
        url: 'https://api.test.com',
        rawUrl: 'https://api.test.com',
        name: 'Unnamed Request',
        body: '{"test": true}',
        contentType: 'application/json',
        headers: [],
        params: [],
        cookies: [],
        auth: { type: 'none' },
        testScripts: [],
        testAssertions: [],
        testResults: null,
        response: null,
        loading: false
      }
    })

    const expandButton = screen.getByRole('button', { name: /Expand Collection Collection One/i })
    await user.click(expandButton)

    const saveButtons = screen.getAllByRole('button', { name: /Save Current Request/i })
    await user.click(saveButtons[0])

    expect(addRequest).toHaveBeenCalledWith('1', expect.objectContaining({
      method: 'POST',
      url: 'https://api.test.com',
      rawUrl: 'https://api.test.com',
      name: 'Unnamed Request',
      body: '{"test": true}',
      contentType: 'application/json',
      headers: [],
      params: [],
      cookies: [],
      auth: { type: 'none' },
      testScripts: [],
      testAssertions: [],
      testResults: null
    }))
  })

  it('restores all requests from a collection when restore button is clicked', async () => {
    const { onRequestSelect, onOpenChange, user } = setup()
    
    const restoreButtons = screen.getAllByRole('button', { name: /Restore All Requests/i })
    await user.click(restoreButtons[0])

    expect(onRequestSelect).toHaveBeenCalledWith({
      ...mockCollections[0].requests[0],
      id: expect.any(String),
      loading: false,
      response: null,
      isEditing: false
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('deletes a request when delete option is clicked', async () => {
    const { deleteRequest, user } = setup()
    
    // First expand the collection
    const expandButton = screen.getByRole('button', { name: /Expand Collection Collection One/i })
    await user.click(expandButton)

    // Find and click the request menu button by its aria-label
    const menuButton = screen.getByRole('button', { name: '' })
    await user.click(menuButton)

    // Click the delete option
    const deleteOption = screen.getByRole('menuitem', { name: /Delete/i })
    await user.click(deleteOption)

    expect(deleteRequest).toHaveBeenCalledWith('1', 'req1')
  })

  it('exports collections in LitePost format when "LitePost Format" is selected', async () => {
    const { exportCollections, user } = setup()
    const mockBlob = new Blob(['{}'], { type: 'application/json' })
    mockCreateObjectURL.mockReturnValueOnce('blob:mock-url')
    
    // Open the export dropdown
    const exportButton = screen.getByRole('button', { name: /Export/i })
    await user.click(exportButton)

    // Click the LitePost Format option
    const dropdown = screen.getByRole('menu')
    const litePostOption = within(dropdown).getByText(/LitePost Format/i)
    await user.click(litePostOption)

    expect(exportCollections).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockAnchorClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('exports collections in Postman format when "Postman Format" is selected', async () => {
    const { exportToPostman, user } = setup()
    const mockBlob = new Blob(['{}'], { type: 'application/json' })
    mockCreateObjectURL.mockReturnValueOnce('blob:mock-url')
    
    // Open the export dropdown
    const exportButton = screen.getByRole('button', { name: /Export/i })
    await user.click(exportButton)

    // Click the Postman Format option
    const dropdown = screen.getByRole('menu')
    const postmanOption = within(dropdown).getByText(/Postman Format/i)
    await user.click(postmanOption)

    expect(exportToPostman).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockAnchorClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('imports collections when a file is selected', async () => {
    const { importCollections, user } = setup()
    
    // Open the import dropdown
    const importButton = screen.getByRole('button', { name: /Import/i })
    await user.click(importButton)

    // Wait for and click the LitePost Format option in the dropdown
    const dropdown = screen.getByRole('menu')
    const litePostOption = within(dropdown).getByText(/LitePost Format/i)
    await user.click(litePostOption)

    const file = new File([JSON.stringify(mockCollections)], 'collections.json', { type: 'application/json' })
    const input = screen.getByLabelText('Import Collections') as HTMLInputElement
    await user.upload(input, file)

    expect(importCollections).toHaveBeenCalledWith(mockCollections)
  })

  it('imports Postman collections when a file is selected', async () => {
    const { importFromPostman, user } = setup()
    
    // Open the import dropdown
    const importButton = screen.getByRole('button', { name: /Import/i })
    await user.click(importButton)

    // Click the Postman Format option
    const dropdown = screen.getByRole('menu')
    const postmanOption = within(dropdown).getByText(/Postman Format/i)
    await user.click(postmanOption)

    const file = new File([JSON.stringify({ collections: mockCollections })], 'postman.json', { type: 'application/json' })
    const input = screen.getByLabelText('Import Collections') as HTMLInputElement
    await user.upload(input, file)

    expect(importFromPostman).toHaveBeenCalledWith(JSON.stringify({ collections: mockCollections }))
  })
}) 