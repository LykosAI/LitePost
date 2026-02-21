export function getRequestNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname.split('/').pop() || url
  } catch {
    return url
  }
}

export function decodeUrlForDisplay(url: string): string {
  try {
    // First try to parse it as a URL to handle full URLs
    const parsed = new URL(url)
    const decodedPath = decodeURIComponent(parsed.pathname)
    return `${parsed.origin}${decodedPath}${parsed.search}`
  } catch {
    // If it's not a full URL, just decode the string
    return decodeURIComponent(url)
  }
} 