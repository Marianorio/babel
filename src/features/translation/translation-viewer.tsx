"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Download,
  FileText,
  Languages,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatFileSize } from "@/lib/utils"
import type { Document } from "@/types"

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Traducción completada",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  processing: {
    icon: Clock,
    label: "Procesando traducción...",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  pending: {
    icon: Clock,
    label: "Pendiente",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800",
  },
  error: {
    icon: AlertCircle,
    label: "Error en la traducción",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
}

function getFileExt(name: string): string {
  return name.substring(name.lastIndexOf(".")).toLowerCase()
}

function OriginalDocumentViewer({ document: doc }: { document: Document }) {
  const ext = getFileExt(doc.originalName)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [loadingDocx, setLoadingDocx] = useState(true)

  useEffect(() => {
    if (ext !== ".docx") return

    async function loadDocx() {
      try {
        const resp = await fetch(`/api/files/${doc.id}`)
        const blob = await resp.blob()
        const buffer = await blob.arrayBuffer()
        const mammoth = await import("mammoth")
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
        setDocxHtml(result.value)
      } catch (err) {
        console.error("Error loading DOCX preview:", err)
      }
      setLoadingDocx(false)
    }
    loadDocx()
  }, [doc.id, ext])

  if (ext === ".pdf") {
    const pdfSrc = doc.pageRange ? `/api/files/${doc.id}/pdf-pages` : `/api/files/${doc.id}`
    return (
      <embed
        src={pdfSrc}
        type="application/pdf"
        className="w-full rounded-lg border border-border"
        style={{ height: "600px" }}
      />
    )
  }

  if (ext === ".docx") {
    if (loadingDocx) {
      return (
        <div className="flex items-center justify-center py-12">
          <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando documento...</span>
        </div>
      )
    }
    if (docxHtml) {
      return (
        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      )
    }
  }

  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
      {doc.originalText}
    </pre>
  )
}

export function TranslationViewer({ document }: { document: Document }) {
  const status = statusConfig[document.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {document.originalName}
              </h1>
              <Badge
                variant={
                  document.status === "completed"
                    ? "default"
                    : document.status === "error"
                    ? "destructive"
                    : "secondary"
                }
              >
                {document.status === "completed"
                  ? "Completado"
                  : document.status === "processing"
                  ? "Procesando"
                  : document.status === "error"
                  ? "Error"
                  : "Pendiente"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {document.sourceLanguage.toUpperCase()} →{" "}
              {document.targetLanguage.toUpperCase()} ·{" "}
              {formatFileSize(document.fileSize)}
              {document.wordCount > 0 && ` · ${document.wordCount} palabras`}
              {document.charCount > 0 && ` · ${document.charCount} caracteres`}
              {document.pageRange && ` · Páginas: ${document.pageRange}`}
              {" · "}
              {formatDate(document.createdAt)}
            </p>
          </div>
        </div>

        {document.translatedText && (
          <div className="flex gap-2">
            <a
              href={`/api/documents/${document.id}/download`}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              TXT
            </a>
            <a
              href={`/api/documents/${document.id}/download-pdf`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </a>
          </div>
        )}
      </div>

      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${status.bg}`}
      >
        <StatusIcon className={`h-5 w-5 ${status.color}`} />
        <span className={`text-sm font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-0 overflow-hidden rounded-xl border border-border lg:grid-cols-2">
        <div className="border-border lg:border-r">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Documento original</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {document.sourceLanguage.toUpperCase()}
            </Badge>
          </div>
          <div className="p-4">
            <OriginalDocumentViewer document={document} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
            <Languages className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Documento traducido</span>
            <Badge variant="default" className="ml-auto text-xs">
              {document.targetLanguage.toUpperCase()}
            </Badge>
          </div>
          <div className="p-4">
            {document.translatedText ? (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {document.translatedText}
              </pre>
            ) : document.status === "processing" ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Procesando traducción...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {document.status === "error"
                    ? "Ocurrió un error durante la traducción."
                    : "La traducción no está disponible."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
