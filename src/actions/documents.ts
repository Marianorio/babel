"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { logActivity } from "@/services/activity-service"
import { validateMime } from "@/lib/mime-validator"
import { rateLimit } from "@/lib/rate-limit"

import { parsePageRange } from "@/lib/page-range"
import type { Paragraph, TextItem } from "@/types"

const NORMALIZE_WS = (s: string) => s.replace(/\s+/g, " ").trim()

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp"]
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js")
  const { data } = await Tesseract.recognize(buffer, "spa+eng")
  return data.text.replace(/\0/g, "")
}

export async function uploadDocument(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { error: "No autorizado" }

    const file = formData.get("file") as File
    const sourceLanguage = formData.get("sourceLanguage") as string
    const targetLanguage = formData.get("targetLanguage") as string
    const documentProvider = formData.get("translationProvider") as string
    const pagesInput = formData.get("pages") as string

  if (!file || !sourceLanguage || !targetLanguage) {
    return { error: "Todos los campos son obligatorios" }
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: "Formato no permitido. Usa PDF, DOCX, TXT, PNG o JPG." }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "El archivo excede el tamaño máximo de 10 MB" }
  }

  const rateCheck = rateLimit(`upload:${session.user.id}`, 10, 60000)
  if (!rateCheck.allowed) {
    return { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = extname(file.name).toLowerCase()

  if (!validateMime(buffer, ext.replace(".", ""))) {
    return { error: "El archivo no coincide con el formato declarado o está corrupto." }
  }

  let originalText = ""
  let pdfPageCount: number | null = null
  let allPageLines: { pageNum: number; lines: { y: number; chars: number; texts: TextItem[] }[] }[] = []
  let allParagraphs: Paragraph[] = []
  try {
    if (IMAGE_EXTENSIONS.includes(ext)) {
      originalText = await extractTextFromImage(buffer)
    } else if (ext === ".pdf") {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
      const doc = await loadingTask.promise
      pdfPageCount = doc.numPages
      const selectedPages = pagesInput ? parsePageRange(pagesInput, pdfPageCount) : []
      const pagesToExtract = selectedPages.length > 0 ? selectedPages : Array.from({ length: pdfPageCount }, (_, i) => i + 1)
      const pageTexts: string[] = []
      allPageLines = []
      allParagraphs = []
      let paragraphCounter = 0

      let seqPageNum = 0
      for (const pageNum of pagesToExtract) {
        seqPageNum++
        const page = await doc.getPage(pageNum)
        const content = await page.getTextContent()
        const items = content.items as any[]

        const sorted = items
          .map((it: any) => ({ item: it, y: Math.round(it.transform[5]) }))
          .sort((a: any, b: any) => a.y - b.y)

        const clusters: { y: number; items: any[] }[] = []
        for (const { item, y } of sorted) {
          if (clusters.length === 0 || Math.abs(clusters[clusters.length - 1].y - y) > 3) {
            clusters.push({ y, items: [item] })
          } else {
            clusters[clusters.length - 1].items.push(item)
          }
        }

        const lines: { y: number; chars: number; texts: TextItem[] }[] = []

        for (const cluster of clusters) {
          cluster.items.sort((a: any, b: any) => a.transform[4] - b.transform[4])
          const lineStr = NORMALIZE_WS(cluster.items.map((it: any) => it.str).join(" "))
          if (!lineStr) continue

          const prevLine = lines[lines.length - 1]
          if (prevLine) {
            const prevText = NORMALIZE_WS(prevLine.texts.map(t => t.str).join(" "))
            if (prevText === lineStr) continue
          }

          lines.push({
            y: cluster.y,
            chars: lineStr.length,
            texts: cluster.items.map((it: any) => ({
              str: it.str,
              x: Math.round(it.transform[4] * 100) / 100,
              width: Math.round((it.width || 10) * 100) / 100,
              height: Math.round((it.height || 12) * 100) / 100,
            })),
          })
        }

        allPageLines.push({ pageNum: seqPageNum, lines })

        const paraLines: { y: number; chars: number; texts: TextItem[] }[] = []
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li]
          if (paraLines.length === 0) {
            paraLines.push(line)
            continue
          }
          const prevLine = paraLines[paraLines.length - 1]
          const prevFontH = prevLine.texts[0]?.height || 12
          const isNewPara = (line.y - prevLine.y) > prevFontH * 1.8
          if (isNewPara) {
            paraLines.reverse()
            const paraText = NORMALIZE_WS(paraLines.map(l => l.texts.map(t => t.str).join(" ")).join(" "))
            if (paraText) {
              paragraphCounter++
              const id = "P" + String(paragraphCounter).padStart(4, "0")
              const firstLine = paraLines[0]
              const lastLine = paraLines[paraLines.length - 1]
              const lastFontH = lastLine.texts[0]?.height || 12
              allParagraphs.push({
                id,
                pageNum: seqPageNum,
                y: firstLine.y,
                x: Math.min(...firstLine.texts.map(t => t.x)),
                height: Math.abs(lastLine.y - firstLine.y) + lastFontH,
                text: paraText,
                lines: [...paraLines],
              })
            }
            paraLines.length = 0
          }
          paraLines.push(line)
        }

        if (paraLines.length > 0) {
          paraLines.reverse()
          const paraText = NORMALIZE_WS(paraLines.map(l => l.texts.map(t => t.str).join(" ")).join(" "))
          if (paraText) {
            paragraphCounter++
            const id = "P" + String(paragraphCounter).padStart(4, "0")
            const firstLine = paraLines[0]
            const lastLine = paraLines[paraLines.length - 1]
            const lastFontH = lastLine.texts[0]?.height || 12
            allParagraphs.push({
              id,
              pageNum: seqPageNum,
              y: firstLine.y,
              x: Math.min(...firstLine.texts.map(t => t.x)),
              height: Math.abs(lastLine.y - firstLine.y) + lastFontH,
              text: paraText,
              lines: [...paraLines],
            })
          }
        }

        pageTexts.push(lines.map(l => l.texts.map(t => t.str).join(" ")).join("\n"))
      }
      allParagraphs.sort((a, b) => a.pageNum - b.pageNum || b.y - a.y)
      originalText = pageTexts.join("\n\n").replace(/\0/g, "")
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      originalText = result.value.replace(/\0/g, "")
    } else {
      originalText = buffer.toString("utf-8").replace(/\0/g, "")
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error extrayendo texto:", msg)
    if (err instanceof Error) console.error("Stack:", err.stack)
    return { error: `No se pudo extraer el texto del archivo ${ext}. Error: ${msg}` }
  }

  const storedName = `${Date.now()}-${sanitizeFileName(file.name)}`
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads")

  try {
    await mkdir(uploadDir, { recursive: true })
  } catch {
    return { error: "Error al crear el directorio de archivos. Verifica que UPLOAD_DIR esté configurado correctamente." }
  }

  const filePath = join(uploadDir, storedName)
  await writeFile(filePath, buffer)

  const wordCount = countWords(originalText)
  const charCount = originalText.length

  let document
  try {
    document = await prisma.document.create({
      data: {
        userId: session.user.id,
        originalName: file.name,
        storedName,
        sourceLanguage,
        targetLanguage,
        originalText,
        status: "processing",
        fileSize: file.size,
        wordCount,
        charCount,
        ...(pagesInput ? { pageRange: pagesInput } : {}),
        ...(pdfPageCount ? { pageCount: pdfPageCount } : {}),
        ...(ext === ".pdf" ? { pageLines: JSON.stringify(allPageLines) } : {}),
        ...(ext === ".pdf" && allParagraphs.length > 0 ? { paragraphs: JSON.stringify(allParagraphs) } : {}),
      },
    })
    } catch (e) {
    console.error("Error guardando documento:", e instanceof Error ? e.message : e)
    return { error: "Error al guardar el documento. El archivo podría tener un formato no compatible." }
  }

  await logActivity({
    userId: session.user.id,
    type: "document_uploaded",
    detail: `"${file.name}" subido (${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()})`,
    documentId: document.id,
    metadata: { sourceLanguage, targetLanguage, fileSize: file.size },
  }).catch(() => {})

  await prisma.document.update({
    where: { id: document.id },
    data: { status: "pending" },
  })

  revalidatePath("/dashboard/documents")
  revalidatePath("/dashboard")

  return { success: true, documentId: document.id }
  } catch (e) {
    console.error("Error inesperado en uploadDocument:", e instanceof Error ? e.message : e)
    return { error: "Error interno del servidor. Intentá de nuevo o probá con el proveedor Mock." }
  }
}

export async function getDocuments() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function getDocumentById(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })
}

export async function deleteDocument(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    select: { originalName: true },
  })

  await prisma.document.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (doc) {
    await logActivity({
      userId: session.user.id,
      type: "document_deleted",
      detail: `"${doc.originalName}" eliminado`,
    })
  }

  revalidatePath("/dashboard/documents")
  return { success: true }
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const name = formData.get("name") as string
  if (!name || name.length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres" }
  }

  const data: Record<string, string> = { name }

  const language = formData.get("language") as string
  if (language) data.language = language

  const theme = formData.get("theme") as string
  if (theme) data.theme = theme

  const timezone = formData.get("timezone") as string
  if (timezone) data.timezone = timezone

  const country = formData.get("country") as string
  if (country) data.country = country

  const translationProvider = formData.get("translationProvider") as string
  if (translationProvider) data.translationProvider = translationProvider

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  await logActivity({
    userId: session.user.id,
    type: "profile_updated",
    detail: `Perfil actualizado`,
    metadata: { changes: Object.keys(data).join(", ") },
  }).catch(() => {})

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateUserPassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string

  if (!currentPassword || !newPassword) {
    return { error: "Todos los campos son obligatorios" }
  }

  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres" }
  }

  const bcrypt = await import("bcryptjs")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) return { error: "Usuario no encontrado" }
  if (!user.password) return { error: "No puedes cambiar la contraseña de una cuenta vinculada" }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    return { error: "La contraseña actual es incorrecta" }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  })

  await logActivity({
    userId: session.user.id,
    type: "password_changed",
    detail: "Contraseña actualizada",
  }).catch(() => {})

  return { success: true }
}
