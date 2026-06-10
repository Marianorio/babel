import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib"
import { logActivity } from "@/services/activity-service"

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
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const blue = rgb(0.11, 0.30, 0.85)
    const darkGray = rgb(0.07, 0.09, 0.15)
    const mediumGray = rgb(0.42, 0.45, 0.50)
    const lightGray = rgb(0.95, 0.96, 0.97)
    const white = rgb(1, 1, 1)

    const pageWidth = 595.28
    const pageHeight = 841.89
    const margin = 56.69
    const contentWidth = pageWidth - 2 * margin

    function sanitizeForPdf(text: string): string {
      return text
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/\u2022/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[^\x20-\x7E\xA0-\xFF\u00F1\u00D1\u00E1\u00C1\u00E9\u00C9\u00ED\u00CD\u00F3\u00D3\u00FA\u00DA\u00FC\u00DC\u00BF\u00A1]/g, "")
    }

    let pageNumber = 0

    function addHeaderFooter(page: PDFPage, title: string) {
      pageNumber++
      const { height } = page.getSize()
      page.drawRectangle({
        x: 0,
        y: height - 40,
        width: pageWidth,
        height: 40,
        color: blue,
      })
      page.drawText("Babel Translations", {
        x: margin,
        y: height - 28,
        size: 10,
        font: helveticaBold,
        color: white,
      })
      page.drawText(title, {
        x: pageWidth - margin - 150,
        y: height - 28,
        size: 8,
        font: helvetica,
        color: white,
      })
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: 30,
        color: lightGray,
      })
      page.drawText(
        `Generado por Babel Translations · ${new Date().toLocaleDateString("es-ES")}`,
        {
          x: margin,
          y: 10,
          size: 8,
          font: helvetica,
          color: mediumGray,
        }
      )
      page.drawText(`Página ${pageNumber}`, {
        x: pageWidth - margin - 40,
        y: 10,
        size: 8,
        font: helvetica,
        color: mediumGray,
      })
    }

    function wrapText(text: string, font: typeof helvetica, size: number, maxWidth: number): string[] {
      const lines: string[] = []
      const paragraphs = text.split("\n")
      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          lines.push("")
          continue
        }
        const words = paragraph.split(" ")
        let currentLine = ""
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const width = font.widthOfTextAtSize(testLine, size)
          if (width > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) lines.push(currentLine)
      }
      return lines
    }

    const safeOriginalText = sanitizeForPdf(document.originalText)
    const safeTranslatedText = sanitizeForPdf(document.translatedText)

    // Cover page
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight])
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: white,
    })
    coverPage.drawRectangle({
      x: 0,
      y: pageHeight * 0.7,
      width: pageWidth,
      height: pageHeight * 0.3,
      color: blue,
    })
    coverPage.drawText("Babel", {
      x: margin,
      y: pageHeight * 0.72 + 60,
      size: 48,
      font: helveticaBold,
      color: white,
    })
    coverPage.drawText("Traducciones", {
      x: margin,
      y: pageHeight * 0.72 + 20,
      size: 20,
      font: helvetica,
      color: white,
    })
    coverPage.drawText("Documento traducido", {
      x: margin,
      y: pageHeight * 0.6,
      size: 16,
      font: helveticaBold,
      color: darkGray,
    })

    const coverDetails = [
      `Nombre: ${document.originalName}`,
      `Idioma original: ${document.sourceLanguage.toUpperCase()}`,
      `Idioma destino: ${document.targetLanguage.toUpperCase()}`,
      `Fecha: ${document.createdAt.toLocaleDateString("es-ES")}`,
      `Palabras: ${document.wordCount || "N/A"}`,
    ]
    coverDetails.forEach((detail, i) => {
      coverPage.drawText(detail, {
        x: margin,
        y: pageHeight * 0.55 - i * 20,
        size: 11,
        font: helvetica,
        color: mediumGray,
      })
    })

    // Original text pages
    const origLines = wrapText(safeOriginalText, helvetica, 10, contentWidth)
    const linesPerPage = Math.floor((pageHeight - 2 * margin - 80) / 16)
    for (let i = 0; i < origLines.length; i += linesPerPage) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      addHeaderFooter(page, "Texto original")
      const chunk = origLines.slice(i, i + linesPerPage)
      let y = pageHeight - margin - 50
      if (i === 0) {
        page.drawText("Texto original", {
          x: margin,
          y: y + 10,
          size: 14,
          font: helveticaBold,
          color: blue,
        })
        y -= 30
      }
      for (const line of chunk) {
        page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: darkGray })
        y -= 16
      }
    }

    // Translated text pages
    const transLines = wrapText(safeTranslatedText, helvetica, 10, contentWidth)
    for (let i = 0; i < transLines.length; i += linesPerPage) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      addHeaderFooter(page, "Traducción")
      const chunk = transLines.slice(i, i + linesPerPage)
      let y = pageHeight - margin - 50
      if (i === 0) {
        page.drawText("Traducción", {
          x: margin,
          y: y + 10,
          size: 14,
          font: helveticaBold,
          color: blue,
        })
        y -= 30
      }
      for (const line of chunk) {
        page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: darkGray })
        y -= 16
      }
    }

    const pdfBytes = await pdfDoc.save()
    const ext = document.originalName.split(".").pop()
    const downloadName = document.originalName.replace(
      `.${ext}`,
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
