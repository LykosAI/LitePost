import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnvironmentPanel } from '@/components/EnvironmentPanel'

// Mock the EnvironmentManager component
vi.mock('@/components/EnvironmentManager', () => ({
  EnvironmentManager: () => <div data-testid="environment-manager">Environment Manager Mock</div>
}))

describe('EnvironmentPanel', () => {
  it('does not render content when closed', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={false} onOpenChange={onOpenChange} />)

    expect(screen.queryByText('Environment Manager')).not.toBeInTheDocument()
    expect(screen.queryByTestId('environment-manager')).not.toBeInTheDocument()
  })

  it('renders sheet content when open is true', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={true} onOpenChange={onOpenChange} />)

    expect(screen.getByText('Environment Manager')).toBeInTheDocument()
    expect(screen.getByTestId('environment-manager')).toBeInTheDocument()
  })

  it('applies correct styling to sheet content', () => {
    const onOpenChange = vi.fn()
    render(<EnvironmentPanel open={true} onOpenChange={onOpenChange} />)

    const sheetContent = screen.getByRole('dialog')
    expect(sheetContent).toHaveClass(
      'sm:max-w-none',
      'border-l',
      'bg-background',
      'text-foreground'
    )
  })
}) 