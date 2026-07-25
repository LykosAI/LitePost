import { useState, useEffect } from "react"

export function useResizablePanel(defaultWidth: number, minWidth: number, maxWidthPercentage: number = 0.9) {
    const [width, setWidth] = useState(defaultWidth)
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

    return { width, isDragging, setIsDragging }
}
