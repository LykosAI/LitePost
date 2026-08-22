import { useState, useEffect } from "react"

/**
 * Width state for a right-hand slide-over panel, draggable from its left edge.
 *
 * Pass a `storageKey` to persist the width across sessions — the editor
 * height and history-collapse state already persist, so a panel snapping
 * back to its default width on every open stood out.
 */
export function useResizablePanel(
    defaultWidth: number,
    minWidth: number,
    maxWidthPercentage: number = 0.9,
    storageKey?: string
) {
    const [width, setWidth] = useState(() => {
        if (!storageKey) return defaultWidth
        try {
            const stored = Number(localStorage.getItem(storageKey))
            return Number.isFinite(stored) && stored >= minWidth ? stored : defaultWidth
        } catch {
            return defaultWidth
        }
    })
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault()
            const newWidth = window.innerWidth - e.clientX
            const maxWidth = window.innerWidth * maxWidthPercentage
            setWidth(Math.min(Math.max(minWidth, newWidth), maxWidth))
        }

        const handleMouseUp = () => setIsDragging(false)

        document.addEventListener("mousemove", handleMouseMove, { capture: true })
        document.addEventListener("mouseup", handleMouseUp, { capture: true })

        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        return () => {
            document.removeEventListener("mousemove", handleMouseMove, { capture: true })
            document.removeEventListener("mouseup", handleMouseUp, { capture: true })
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }
    }, [isDragging, minWidth, maxWidthPercentage])

    // Persist when a drag ends, not per mousemove.
    useEffect(() => {
        if (isDragging || !storageKey) return
        try {
            localStorage.setItem(storageKey, String(width))
        } catch {
            // persistence is best-effort
        }
    }, [isDragging, storageKey, width])

    return { width, isDragging, setIsDragging }
}
