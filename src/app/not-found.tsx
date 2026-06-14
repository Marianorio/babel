import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image src="/BabelIcon2.webp" alt="Babel" width={30} height={48} className="mx-auto mb-4 rounded-xl" />
          <h1 className="text-2xl font-bold tracking-tight">404</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Babel Translations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Página no encontrada</CardTitle>
            <CardDescription>
              La página que buscas no existe o ha sido movida.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/">
              <Button variant="default" className="w-full">Ir al inicio</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">Iniciar sesión</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
