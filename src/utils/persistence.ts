const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

const shouldLogPersistenceErrors =
  typeof import.meta !== 'undefined' &&
  Boolean(import.meta.env?.DEV) &&
  import.meta.env?.MODE !== 'test'

// ── Tauri filesystem backend ──

let ensureAppDataDirPromise: Promise<void> | null = null

async function ensureAppDataDirectory(): Promise<void> {
  if (!ensureAppDataDirPromise) {
    const { mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    ensureAppDataDirPromise = mkdir('', {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    }).catch(() => {
      // Directory might already exist or be unavailable in the current runtime.
    })
  }

  await ensureAppDataDirPromise
}

async function tauriLoad<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    await ensureAppDataDirectory()
    const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const contents = await readFile(filename, { baseDir: BaseDirectory.AppData })
    const data = JSON.parse(new TextDecoder().decode(contents))
    return data as T
  } catch {
    return defaultValue
  }
}

async function tauriSave(filename: string, data: unknown): Promise<void> {
  try {
    await ensureAppDataDirectory()
    const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
    const encoded = new TextEncoder().encode(JSON.stringify(data, null, 2))
    await writeFile(filename, encoded, { baseDir: BaseDirectory.AppData })
  } catch (error) {
    if (shouldLogPersistenceErrors) {
      console.error(`Failed to save ${filename}:`, error)
    }
  }
}

// ── localStorage fallback for browser dev ──

function localLoad<T>(filename: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`litepost:${filename}`)
    return raw ? JSON.parse(raw) as T : defaultValue
  } catch {
    return defaultValue
  }
}

function localSave(filename: string, data: unknown): void {
  try {
    localStorage.setItem(`litepost:${filename}`, JSON.stringify(data))
  } catch (error) {
    if (shouldLogPersistenceErrors) {
      console.error(`Failed to save ${filename}:`, error)
    }
  }
}

// ── Public API ──

export async function loadFromFile<T>(filename: string, defaultValue: T): Promise<T> {
  if (isTauri) return tauriLoad(filename, defaultValue)
  return localLoad(filename, defaultValue)
}

export async function saveToFile(filename: string, data: unknown): Promise<void> {
  if (isTauri) return tauriSave(filename, data)
  localSave(filename, data)
}

// Helper to convert ISO date strings back to Date objects in loaded data
export function convertDates<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Array) {
    return obj.map(item => convertDates<any>(item)) as unknown as T
  }

  if (obj instanceof Object) {
    const converted = { ...obj }
    for (const key in converted) {
      if (typeof converted[key] === 'string') {
        // Check if string matches ISO date format
        const dateCheck = Date.parse(converted[key])
        if (!isNaN(dateCheck) && converted[key].includes('T')) {
          converted[key] = new Date(converted[key])
        }
      } else if (converted[key] instanceof Object) {
        converted[key] = convertDates(converted[key])
      }
    }
    return converted as T
  }

  return obj
}
