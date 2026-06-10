import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
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
    detail: `"${document.originalName}" descargado (TXT)`,
    documentId: document.id,
  }).catch(() => {})

  const ext = document.originalName.split(".").pop()
  const downloadName = document.originalName.replace(
    `.${ext}`,
    `_${document.targetLanguage.toUpperCase()}.txt`
  )

  const content = `=== DOCUMENTO ORIGINAL (${document.sourceLanguage.toUpperCase()}) ===\n\n${document.originalText}\n\n=== TRADUCCIÓN (${document.targetLanguage.toUpperCase()}) ===\n\n${document.translatedText}`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
    },
  })
}
