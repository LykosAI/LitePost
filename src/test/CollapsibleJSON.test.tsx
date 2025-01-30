import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollapsibleJSON } from '@/components/CollapsibleJSON'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right" />,
  ChevronDown: () => <div data-testid="chevron-down" />
}))

describe('CollapsibleJSON', () => {
  const simpleData = { message: "Hello" }
  const arrayData = [1, 2, 3]
  const nestedData = {
    name: "John",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Anytown"
    },
    hobbies: ["reading", "gaming"]
  }

  it('renders simple JSON object', () => {
    render(<CollapsibleJSON data={simpleData} />)
    expect(screen.getByText('"message"')).toBeInTheDocument()
    expect(screen.getByText('"Hello"')).toBeInTheDocument()
  })

  it('renders array data', () => {
    const { container } = render(<CollapsibleJSON data={arrayData} />)
    expect(screen.getByText('[')).toBeInTheDocument()
    
    // Find the root array container
    const rootArray = container.querySelector('.relative') as HTMLElement
    expect(rootArray).toBeInTheDocument()
    
    // Use within to scope our queries to just the array indices
    const arrayIndices = within(rootArray).getAllByText(/[0-2]/, { selector: '.text-yellow-400' })
    expect(arrayIndices).toHaveLength(3)
    expect(arrayIndices[0]).toHaveTextContent('0')
    expect(arrayIndices[1]).toHaveTextContent('1')
    expect(arrayIndices[2]).toHaveTextContent('2')
    
    expect(screen.getByText(']')).toBeInTheDocument()
  })

  it('handles empty objects and arrays', () => {
    const { rerender } = render(<CollapsibleJSON data={{}} />)
    expect(screen.getByText('{}')).toBeInTheDocument()

    rerender(<CollapsibleJSON data={[]} />)
    expect(screen.getByText('[]')).toBeInTheDocument()
  })

  it('toggles expansion on click', async () => {
    const user = userEvent.setup()
    const { container } = render(<CollapsibleJSON data={nestedData} />)

    // Initially expanded
    const rootObject = container.querySelector('.relative') as HTMLElement
    expect(rootObject).toBeInTheDocument()
    
    // Find the first chevron (root level) by finding the button that's a direct child of the root object's first div
    const expandButton = rootObject.querySelector(':scope > div > button') as HTMLElement
    expect(expandButton).toBeInTheDocument()
    expect(within(expandButton).getByTestId('chevron-down')).toBeInTheDocument()
    expect(screen.getByText('"name"')).toBeInTheDocument()
    expect(screen.getByText('"John"')).toBeInTheDocument()

    // Click to collapse
    await user.click(expandButton)

    // Now collapsed
    expect(within(expandButton).getByTestId('chevron-right')).toBeInTheDocument()
    expect(screen.getByText('4 properties')).toBeInTheDocument()
  })

  it('respects maxAutoExpandDepth prop', () => {
    const { container } = render(<CollapsibleJSON data={nestedData} maxAutoExpandDepth={1} />)
    
    // First level should be expanded
    expect(screen.getByText('"name"')).toBeInTheDocument()
    expect(screen.getByText('"John"')).toBeInTheDocument()
    
    // Find the address object container
    const addressContainer = container.querySelector('.relative .relative') as HTMLElement
    expect(addressContainer).toBeInTheDocument()
    
    // Second level (address) should be collapsed initially
    const addressChevron = within(addressContainer).getByTestId('chevron-right')
    expect(addressChevron).toBeInTheDocument()
  })

  it('respects maxAutoExpandArraySize prop', () => {
    const largeArray = Array.from({ length: 15 }, (_, i) => i)
    const { container } = render(<CollapsibleJSON data={largeArray} maxAutoExpandArraySize={10} />)
    
    // Find the root array container
    const rootArray = container.querySelector('.relative') as HTMLElement
    expect(rootArray).toBeInTheDocument()
    
    // Should be collapsed initially because array is larger than maxAutoExpandArraySize
    expect(within(rootArray).getByTestId('chevron-right')).toBeInTheDocument()
    expect(screen.getByText('15 items')).toBeInTheDocument()
  })

  it('respects maxAutoExpandObjectSize prop', () => {
    const largeObject = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [`key${i}`, i])
    )
    const { container } = render(<CollapsibleJSON data={largeObject} maxAutoExpandObjectSize={5} />)
    
    // Find the root object container
    const rootObject = container.querySelector('.relative') as HTMLElement
    expect(rootObject).toBeInTheDocument()
    
    // Should be collapsed initially because object has more properties than maxAutoExpandObjectSize
    expect(within(rootObject).getByTestId('chevron-right')).toBeInTheDocument()
    expect(screen.getByText('15 properties')).toBeInTheDocument()
  })
}) 