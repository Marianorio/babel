"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join, extname } from "path"
import { translationService } from "@/services/translation-service"

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function uploadDocument(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  const file = formData.get("file") as File
  const sourceLanguage = formData.get("sourceLanguage") as string
  const targetLanguage = formData.get("targetLanguage") as string

  if (!file || !sourceLanguage || !targetLanguage) {
    return { error: "Todos los campos son obligatorios" }
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: "Formato no permitido. Usa PDF, DOCX o TXT." }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "El archivo excede el tamaño máximo de 10 MB" }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = extname(file.name).toLowerCase()

  let originalText = ""
  try {
    if (ext === ".pdf") {
      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = ""
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const text = (content.items as { str?: string }[])
          .filter((item) => "str" in item)
          .map((item) => item.str ?? "")
          .join(" ")
        pages.push(text)
      }
      originalText = pages.join("\n\n").replace(/\0/g, "")
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      originalText = result.value.replace(/\0/g, "")
    } else {
      originalText = buffer.toString("utf-8").replace(/\0/g, "")
    }
  } catch {
    return { error: `No se pudo extraer el texto del archivo ${ext}. Asegúrate de que no esté protegido o dañado.` }
  }

  const storedName = `${Date.now()}-${sanitizeFileName(file.name)}`
  const uploadDir = join(process.cwd(), "uploads")

  await mkdir(uploadDir, { recursive: true })

  const filePath = join(uploadDir, storedName)
  await writeFile(filePath, buffer)

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
      },
    })
  } catch {
    return { error: "Error al guardar el documento. El archivo podría tener un formato no compatible." }
  }

  try {
    const result = await translationService.translate({
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
  } catch {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "error" },
    })
    return { error: "Error al procesar la traducción" }
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

  await prisma.document.deleteMany({
    where: { id, userId: session.user.id },
  })

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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  })

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

  return { success: true }
}
