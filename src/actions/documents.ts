"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { TranslationService, TranslationError, type TranslationProvider } from "@/services/translation-service"
import { logActivity } from "@/services/activity-service"
import { validateMime } from "@/lib/mime-validator"
import { rateLimit } from "@/lib/rate-limit"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { parsePageRange } from "@/lib/page-range"

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
  try {
    if (IMAGE_EXTENSIONS.includes(ext)) {
      originalText = await extractTextFromImage(buffer)
    } else if (ext === ".pdf") {
      const loadingTask = getDocument({ data: new Uint8Array(buffer) })
      const doc = await loadingTask.promise
      pdfPageCount = doc.numPages
      const selectedPages = pagesInput ? parsePageRange(pagesInput, pdfPageCount) : []
      const pagesToExtract = selectedPages.length > 0 ? selectedPages : Array.from({ length: pdfPageCount }, (_, i) => i + 1)
      const pageTexts: string[] = []
      for (const pageNum of pagesToExtract) {
        const page = await doc.getPage(pageNum)
        const content = await page.getTextContent()
        const text = (content.items as { str?: string }[])
          .filter((item) => "str" in item)
          .map((item) => item.str ?? "")
          .join(" ")
        pageTexts.push(text)
      }
      originalText = pageTexts.join("\n\n").replace(/\0/g, "")
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      originalText = result.value.replace(/\0/g, "")
    } else {
      originalText = buffer.toString("utf-8").replace(/\0/g, "")
    }
  } catch (err) {
    console.error("Error extrayendo texto:", err instanceof Error ? err.message : err)
    if (err instanceof Error) console.error("Stack:", err.stack)
    return { error: `No se pudo extraer el texto del archivo ${ext}. Asegúrate de que no esté protegido o dañado.` }
  }

  const storedName = `${Date.now()}-${sanitizeFileName(file.name)}`
  const uploadDir = join(process.cwd(), "uploads")

  await mkdir(uploadDir, { recursive: true })

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
      },
    })
  } catch {
    return { error: "Error al guardar el documento. El archivo podría tener un formato no compatible." }
  }

  await logActivity({
    userId: session.user.id,
    type: "document_uploaded",
    detail: `"${file.name}" subido (${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()})`,
    documentId: document.id,
    metadata: { sourceLanguage, targetLanguage, fileSize: file.size },
  }).catch(() => {})

  const provider = (documentProvider ||
    (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { translationProvider: true },
    }))?.translationProvider) as TranslationProvider | undefined

  const service = new TranslationService(provider)

  try {
    const result = await service.translate({
      text: originalText,
      sourceLanguage,
      targetLanguage,
    })

    await prisma.document.update({
      where: { id: document.id },
      data: {
        translatedText: result.translatedText,
        status: "completed",
      },
    })

    await logActivity({
      userId: session.user.id,
      type: "document_translated",
      detail: `"${file.name}" traducido de ${sourceLanguage.toUpperCase()} a ${targetLanguage.toUpperCase()}`,
      documentId: document.id,
      metadata: { sourceLanguage, targetLanguage, wordCount, charCount },
    })
  } catch (err) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "error" },
    })
    const message = err instanceof TranslationError ? err.message : "Error al procesar la traducción"
    return { error: message }
  }

  revalidatePath("/dashboard/documents")
  revalidatePath("/dashboard")

  return { success: true, documentId: document.id }
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
