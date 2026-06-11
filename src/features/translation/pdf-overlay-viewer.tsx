"use client"

import { useEffect, useRef } from "react"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"

interface PdfOverlayViewerProps {
  pdfSrc: string
  translatedText: string
  totalPages: number
  onLoadingChange?: (loading: boolean) => void
}

export function PdfOverlayViewer({ pdfSrc, translatedText, totalPages, onLoadingChange }: PdfOverlayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    onLoadingChange?.(true)

    async function renderOverlay() {
      try {
        GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs"

        const pdf = await getDocument({ url: pdfSrc }).promise
        if (cancelled) return

        const actualPages = Math.min(totalPages || pdf.numPages, pdf.numPages)
        const pageOrigTexts: string[] = []

        for (let i = 1; i <= actualPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          pageOrigTexts.push(content.items.map((it: any) => it.str || "").join(" "))
        }

        const totalOrigChars = pageOrigTexts.reduce((s: number, t: string) => s + t.length, 0) || 1
        const container = containerRef.current
        if (!container || cancelled) return

        container.innerHTML = ""

        for (let pageNum = 1; pageNum <= actualPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const scale = 1.5
          const viewport = page.getViewport({ scale })
          const content = await page.getTextContent()

          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = "w-full rounded-lg border border-border mb-4"
          container.appendChild(canvas)

          const ctx = canvas.getContext("2d")!
          await page.render({ canvasContext: ctx, viewport } as any).promise

          const ratio = pageOrigTexts[pageNum - 1].length / totalOrigChars
          const prevChars = pageOrigTexts.slice(0, pageNum - 1).reduce((s: number, t: string) => s + t.length, 0)
          const start = Math.round(prevChars / totalOrigChars * translatedText.length)
          const chunkLen = Math.round(ratio * translatedText.length)
          const pageTrans = translatedText.slice(start, Math.min(start + chunkLen, translatedText.length))

          const margin = 56.69 * scale
          const contentWidth = viewport.width - 2 * margin

          const items = content.items as any[]
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

          for (const item of items) {
            const tx = item.transform
            const x = tx[4] * scale
            const y = viewport.height - tx[5] * scale
            const w = Math.max((item.width || 10) * scale, 10)
            const h = Math.max((item.height || 12) * scale, 12)
            if (x < minX) minX = x
            if (y - h < minY) minY = y - h
            if (x + w > maxX) maxX = x + w
            if (y > maxY) maxY = y
          }

          if (items.length > 0) {
            const padding = 8 * scale
            const rectX = Math.max(minX - padding, 0)
            const rectY = Math.max(minY - padding, 0)
            const rectW = Math.min(maxX - minX + 2 * padding, viewport.width - rectX)
            const rectH = Math.min(maxY - minY + 2 * padding, viewport.height - rectY)

            ctx.fillStyle = "#ffffff"
            ctx.fillRect(rectX, rectY, rectW, rectH)

            const fontSize = 11 * scale
            const lineHeight = 16 * scale
            ctx.fillStyle = "#1a1a1a"
            ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`

            const words = pageTrans.split(/\s+/)
            let line = ""
            let lineY = rectY + fontSize

            for (const word of words) {
              const testLine = line ? line + " " + word : word
              const metrics = ctx.measureText(testLine)
              if (metrics.width > contentWidth && line) {
                ctx.fillText(line, margin, lineY)
                line = word
                lineY += lineHeight
              } else {
                line = testLine
              }
            }
            if (line) ctx.fillText(line, margin, lineY)
          }
        }
      } catch (err) {
        console.error("Error rendering PDF overlay:", err)
      }
      if (!cancelled) onLoadingChange?.(false)
    }

    renderOverlay()

    return () => { cancelled = true }
  }, [pdfSrc, translatedText, totalPages, onLoadingChange])

  return (
    <div ref={containerRef} className="min-h-[200px]" />
  )
}
