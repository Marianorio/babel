"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Acceso denegado",
    description: "No tienes permiso para iniciar sesión con esa cuenta. Si es una cuenta nueva, asegúrate de que esté registrada como usuario de prueba en la consola de Google Cloud.",
  },
  Configuration: {
    title: "Error de configuración",
    description: "Ocurrió un error de configuración en el servidor. Intenta más tarde.",
  },
  OAuthSignin: {
    title: "Error de inicio de sesión",
    description: "Ocurrió un error al iniciar sesión con el proveedor. Intenta de nuevo.",
  },
  OAuthCallback: {
    title: "Error de autenticación",
    description: "Ocurrió un error al procesar la respuesta del proveedor. Intenta de nuevo.",
  },
  OAuthCreateAccount: {
    title: "Error de registro",
    description: "No se pudo crear la cuenta con el proveedor. Intenta de nuevo.",
  },
  OAuthAccountNotLinked: {
    title: "Cuenta no vinculada",
    description: "Esta cuenta de Google ya está registrada con otro método de inicio de sesión. Inicia sesión con tu email y contraseña.",
  },
  default: {
    title: "Error de autenticación",
    description: "Ocurrió un error al iniciar sesión. Intenta de nuevo.",
  },
}

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "default"
  const { title, description } = ERROR_MESSAGES[error] || ERROR_MESSAGES.default

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image src="/BabelIcon2.webp" alt="Babel" width={30} height={48} className="mx-auto mb-4 rounded-xl" />
          <h1 className="text-2xl font-bold tracking-tight">Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Babel Translations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">{title}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/login">
              <Button variant="default" className="w-full">Volver a iniciar sesión</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Ir al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
