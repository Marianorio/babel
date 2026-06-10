import {
  FileText,
  ScrollText,
  Landmark,
  BadgeCheck,
  Building2,
  Globe,
} from "lucide-react"
import { Reveal, Stagger } from "@/components/reveal"

const services = [
  {
    title: "Contratos",
    description:
      "Traducción precisa de contratos comerciales, laborales y civiles manteniendo la validez legal.",
    icon: FileText,
  },
  {
    title: "Poderes",
    description:
      "Traducción de poderes notariales y documentos de representación legal.",
    icon: ScrollText,
  },
  {
    title: "Escrituras",
    description:
      "Traducción de escrituras públicas y documentos notariales con precisión técnica.",
    icon: Landmark,
  },
  {
    title: "Certificados",
    description:
      "Traducción de certificados de nacimiento, matrimonio, antecedentes y más.",
    icon: BadgeCheck,
  },
  {
    title: "Documentación corporativa",
    description:
      "Traducción de actas, estatutos y documentos societarios completos.",
    icon: Building2,
  },
  {
    title: "Documentación migratoria",
    description:
      "Traducción de documentos para procesos migratorios y de visados.",
    icon: Globe,
  },
]

export function Services() {
  return (
    <section id="services" className="border-t border-border px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Servicios especializados
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cubrimos todas las áreas del derecho con precisión técnica y
              terminología legal adecuada.
            </p>
          </div>
        </Reveal>

        <Stagger
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={100}
        >
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
                <service.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{service.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
