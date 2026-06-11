"use client"

import { useEffect, useRef } from "react"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"

interface PdfOverlayViewerProps {
  pdfSrc: string
  translatedText: string
  totalPages: number
  pageLinesJson?: string | null
  pageLineTranslationsJson?: string | null
  paragraphsJson?: string | null
  paragraphTranslationsJson?: string | null
  onLoadingChange?: (loading: boolean) => void
}

interface ParaLine {
  y: number
  texts: { str: string; x: number; width: number; height: number }[]
}

interface Para {
  id: string
  pageNum: number
  y: number
  x: number
  height: number
  text: string
  lines: ParaLine[]
}

const NORMALIZE = (s: string) => s.replace(/\s+/g, " ").trim()

export function PdfOverlayViewer({
  pdfSrc,
  translatedText,
  totalPages,
  pageLinesJson,
  pageLineTranslationsJson,
  paragraphsJson,
  paragraphTranslationsJson,
  onLoadingChange,
}: PdfOverlayViewerProps) {
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
        const pageLines = pageLinesJson ? JSON.parse(pageLinesJson) : null
        const pageTranslations = pageLineTranslationsJson ? JSON.parse(pageLineTranslationsJson) : null
        const paragraphs: Para[] | null = paragraphsJson ? JSON.parse(paragraphsJson) : null
        const paraTranslations: Record<string, string> | null = paragraphTranslationsJson ? JSON.parse(paragraphTranslationsJson) : null
        const container = containerRef.current
        if (!container || cancelled) return

        container.innerHTML = ""

        for (let pageNum = 1; pageNum <= actualPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const scale = 1.5
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = "w-full rounded-lg border border-border mb-4"
          container.appendChild(canvas)

          const ctx = canvas.getContext("2d")!
          await page.render({ canvasContext: ctx, viewport } as any).promise

          const pagePara = paragraphs?.filter(p => p.pageNum === pageNum) || []
          const margin = viewport.width * 0.08
          const rightMargin = margin

          if (pagePara.length > 0 && paraTranslations) {
            const textItems: { x: number; y: number; w: number; h: number }[] = []
            for (const para of pagePara) {
              for (const line of para.lines) {
                for (const t of line.texts) {
                  textItems.push({
                    x: t.x * scale,
                    y: viewport.height - line.y * scale,
                    w: Math.max((t.width || 10) * scale, 10),
                    h: Math.max((t.height || 12) * scale, 14),
                  })
                }
              }
            }

            ctx.fillStyle = "#ffffff"
            for (const item of textItems) {
              ctx.fillRect(item.x - 1, item.y - item.h - 1, item.w + 2, item.h + 4)
            }

            ctx.fillStyle = "#1a1a1a"
            let cursorY = 0

            for (const para of pagePara) {
              const translation = paraTranslations[para.id]
              if (!translation) continue

              const firstLine = para.lines[0]
              const firstText = firstLine.texts[0]
              const indentX = Math.max(firstText ? firstText.x * scale : margin, margin)
              const paraY = viewport.height - para.y * scale - 4
              const effectiveY = Math.max(paraY, cursorY)

              const fontSize = Math.max((firstText?.height || 12) * scale, 10)
              ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`

              const paraWidth = viewport.width - indentX - rightMargin
              const wrapWidth = viewport.width - 2 * margin
              const words = translation.split(/\s+/)
              let currentLine = ""
              let currentY = effectiveY
              let isFirstLine = true

              for (const word of words) {
                const testLine = currentLine ? currentLine + " " + word : word
                const metrics = ctx.measureText(testLine)
                const maxWidth = isFirstLine ? paraWidth : wrapWidth
                if (metrics.width > maxWidth && currentLine) {
                  ctx.fillText(currentLine, isFirstLine ? indentX : margin, currentY)
                  currentLine = word
                  currentY += fontSize * 1.4
                  isFirstLine = false
                } else {
                  currentLine = testLine
                }
              }
              if (currentLine) ctx.fillText(currentLine, isFirstLine ? indentX : margin, currentY)

              cursorY = currentY + fontSize * 0.4
            }
          } else {
            const pageData = pageLines?.find((pd: any) => pd.pageNum === pageNum)
            const transData = pageTranslations?.find((pd: any) => pd.pageNum === pageNum)

            let textItems: { x: number; y: number; w: number; h: number }[] = []
            let lineYPositions: { y: number; fontSize: number; indentX: number }[] = []
            let lineTranslations: string[] = []

            if (pageData && pageData.lines.length > 0) {
              for (const line of pageData.lines) {
                for (const t of line.texts) {
                  textItems.push({
                    x: t.x * scale,
                    y: viewport.height - line.y * scale,
                    w: Math.max((t.width || 10) * scale, 10),
                    h: Math.max((t.height || 12) * scale, 14),
                  })
                }
                const firstText = line.texts[0]
                const indentX = firstText ? firstText.x * scale : 0
                lineYPositions.push({
                  y: viewport.height - line.y * scale - 4,
                  fontSize: Math.max((line.texts[0]?.height || 12) * scale, 10),
                  indentX: Math.max(indentX, margin),
                })
              }
              if (transData && transData.translations.length > 0) {
                lineTranslations = transData.translations
              } else {
                const lineWords = (l: any) => l.texts.map((t: any) => t.str).join(" ").split(/\s+/).filter(Boolean).length
                const totalPageWords = pageData.lines.reduce((s: number, l: any) => s + lineWords(l), 0) || 1
                const allPageWords = pageLines!.reduce((s: number, pd: any) => s + pd.lines.reduce((s2: number, l: any) => s2 + lineWords(l), 0), 0) || 1
                const ratio = totalPageWords / allPageWords
                const prevWords = pageLines!
                  .filter((pd: any) => pd.pageNum < pageNum)
                  .reduce((s: number, pd: any) => s + pd.lines.reduce((s2: number, l: any) => s2 + lineWords(l), 0), 0)

                const transWords = translatedText.split(/\s+/).filter(Boolean)
                const pageStart = Math.round(prevWords / allPageWords * transWords.length)
                const pageLen = Math.round(ratio * transWords.length)

                let wordStart = 0
                for (const line of pageData.lines) {
                  const wc = lineWords(line)
                  const nWords = Math.max(Math.round((wc / totalPageWords) * pageLen), 1)
                  lineTranslations.push(transWords.slice(pageStart + wordStart, pageStart + wordStart + nWords).join(" "))
                  wordStart += nWords
                }
              }
            } else {
              const content = await page.getTextContent()
              const items = content.items as any[]

              let firstTextY = Infinity
              for (const item of items) {
                const tx = item.transform
                const itemX = tx[4] * scale
                const itemY = viewport.height - tx[5] * scale
                textItems.push({
                  x: itemX,
                  y: itemY,
                  w: Math.max((item.width || 10) * scale, 10),
                  h: Math.max((item.height || 12) * scale, 14),
                })
                if (itemY < firstTextY) firstTextY = itemY
              }
              if (items.length > 0) {
                lineYPositions.push({ y: firstTextY - 12 * scale - 4, fontSize: 12 * scale, indentX: margin })
                lineTranslations = [translatedText]
              }
            }

            ctx.fillStyle = "#ffffff"
            for (const item of textItems) {
              ctx.fillRect(item.x - 1, item.y - item.h - 1, item.w + 2, item.h + 4)
            }

            ctx.fillStyle = "#1a1a1a"
            let overflowY = 0
            let prevY = 0
            let prevFontSize = 12

            for (let i = 0; i < lineYPositions.length; i++) {
              const transText = lineTranslations[i]
              if (!transText) continue

              const { y, fontSize, indentX = margin } = lineYPositions[i]

              const isNewParagraph = prevY > 0 && (y - prevY) > prevFontSize * 1.8
              if (isNewParagraph) overflowY = 0

              const effectiveY = Math.max(y, prevY + overflowY)
              ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`

              const rightMargin = margin
              const lineWidth = viewport.width - indentX - rightMargin
              const wrapWidth = viewport.width - 2 * margin
              const words = transText.split(/\s+/)
              let currentLine = ""
              let currentY = effectiveY
              let isFirstLine = true

              for (const word of words) {
                const testLine = currentLine ? currentLine + " " + word : word
                const metrics = ctx.measureText(testLine)
                const maxWidth = isFirstLine ? lineWidth : wrapWidth
                if (metrics.width > maxWidth && currentLine) {
                  ctx.fillText(currentLine, isFirstLine ? indentX : margin, currentY)
                  currentLine = word
                  currentY += fontSize * 1.4
                  isFirstLine = false
                } else {
                  currentLine = testLine
                }
              }
              if (currentLine) ctx.fillText(currentLine, isFirstLine ? indentX : margin, currentY)

              overflowY = Math.max(0, currentY + fontSize * 0.4 - y)
              prevY = y
              prevFontSize = fontSize
            }
          }
        }
      } catch (err) {
        console.error("Error rendering PDF overlay:", err)
      }
      if (!cancelled) onLoadingChange?.(false)
    }

    renderOverlay()

    return () => { cancelled = true }
  }, [pdfSrc, translatedText, totalPages, pageLinesJson, pageLineTranslationsJson, paragraphsJson, paragraphTranslationsJson, onLoadingChange])

  return (
    <div ref={containerRef} className="min-h-[200px]" />
  )
}
