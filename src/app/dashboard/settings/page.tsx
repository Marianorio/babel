import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/features/settings/settings-form"
import { PasswordForm } from "@/features/settings/password-form"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      language: true,
      theme: true,
      timezone: true,
      country: true,
      translationProvider: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tu perfil y configuración de cuenta.
        </p>
      </div>

      <SettingsForm
        user={{
          name: user.name,
          email: user.email,
          language: user.language,
          theme: user.theme,
          timezone: user.timezone,
          country: user.country,
          translationProvider: user.translationProvider,
        }}
      />
      <Separator />
      <PasswordForm />
    </div>
  )
}
