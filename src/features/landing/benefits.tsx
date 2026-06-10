import { Shield, Zap, Target, Globe, Monitor } from "lucide-react"
import { Reveal, Stagger } from "@/components/reveal"

const benefits = [
  {
    title: "Seguridad",
    description:
      "Tus documentos están protegidos con encriptación de extremo a extremo y almacenamiento seguro.",
    icon: Shield,
  },
  {
    title: "Rapidez",
    description:
      "Obtén traducciones en minutos, no en días. Procesamiento impulsado por IA de última generación.",
    icon: Zap,
  },
  {
    title: "Precisión",
    description:
      "Terminología legal precisa gracias a modelos de IA entrenados con documentación jurídica.",
    icon: Target,
  },
  {
    title: "Disponibilidad global",
    description:
      "Traduce entre múltiples idiomas. Accede desde cualquier lugar del mundo.",
    icon: Globe,
  },
  {
    title: "Plataforma online",
    description:
      "Gestiona todos tus proyectos desde un solo lugar. Historial completo y descargas ilimitadas.",
    icon: Monitor,
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Por qué elegir Babel?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              La plataforma líder en traducción legal con inteligencia artificial.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal variant="slide-right" delay={100}>
            <div className="flex flex-col gap-8 h-full">
              {benefits.slice(1, 3).map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex flex-1 gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal variant="scale-in" delay={200}>
            <div className="flex items-center h-full">
              <div className="w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                  <Shield className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="text-xl font-semibold">Seguridad</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Tus documentos están protegidos con encriptación de extremo a
                  extremo y almacenamiento seguro.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal variant="slide-right" delay={300}>
            <div className="flex flex-col gap-8 h-full">
              {benefits.slice(3).map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex flex-1 gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
