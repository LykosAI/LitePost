import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SettingsPanel } from '@/components/SettingsPanel'
import { useSettingsStore } from '@/store/settings'
import { checkForUpdatesManually } from '@/components/UpdateChecker'

// Mock the settings store
vi.mock('@/store/settings', () => ({
  useSettingsStore: vi.fn(() => ({
    jsonViewer: {
      maxAutoExpandDepth: 2,
      maxAutoExpandArraySize: 50,
      maxAutoExpandObjectSize: 20,
    },
    updateJSONViewerSettings: vi.fn(),
    network: {
      timeout: 30,
      connectTimeout: 10,
      sslVerification: true,
      proxy: '',
    },
    updateNetworkSettings: vi.fn(),
  }))
}))

// Mock the update checker
vi.mock('@/components/UpdateChecker', () => ({
  checkForUpdatesManually: vi.fn()
}))

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when closed', () => {
    render(<SettingsPanel open={false} onOpenChange={() => {}} />)
    expect(screen.queryByRole('heading', { name: 'JSON Viewer' })).not.toBeInTheDocument()
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
      updateJSONViewerSettings: vi.fn(),
      network: {
        timeout: 30,
        connectTimeout: 10,
        sslVerification: true,
        proxy: '',
      },
      updateNetworkSettings: vi.fn(),
    }
    vi.mocked(useSettingsStore).mockReturnValue(mockSettings)

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

  it('shows network settings section', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    expect(screen.getByRole('heading', { name: 'Network' })).toBeInTheDocument()
    expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
    expect(screen.getByText(/ssl certificate verification/i)).toBeInTheDocument()
    expect(screen.getByText(/proxy url/i)).toBeInTheDocument()
  })

  it('applies correct styling to sheet content', async () => {
    await act(async () => {
      render(<SettingsPanel open={true} onOpenChange={() => {}} />)
    })
    const content = screen.getByRole('dialog')
    expect(content).toHaveClass('right-0')
  })
}) 