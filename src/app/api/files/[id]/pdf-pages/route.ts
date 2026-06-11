import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { PDFDocument } from "pdf-lib"
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

  const filePath = join(process.cwd(), "uploads", document.storedName)

  let pdfBytes: Buffer
  try {
    pdfBytes = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado en el servidor" }, { status: 404 })
  }

  if (document.pageRange && document.pageCount) {
    try {
      const sourceDoc = await PDFDocument.load(pdfBytes)
      const pageNumbers = parsePageRange(document.pageRange, document.pageCount)
      if (pageNumbers.length > 0) {
        const zeroBasedPages = pageNumbers.map((p) => p - 1)
        const destDoc = await PDFDocument.create()
        const copiedPages = await destDoc.copyPages(sourceDoc, zeroBasedPages)
        copiedPages.forEach((page) => destDoc.addPage(page))
        pdfBytes = Buffer.from(await destDoc.save())
      }
    } catch (err) {
      console.error("Error filtering PDF pages:", err)
    }
  }

  const ext = document.storedName.substring(document.storedName.lastIndexOf(".")).toLowerCase()

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.originalName.replace(ext, `_paginas${document.pageRange ? `_${document.pageRange}` : ""}${ext}`)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
