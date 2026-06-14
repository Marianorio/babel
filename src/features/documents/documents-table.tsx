"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Download, Trash2, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatFileSize } from "@/lib/utils"
import { deleteDocument } from "@/actions/documents"
import { toast } from "sonner"
import type { Document } from "@/types"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Completado", variant: "default" },
  processing: { label: "Procesando", variant: "secondary" },
  pending: { label: "Pendiente", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
}

export function DocumentsTable({ documents }: { documents: Document[] }) {
  const router = useRouter()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return

    const result = await deleteDocument(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Documento eliminado")
      router.refresh()
    }
  }

  const ActionButtons = ({ doc }: { doc: Document }) => (
    <div className="flex items-center gap-1">
      <Link href={`/dashboard/translation/${doc.id}`}>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
      {doc.translatedText && (
        <>
          <a
            href={`/api/documents/${doc.id}/download`}
            download
            className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-4 w-4" />
          </a>
          <a
            href={`/api/documents/${doc.id}/download-pdf`}
            download
            className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FileDown className="h-4 w-4" />
          </a>
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDelete(doc.id, doc.originalName)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/dashboard/translation/${doc.id}`}
                className="font-medium hover:text-primary text-sm leading-tight line-clamp-2"
              >
                {doc.originalName}
              </Link>
              <Badge variant={statusMap[doc.status]?.variant || "outline"} className="shrink-0">
                {statusMap[doc.status]?.label || doc.status}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{doc.sourceLanguage.toUpperCase()} → {doc.targetLanguage.toUpperCase()}</span>
              <span>·</span>
              <span>{formatFileSize(doc.fileSize)}</span>
              <span>·</span>
              <span>{formatDate(doc.createdAt)}</span>
            </div>
            <div className="mt-3 flex justify-end">
              <ActionButtons doc={doc} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Idiomas</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/translation/${doc.id}`}
                    className="hover:text-primary"
                  >
                    {doc.originalName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doc.sourceLanguage.toUpperCase()} →{" "}
                  {doc.targetLanguage.toUpperCase()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[doc.status]?.variant || "outline"}>
                    {statusMap[doc.status]?.label || doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(doc.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ActionButtons doc={doc} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
