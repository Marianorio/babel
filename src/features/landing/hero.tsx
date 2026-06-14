import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"
import { Reveal } from "@/components/reveal"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/4 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/3 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal variant="fade-up" delay={0}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Traducción legal con IA
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={150}>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Traducciones legales precisas impulsadas por{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                inteligencia artificial
              </span>
            </h1>
          </Reveal>

          <Reveal variant="fade-up" delay={300}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Sube tus documentos legales, obtén traducciones rápidas y gestiona
              tus proyectos desde una sola plataforma.
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={450}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 text-base transition-all hover:scale-105 active:scale-95">
                  Comenzar ahora
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="gap-2 text-base transition-all hover:scale-105 active:scale-95">
                  <Play className="h-4 w-4" />
                  Ver demostración
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal variant="fade-up" delay={600}>
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 transition-all hover:shadow-3xl hover:shadow-primary/10">
            <div className="flex items-center gap-2 border-b border-border px-6 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                babel-translations.app/documents
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="border-r border-border p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <div className="h-4 w-4 rounded bg-primary/10" />
                  Documento original
                </div>
                <div className="space-y-2">
                  {[
                    "CONTRATO DE PRESTACIÓN DE SERVICIOS",
                    "Entre las partes...",
                    "Cláusula Primera: Objeto del contrato",
                    "El presente contrato tiene por objeto...",
                  ].map((text, i) => (
                    <div
                      key={i}
                      className="h-3 rounded bg-muted"
                      style={{ width: `${80 - i * 15}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
                  <div className="h-4 w-4 rounded bg-primary" />
                  Traducción al inglés
                </div>
                <div className="space-y-2">
                  {[
                    "SERVICE PROVIDER AGREEMENT",
                    "Between the parties...",
                    "Clause First: Purpose of the contract",
                    "This contract aims to...",
                  ].map((text, i) => (
                    <div
                      key={i}
                      className="h-3 rounded bg-primary/10"
                      style={{ width: `${80 - i * 15}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      </div>
    </section>
  )
}
