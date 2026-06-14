"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function GlobalError({ reset }: { reset: () => void }) {
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
            <CardTitle className="text-lg text-destructive">Algo salió mal</CardTitle>
            <CardDescription>
              Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="default" className="w-full" onClick={() => reset()}>
              Intentar de nuevo
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">Ir al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
