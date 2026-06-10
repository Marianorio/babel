"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signIn, signOut } from "@/lib/auth"
import { logActivity } from "@/services/activity-service"

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios" }
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "Email inválido" }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "El email ya está registrado" }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  })

  await logActivity({
    userId: user.id,
    type: "user_registered",
    detail: `Usuario "${name}" registrado`,
  }).catch(() => {})

  await signIn("credentials", { email, password, redirect: false })

  return { success: true }
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Todos los campos son obligatorios" }
  }

  try {
    await signIn("credentials", { email, password, redirect: false })

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    })

    if (user) {
      await logActivity({
        userId: user.id,
        type: "user_login",
        detail: `Inicio de sesión de "${user.name}"`,
      }).catch(() => {})
    }

    return { success: true }
  } catch {
    return { error: "Credenciales inválidas" }
  }
}

export async function logoutUser(userId?: string) {
  if (userId) {
    await logActivity({
      userId,
      type: "user_logout",
      detail: "Cierre de sesión",
    }).catch(() => {})
  }
  await signOut({ redirect: false })
}
