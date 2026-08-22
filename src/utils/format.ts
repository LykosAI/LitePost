/**
 * Human-readable byte size: `512 B`, `1.5 KB`, `2.0 MB`.
 *
 * The single formatter for every size badge in the UI — four components had
 * grown their own, disagreeing on suffixes and rounding (a 5 MB response
 * rendered as "5120.0KB" in the response header).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
