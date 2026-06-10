import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FileText, Languages, Clock, CheckCircle2, TrendingUp, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { getUserStats } from "@/services/stats-service"
import { StatsCharts } from "@/features/dashboard/stats-charts"
import { getRecentActivity, ACTIVITY_LABELS } from "@/services/activity-service"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  })

  const totalDocs = await prisma.document.count({
    where: { userId: session.user.id },
  })

  const completedDocs = await prisma.document.count({
    where: { userId: session.user.id, status: "completed" },
  })

  const recentDocs = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const stats = await getUserStats(session.user.id)
  const recentActivities = await getRecentActivity(session.user.id, 5)

  const statCards = [
    {
      title: "Documentos totales",
      value: totalDocs,
      icon: FileText,
      color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
    },
    {
      title: "Traducciones completadas",
      value: completedDocs,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
    },
    {
      title: "Idiomas disponibles",
      value: 4,
      icon: Languages,
      color: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
    },
    {
      title: "Palabras traducidas",
      value: stats.totalWords.toLocaleString(),
      icon: TrendingUp,
      color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.name || session.user.name}. Resumen de tu actividad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card
            key={stat.title}
            className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 transition-transform duration-300 group-hover:scale-110 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StatsCharts stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <div>
                  <p className="font-medium">No hay documentos aún</p>
                  <p className="text-sm text-muted-foreground">
                    Comienza tu primera traducción
                  </p>
                </div>
                <Link href="/dashboard/translation/new">
                  <Button>
                    Nueva traducción
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/translation/${doc.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.sourceLanguage.toUpperCase()} →{" "}
                        {doc.targetLanguage.toUpperCase()}
                      </p>
                    </div>
                    <div
                      className={`ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : doc.status === "processing"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : doc.status === "error"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {doc.status === "completed"
                        ? "Completado"
                        : doc.status === "processing"
                        ? "Procesando"
                        : doc.status === "error"
                        ? "Error"
                        : "Pendiente"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acción rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/translation/new">
              <Button className="w-full justify-start gap-3" size="lg">
                <Languages className="h-5 w-5" />
                Nueva traducción
              </Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                size="lg"
              >
                <FileText className="h-5 w-5" />
                Ver mis documentos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay actividad reciente.
            </p>
          ) : (
            <div className="space-y-0">
              {recentActivities.map((activity, i) => (
                <div key={activity.id} className="relative flex gap-4 pb-4 last:pb-0">
                  {i < recentActivities.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                  )}
                  <div className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {ACTIVITY_LABELS[activity.type] || activity.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.detail}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
