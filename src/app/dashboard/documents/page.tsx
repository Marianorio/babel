import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DocumentsTable } from "@/features/documents/documents-table"
import { FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis documentos</h1>
          <p className="text-muted-foreground">
            Historial de todos tus documentos y traducciones.
          </p>
        </div>
        <Link href="/dashboard/translation/new">
          <Button>Nueva traducción</Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No hay documentos</h3>
            <p className="text-sm text-muted-foreground">
              Aún no has subido ningún documento para traducir.
            </p>
          </div>
          <Link href="/dashboard/translation/new">
            <Button variant="outline">Subir tu primer documento</Button>
          </Link>
        </div>
      ) : (
        <DocumentsTable documents={documents} />
      )}
    </div>
  )
}
