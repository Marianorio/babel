import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      originalName: true,
      paragraphs: true,
      paragraphTranslations: true,
      pageLines: true,
      pageLineTranslations: true,
      status: true,
    },
  })

  if (!doc) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const paragraphs = doc.paragraphs ? JSON.parse(doc.paragraphs) : null
  const paraTranslations = doc.paragraphTranslations ? JSON.parse(doc.paragraphTranslations) : null

  const summary = paragraphs
    ? paragraphs.map((p: any) => ({
        id: p.id,
        pageNum: p.pageNum,
        y: p.y,
        x: p.x,
        height: p.height,
        numLines: p.lines?.length || 0,
        textPreview: p.text?.substring(0, 80),
        translated: paraTranslations?.[p.id]?.substring(0, 80) || null,
      }))
    : null

  return NextResponse.json({
    status: doc.status,
    originalName: doc.originalName,
    hasParagraphs: !!doc.paragraphs,
    hasParagraphTranslations: !!doc.paragraphTranslations,
    paragraphCount: paragraphs?.length || 0,
    summary,
    pageLines: doc.pageLines ? JSON.parse(doc.pageLines).length : 0,
    firstParagraph: paragraphs?.[0] || null,
  })
}
