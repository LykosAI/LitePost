import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

const mockFsStorage = new Map<string, Uint8Array>()

vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 'AppData' },
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(async (filename: string) => {
    const stored = mockFsStorage.get(filename)
    if (!stored) {
      throw new Error(`File not found: ${filename}`)
    }
    return stored
  }),
  writeFile: vi.fn(async (filename: string, contents: Uint8Array) => {
    mockFsStorage.set(filename, contents)
  }),
}))

// Extend expect with testing-library matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Suppress React 18 console warnings during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : ''
    if (
      /Warning: ReactDOM.render is no longer supported in React 18/.test(firstArg) ||
      /Function components cannot be given refs/.test(firstArg)
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Add missing window APIs
window.ResizeObserver = ResizeObserver
window.URL.createObjectURL = vi.fn()
window.URL.revokeObjectURL = vi.fn()

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockFsStorage.clear()
})
