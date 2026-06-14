import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib"
import { logActivity } from "@/services/activity-service"
import { readFile } from "fs/promises"
import { join } from "path"
import { parsePageRange } from "@/lib/page-range"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!document) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  if (!document.translatedText) {
    return NextResponse.json(
      { error: "Traducción no disponible" },
      { status: 400 }
    )
  }

  await logActivity({
    userId: session.user.id,
    type: "document_downloaded",
    detail: `"${document.originalName}" descargado (PDF)`,
    documentId: document.id,
  }).catch(() => {})

  try {
    const helvetica = StandardFonts.Helvetica
    const helveticaBold = StandardFonts.HelveticaBold

    const blue = rgb(0.11, 0.30, 0.85)
    const darkGray = rgb(0.07, 0.09, 0.15)
    const mediumGray = rgb(0.42, 0.45, 0.50)
    const white = rgb(1, 1, 1)

    const pageWidth = 595.28
    const pageHeight = 841.89
    const margin = 56.69
    const contentWidth = pageWidth - 2 * margin

    // Extract clean translated text and paragraph data
    let paragraphs: { id: string; pageNum: number; y: number; x: number; height: number; text: string; lines: { y: number; texts: { str: string; x: number; width: number; height: number }[] }[] }[] | null = null
    let paraTranslations: Record<string, string> | null = null

    if (document.paragraphs) {
      try { paragraphs = JSON.parse(document.paragraphs) } catch { paragraphs = null }
    }
    if (document.paragraphTranslations) {
      try { paraTranslations = JSON.parse(document.paragraphTranslations) } catch { paraTranslations = null }
    }

    let cleanTranslatedText = document.translatedText
    if (paragraphs && paraTranslations) {
      const texts = paragraphs.map((p) => paraTranslations![p.id]).filter(Boolean)
      if (texts.length > 0) {
        cleanTranslatedText = texts.join("\n\n")
      }
    } else {
      cleanTranslatedText = document.translatedText
        .replace(/<\s*paragraph\s+[^>]*>\s*/gi, "")
        .replace(/<\s*\/\s*paragraph\s*>/gi, "")
        .trim()
    }

    const ext = document.storedName.substring(document.storedName.lastIndexOf(".")).toLowerCase()

    // Load source PDF if applicable
    let sourceDoc: PDFDocument | null = null
    let originalPageIndices: number[] = []

    if (ext === ".pdf") {
      const filePath = join(process.cwd(), "uploads", document.storedName)
      const origPdfBytes = await readFile(filePath)
      sourceDoc = await PDFDocument.load(origPdfBytes)
      const totalSourcePages = sourceDoc.getPageCount()

      if (document.pageRange && document.pageCount) {
        originalPageIndices = parsePageRange(document.pageRange, document.pageCount).map((p) => p - 1)
      } else {
        originalPageIndices = Array.from({ length: totalSourcePages }, (_, i) => i)
      }
    }

    // Create output PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(helvetica)
    const fontBold = await pdfDoc.embedFont(helveticaBold)

    // ── Cover page ──
    const tempDoc = await PDFDocument.create()
    const tempFont = await tempDoc.embedFont(helvetica)
    const tempFontBold = await tempDoc.embedFont(helveticaBold)
    const coverPage = tempDoc.addPage([pageWidth, pageHeight])
    coverPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: white })
    coverPage.drawRectangle({ x: 0, y: pageHeight * 0.7, width: pageWidth, height: pageHeight * 0.3, color: blue })
    coverPage.drawText("Babel", { x: margin, y: pageHeight * 0.72 + 60, size: 48, font: tempFontBold, color: white })
    coverPage.drawText("Traducciones", { x: margin, y: pageHeight * 0.72 + 20, size: 20, font: tempFont, color: white })
    coverPage.drawText("Documento traducido", { x: margin, y: pageHeight * 0.6, size: 16, font: tempFontBold, color: darkGray })

    const pageRangeText = document.pageRange ? `Páginas: ${document.pageRange}` : "Todas las páginas"
    const coverDetails = [
      `Nombre: ${document.originalName}`,
      `Idioma original: ${document.sourceLanguage.toUpperCase()}`,
      `Idioma destino: ${document.targetLanguage.toUpperCase()}`,
      `Fecha: ${document.createdAt.toLocaleDateString("es-ES")}`,
      `Palabras: ${document.wordCount || "N/A"}`,
      pageRangeText,
    ]
    coverDetails.forEach((detail, i) => {
      coverPage.drawText(detail, { x: margin, y: pageHeight * 0.55 - i * 20, size: 11, font: tempFont, color: mediumGray })
    })

    const [copiedCover] = await pdfDoc.copyPages(tempDoc, [0])
    pdfDoc.addPage(copiedCover)

    // ── Original pages (preserve images, layout) ──
    if (sourceDoc && originalPageIndices.length > 0) {
      const origPages = await pdfDoc.copyPages(sourceDoc, originalPageIndices)
      for (const page of origPages) {
        pdfDoc.addPage(page)
      }
    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      try {
        const filePath = join(process.cwd(), "uploads", document.storedName)
        const imgBytes = await readFile(filePath)
        let img
        if (ext === ".png") { img = await pdfDoc.embedPng(imgBytes) }
        else { img = await pdfDoc.embedJpg(imgBytes) }
        const imgPage = pdfDoc.addPage([pageWidth, pageHeight])
        const dims = img.scaleToFit(pageWidth - 2 * margin, pageHeight - 2 * margin)
        imgPage.drawImage(img, {
          x: (pageWidth - dims.width) / 2,
          y: (pageHeight - dims.height) / 2,
          width: dims.width,
          height: dims.height,
        })
      } catch (err) { console.error("Error embedding image:", err) }
    }

    // ── Translation pages: overlay on copied original pages ──
    if (sourceDoc && paragraphs && paraTranslations && originalPageIndices.length > 0) {
      const transPages = await pdfDoc.copyPages(sourceDoc, originalPageIndices)
      for (let pgIdx = 0; pgIdx < transPages.length; pgIdx++) {
        const page = transPages[pgIdx]
        const pageNum = pgIdx + 1
        const pageParas = paragraphs.filter((p) => p.pageNum === pageNum).sort((a, b) => b.y - a.y)
        let cursorY = pageHeight

        for (const para of pageParas) {
          const translation = paraTranslations[para.id]
          if (!translation) continue

          const firstLine = para.lines?.[0]
          const firstText = firstLine?.texts?.[0]
          const fontSize = Math.max(firstText?.height || 12, 10)
          const leftMargin = Math.max(firstText?.x || margin, margin)

          // Cover original text with white rectangles (oversized for full coverage)
          for (const line of para.lines || []) {
            for (const t of line.texts || []) {
              const fh = Math.max(t.height || 12, 10)
              page.drawRectangle({
                x: t.x - 2,
                y: line.y - 4,
                width: Math.max(t.width || 10, 10) + 6,
                height: fh + 8,
                color: white,
              })
            }
          }

          // Build per-line rightLimit map from original text bounding boxes (PDF coords)
          const fullEdge = pageWidth - margin
          const imgThreshold = 50
          const segments: { bottom: number; top: number; rightLimit: number }[] = []
          for (const line of para.lines || []) {
            if (line.texts.length === 0) continue
            const rightX = Math.max(...line.texts.map(t => (t.x || 0) + (t.width || 10)))
            const h = Math.max(...line.texts.map(t => (t.height || 12)))
            segments.push({ bottom: line.y, top: line.y + h, rightLimit: rightX })
          }

          function widthAt(y: number, isFirst: boolean): number {
            const defaultW = pageWidth - (isFirst ? leftMargin : margin) - margin
            if (segments.length === 0) return defaultW

            const textBottom = y
            const textTop = y + fontSize

            for (const seg of segments) {
              if (textBottom < seg.top && textTop > seg.bottom) {
                if (seg.rightLimit < fullEdge - imgThreshold) {
                  return isFirst ? seg.rightLimit - leftMargin : seg.rightLimit - margin
                }
                return defaultW
              }
            }

            const maxTop = Math.max(...segments.map(s => s.top))
            if (textBottom >= maxTop) return defaultW

            const textMid = (textBottom + textTop) / 2
            let nearest = segments[0]
            let minDist = Infinity
            for (const seg of segments) {
              const segMid = (seg.bottom + seg.top) / 2
              const d = Math.abs(textMid - segMid)
              if (d < minDist) { minDist = d; nearest = seg }
            }
            if (nearest.rightLimit < fullEdge - imgThreshold) {
              return isFirst ? nearest.rightLimit - leftMargin : nearest.rightLimit - margin
            }
            return defaultW
          }

          // Pre-calculate word-wrap with per-line width detection
          const words = translation.split(/\s+/)
          const textLines: { text: string; x: number; y: number }[] = []
          let currentLine = ""
          let currentY = Math.min(para.y, cursorY)
          let isFirstLine = true

          for (const word of words) {
            const maxWidth = widthAt(currentY, isFirstLine)
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const textWidth = font.widthOfTextAtSize(testLine, fontSize)
            if (textWidth > maxWidth && currentLine) {
              textLines.push({ text: currentLine, x: isFirstLine ? leftMargin : margin, y: currentY })
              currentLine = word
              currentY -= fontSize * 1.4
              isFirstLine = false
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) {
            textLines.push({ text: currentLine, x: isFirstLine ? leftMargin : margin, y: currentY })
          }

          // Draw white rectangles covering the full vertical span of the translation
          for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i]
            const maxWidth = widthAt(line.y, i === 0)
            page.drawRectangle({
              x: line.x,
              y: line.y - fontSize * 0.6,
              width: maxWidth,
              height: fontSize + 4,
              color: white,
            })
          }

          // Draw translated text
          for (const line of textLines) {
            page.drawText(line.text, {
              x: line.x,
              y: line.y,
              size: fontSize,
              font,
              color: darkGray,
            })
          }

          if (textLines.length > 0) {
            cursorY = textLines[textLines.length - 1].y - fontSize
          }
        }

        pdfDoc.addPage(page)
      }
    } else {
      // Fallback: plain text translation pages
      function wrapText(text: string, f: typeof font, size: number, maxWidth: number): string[] {
        const lines: string[] = []
        const paras = text.split("\n")
        for (const p of paras) {
          if (!p.trim()) { lines.push(""); continue }
          const words = p.split(" ")
          let cur = ""
          for (const word of words) {
            const test = cur ? `${cur} ${word}` : word
            if (f.widthOfTextAtSize(test, size) > maxWidth && cur) {
              lines.push(cur); cur = word
            } else { cur = test }
          }
          if (cur) lines.push(cur)
        }
        return lines
      }

      const transLines = wrapText(cleanTranslatedText, font, 11, contentWidth)
      const linesPerPage = Math.floor((pageHeight - 2 * margin - 80) / 17)
      for (let i = 0; i < transLines.length; i += linesPerPage) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        const chunk = transLines.slice(i, i + linesPerPage)
        let y = pageHeight - margin - 40
        for (const line of chunk) {
          page.drawText(line, { x: margin, y, size: 11, font, color: darkGray })
          y -= 17
        }
      }
    }

    const pdfBytes = await pdfDoc.save()
    const fileExt = document.originalName.split(".").pop()
    const downloadName = document.originalName.replace(
      `.${fileExt}`,
      `_${document.targetLanguage.toUpperCase()}.pdf`
    )

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    })
  } catch (error) {
    console.error("Error generando PDF:", error instanceof Error ? error.message : error)
    console.error("Stack:", error instanceof Error ? error.stack : "N/A")
    return NextResponse.json(
      { error: "Error al generar el PDF", detail: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
