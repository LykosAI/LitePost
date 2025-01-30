import { BaseDirectory, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs'

export async function loadFromFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    // Ensure the app data directory exists
    try {
      await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
    } catch (e) {
      // Directory might already exist, ignore error
    }

    const contents = await readFile(filename, { baseDir: BaseDirectory.AppData })
    const data = JSON.parse(new TextDecoder().decode(contents))
    return data as T
  } catch (error) {
    console.log(`No ${filename} found, using default value`)
    return defaultValue
  }
}

export async function saveToFile(filename: string, data: unknown): Promise<void> {
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(data, null, 2))
    await writeFile(
      filename,
      encoded,
      { baseDir: BaseDirectory.AppData }
    )
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error)
  }
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