import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SettingsPanel } from '@/components/SettingsPanel'
import { useSettingsStore } from '@/store/settings'
import type { SettingsState } from '@/store/settings'
import { checkForUpdatesManually } from '@/components/UpdateChecker'

const mockUseSettings = useSettings as unknown as ReturnType<typeof vi.fn>

// Mock the settings store
vi.mock('@/store/settings', () => ({
  useSettings: vi.fn()
}))

// Mock the update checker
vi.mock('@/components/UpdateChecker', () => ({
  checkForUpdatesManually: vi.fn()
}))

describe('SettingsPanel', () => {
  const mockSettings: Partial<SettingsState> = {
    jsonViewer: {
      maxAutoExpandDepth: 2,
      maxAutoExpandArraySize: 50,
      maxAutoExpandObjectSize: 20,
    },
    updateJSONViewerSettings: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSettings.mockReturnValue(mockSettings)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger button correctly', () => {
    render(<SettingsPanel open={false} onOpenChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('calls onOpenChange when trigger button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(<SettingsPanel open={false} onOpenChange={onOpenChange} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('renders settings content when open is true', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    expect(screen.getByRole('heading', { name: 'JSON Viewer' })).toBeInTheDocument()
  })

  it('shows current JSON viewer settings', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    expect(screen.getByText(/auto-expand depth/i)).toBeInTheDocument()
    expect(screen.getByText(/max array size/i)).toBeInTheDocument()
    expect(screen.getByText(/max object size/i)).toBeInTheDocument()
  })

  it('updates JSON viewer settings when sliders change', async () => {
    const mockSettings = {
      jsonViewer: {
        maxAutoExpandDepth: 2,
        maxAutoExpandArraySize: 50,
        maxAutoExpandObjectSize: 50
      },
      updateJSONViewerSettings: vi.fn()
    }
    vi.mocked(useSettings).mockReturnValue(mockSettings)

    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })

    const sliders = screen.getAllByRole('slider')
    const depthSlider = sliders[0]
    const arraySlider = sliders[1]
    const objectSlider = sliders[2]

    await act(async () => {
      fireEvent.keyDown(depthSlider, { key: 'ArrowRight' })
    })
    expect(mockSettings.updateJSONViewerSettings).toHaveBeenCalledWith({
      maxAutoExpandDepth: 3
    })

    await act(async () => {
      fireEvent.keyDown(arraySlider, { key: 'ArrowRight' })
    })
    expect(mockSettings.updateJSONViewerSettings).toHaveBeenCalledWith({
      maxAutoExpandArraySize: 60
    })

    await act(async () => {
      fireEvent.keyDown(objectSlider, { key: 'ArrowRight' })
    })
    expect(mockSettings.updateJSONViewerSettings).toHaveBeenCalledWith({
      maxAutoExpandObjectSize: 55
    })
  })

  it('handles update check button click', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /check now/i }))
    })
    expect(checkForUpdatesManually).toHaveBeenCalled()
  })

  it('shows coming soon sections', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    const comingSoonElements = screen.getAllByText(/coming soon/i)
    expect(comingSoonElements).toHaveLength(2)
  })

  it('applies correct styling to sheet content', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    const content = screen.getByRole('dialog')
    expect(content).toHaveClass('right-0')
  })
}) 