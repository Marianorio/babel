"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, User, Palette, Globe } from "lucide-react"
import { toast } from "sonner"
import { updateUserProfile } from "@/actions/documents"
import { useTheme } from "next-themes"

interface UserData {
  name: string
  email: string
  language: string
  theme: string
  timezone: string | null
  country: string | null
  translationProvider: string
}

const TIMEZONES = Intl.supportedValuesOf?.("timeZone") || [
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
]

const COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "BO", label: "Bolivia" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "CR", label: "Costa Rica" },
  { value: "CU", label: "Cuba" },
  { value: "DO", label: "República Dominicana" },
  { value: "EC", label: "Ecuador" },
  { value: "ES", label: "España" },
  { value: "GT", label: "Guatemala" },
  { value: "HN", label: "Honduras" },
  { value: "MX", label: "México" },
  { value: "NI", label: "Nicaragua" },
  { value: "PA", label: "Panamá" },
  { value: "PE", label: "Perú" },
  { value: "PR", label: "Puerto Rico" },
  { value: "PY", label: "Paraguay" },
  { value: "SV", label: "El Salvador" },
  { value: "US", label: "Estados Unidos" },
  { value: "UY", label: "Uruguay" },
  { value: "VE", label: "Venezuela" },
]

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
]

const PROVIDERS = [
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI (de pago)" },
  { value: "mock", label: "Mock (simulado)" },
]

export function SettingsForm({ user }: { user: UserData }) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateUserProfile(formData)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    const newTheme = formData.get("theme") as string
    if (newTheme) setTheme(newTheme)

    toast.success("Perfil actualizado")
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Información personal
          </CardTitle>
          <CardDescription>
            Actualiza tu nombre y otros datos personales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El email no se puede cambiar.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Preferencias
          </CardTitle>
          <CardDescription>
            Configura tu idioma, tema y región.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Idioma de la interfaz</Label>
            <Select key={user.language} name="language" defaultValue={user.language}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Select key={user.theme} name="theme" defaultValue={user.theme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select key={user.timezone || ""} name="timezone" defaultValue={user.timezone || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona horaria" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Select key={user.country || ""} name="country" defaultValue={user.country || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Proveedor de traducción
          </CardTitle>
          <CardDescription>
            Selecciona el proveedor de IA para las traducciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="translationProvider">Proveedor</Label>
            <Select
              key={user.translationProvider || "mock"}
              name="translationProvider"
              defaultValue={user.translationProvider || "gemini"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <CardContent className="px-0">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </CardContent>
    </form>
  )
}
