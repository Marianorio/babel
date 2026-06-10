import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DocumentsTable } from "@/features/documents/documents-table"
import { DocumentsFilters } from "@/features/documents/documents-filters"
import { FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface SearchParams {
  search?: string
  status?: string
  language?: string
  sort?: string
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const search = params.search || ""
  const status = params.status || ""
  const language = params.language || ""
  const sort = params.sort || "desc"

  const where: Record<string, unknown> = { userId: session.user.id }
  if (search) {
    where.originalName = { contains: search, mode: "insensitive" }
  }
  if (status) {
    where.status = status
  }
  if (language) {
    where.targetLanguage = language
  }

  const orderBy = (() => {
    switch (sort) {
      case "asc": return { createdAt: "asc" as const }
      case "name_asc": return { originalName: "asc" as const }
      case "name_desc": return { originalName: "desc" as const }
      case "size_desc": return { fileSize: "desc" as const }
      case "size_asc": return { fileSize: "asc" as const }
      default: return { createdAt: "desc" as const }
    }
  })()

  const documents = await prisma.document.findMany({
    where,
    orderBy,
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

      <DocumentsFilters
        search={search}
        status={status}
        language={language}
        sort={sort}
      />

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {search || status || language ? "Sin resultados" : "No hay documentos"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {search || status || language
                ? "Prueba con otros filtros de búsqueda."
                : "Aún no has subido ningún documento para traducir."}
            </p>
          </div>
          {!search && !status && !language && (
            <Link href="/dashboard/translation/new">
              <Button variant="outline">Subir tu primer documento</Button>
            </Link>
          )}
        </div>
      ) : (
        <DocumentsTable documents={documents} />
      )}
    </div>
  )
}
