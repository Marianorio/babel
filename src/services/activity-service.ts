import { prisma } from "@/lib/prisma"

export type ActivityType =
  | "user_registered"
  | "user_login"
  | "user_logout"
  | "document_uploaded"
  | "document_translated"
  | "document_deleted"
  | "document_downloaded"
  | "profile_updated"
  | "password_changed"
  | "settings_changed"

export async function logActivity(params: {
  userId: string
  type: ActivityType
  detail?: string
  metadata?: Record<string, unknown>
  documentId?: string
}) {
  return prisma.activityLog.create({
    data: {
      userId: params.userId,
      type: params.type,
      detail: params.detail,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      documentId: params.documentId,
    },
  })
}

export async function getRecentActivity(
  userId: string,
  limit = 10
) {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      document: {
        select: { originalName: true },
      },
    },
  })
}

export const ACTIVITY_LABELS: Record<string, string> = {
  user_registered: "Usuario registrado",
  user_login: "Inicio de sesión",
  user_logout: "Cierre de sesión",
  document_uploaded: "Documento subido",
  document_translated: "Traducción completada",
  document_deleted: "Documento eliminado",
  document_downloaded: "Documento descargado",
  profile_updated: "Perfil actualizado",
  password_changed: "Contraseña cambiada",
  settings_changed: "Configuración actualizada",
}
