import { Upload, Brain, Languages, Download } from "lucide-react"
import { Reveal, Stagger } from "@/components/reveal"

const steps = [
  {
    number: "01",
    title: "Sube tu documento",
    description:
      "Arrastra y suelta tu documento legal en PDF, DOCX o TXT. Lo procesamos de forma segura.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Procesamiento inteligente",
    description:
      "Nuestra IA analiza el documento, preservando el formato y la estructura legal original.",
    icon: Brain,
  },
  {
    number: "03",
    title: "Traducción automática",
    description:
      "El documento se traduce manteniendo la precisión terminológica y el contexto legal.",
    icon: Languages,
  },
  {
    number: "04",
    title: "Descarga inmediata",
    description:
      "Obtén tu documento traducido al instante. Descárgalo cuando lo necesites.",
    icon: Download,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-muted/50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Cuatro pasos simples para traducir tus documentos legales.
            </p>
          </div>
        </Reveal>

        <Stagger
          className="mt-16 grid gap-8 md:grid-cols-4"
          staggerDelay={150}
        >
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-20 top-12 hidden h-0.5 w-[calc(100%-5rem)] bg-border md:block" />
              )}
              <div className="relative flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/30">
                  <step.icon className="h-7 w-7 text-primary-foreground transition-transform duration-300 group-hover:rotate-12" />
                </div>
                <span className="mt-4 text-sm font-medium text-primary">
                  Paso {step.number}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
