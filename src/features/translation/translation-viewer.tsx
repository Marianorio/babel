"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Download,
  FileText,
  Languages,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatFileSize } from "@/lib/utils"
import type { Document } from "@/types"

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Traducción completada",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  processing: {
    icon: Clock,
    label: "Procesando traducción...",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  pending: {
    icon: Clock,
    label: "Pendiente",
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
  error: {
    icon: AlertCircle,
    label: "Error en la traducción",
    color: "text-red-600",
    bg: "bg-red-50",
  },
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
              {formatFileSize(document.fileSize)} ·{" "}
              {formatDate(document.createdAt)}
            </p>
          </div>
        </div>

        {document.translatedText && (
          <a
            href={`/api/documents/${document.id}/download`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Descargar
          </a>
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
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {document.originalText}
            </pre>
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
