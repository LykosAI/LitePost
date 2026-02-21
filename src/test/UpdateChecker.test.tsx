import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { UpdateChecker, checkForUpdatesManually } from '@/components/UpdateChecker'
import { toast } from 'sonner'
import type { Update } from '@tauri-apps/plugin-updater'

// Mock dependencies
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}))

type ToastOptions = {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  id?: string | number;
}

vi.mock('sonner', () => ({
  toast: {
    message: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}))

// Import mocked modules
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

describe('UpdateChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('UpdateChecker Component', () => {
    it('checks for updates on mount', async () => {
      vi.mocked(check).mockResolvedValue(null)
      
      await act(async () => {
        render(<UpdateChecker />)
      })

      expect(check).toHaveBeenCalledTimes(1)
      expect(toast.success).toHaveBeenCalledWith(
        'You are using the latest version.',
        expect.any(Object)
      )
    })

    it('checks for updates periodically', async () => {
      vi.mocked(check).mockResolvedValue(null)
      
      await act(async () => {
        render(<UpdateChecker />)
      })

      expect(check).toHaveBeenCalledTimes(1)

      // Fast forward 24 hours
      await act(async () => {
        vi.advanceTimersByTime(24 * 60 * 60 * 1000)
      })

      expect(check).toHaveBeenCalledTimes(2)
    })

    it('prevents duplicate checks within 5 seconds', async () => {
      vi.mocked(check).mockResolvedValue(null)
      
      const { rerender } = render(<UpdateChecker />)

      // Fast forward 3 seconds and trigger another check
      await act(async () => {
        vi.advanceTimersByTime(3000)
        rerender(<UpdateChecker />)
      })

      expect(check).toHaveBeenCalledTimes(1)

      // Fast forward another 3 seconds (total 6 seconds) and trigger another check
      await act(async () => {
        vi.advanceTimersByTime(3000)
        // Manually trigger a check since we're testing the throttling
        await checkForUpdatesManually()
      })

      expect(check).toHaveBeenCalledTimes(2)
    })
  })

  describe('checkForUpdatesManually', () => {
    it('shows success toast when no update is available', async () => {
      vi.mocked(check).mockResolvedValue(null)

      await checkForUpdatesManually()

      expect(toast.success).toHaveBeenCalledWith(
        'You are using the latest version.',
        expect.any(Object)
      )
    })

    it('shows update available toast when update exists', async () => {
      const mockUpdate = {
        version: '1.1.0',
        body: 'New features available',
        date: new Date().toISOString(),
        currentVersion: '1.0.0',
        available: true,
        downloadAndInstall: vi.fn(),
      } as unknown as Update

      vi.mocked(check).mockResolvedValue(mockUpdate)

      await checkForUpdatesManually()

      expect(toast.message).toHaveBeenCalledWith(
        'Update Available',
        expect.objectContaining({
          description: 'Version 1.1.0 is available. New features available',
        })
      )
    })

    it('shows error toast when check fails', async () => {
      const error = new Error('Network error')
      vi.mocked(check).mockRejectedValue(error)

      await expect(checkForUpdatesManually()).rejects.toThrow('Network error')

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to check for updates',
        expect.any(Object)
      )
    })

    it('handles update installation process', async () => {
      const mockUpdate = {
        version: '1.1.0',
        body: 'New features available',
        date: new Date().toISOString(),
        currentVersion: '1.0.0',
        available: true,
        downloadAndInstall: vi.fn().mockImplementation(async (callback) => {
          // Simulate download progress
          callback({ event: 'Started', data: { contentLength: 1000 } })
          callback({ event: 'Progress', data: { chunkLength: 500 } })
          callback({ event: 'Progress', data: { chunkLength: 500 } })
          callback({ event: 'Finished' })
        }),
      } as unknown as Update

      vi.mocked(check).mockResolvedValue(mockUpdate)

      await checkForUpdatesManually()

      // Click the "Install Now" button by calling the onClick handler
      const toastCall = vi.mocked(toast.message).mock.calls[0][1] as ToastOptions
      await toastCall?.action?.onClick()

      // Verify progress updates
      expect(toast.loading).toHaveBeenCalledWith(
        'Installing update...',
        expect.objectContaining({
          description: expect.any(Object),
        })
      )

      expect(relaunch).toHaveBeenCalled()
    })

    it('handles installation errors', async () => {
      const mockUpdate = {
        version: '1.1.0',
        body: 'New features available',
        date: new Date().toISOString(),
        currentVersion: '1.0.0',
        available: true,
        downloadAndInstall: vi.fn().mockRejectedValue(new Error('Download failed')),
      } as unknown as Update

      vi.mocked(check).mockResolvedValue(mockUpdate)

      await checkForUpdatesManually()

      // Click the "Install Now" button by calling the onClick handler
      const toastCall = vi.mocked(toast.message).mock.calls[0][1] as ToastOptions
      await toastCall?.action?.onClick()

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to install update',
        expect.any(Object)
      )
    })
  })
}) 
