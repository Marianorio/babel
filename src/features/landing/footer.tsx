import Link from "next/link"
import { Languages, Mail, Globe, MessageCircle, Link2 } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Languages className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Babel</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Traducciones legales precisas impulsadas por inteligencia
              artificial.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Producto</h3>
            <ul className="space-y-3">
              {["Servicios", "Cómo funciona", "Beneficios", "Precios"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-3">
              {[
                "Términos y condiciones",
                "Política de privacidad",
                "Política de cookies",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">Contacto</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="mailto:hola@babel-translations.app"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  hola@babel-translations.app
                </Link>
              </li>
            </ul>
            <div className="mt-6 flex gap-4">
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Globe className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-primary hover:text-primary"
              >
                <Link2 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Babel Translations. Todos los
          derechos reservados.
        </div>
      </div>
    </footer>
  )
}
