"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, X, Loader2, Languages, ArrowRight, File, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { uploadDocument } from "@/actions/documents"
import { LANGUAGES } from "@/types"
import type { Language } from "@/types"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]

const PROVIDERS = [
  { value: "mock", label: "Mock (simulado)" },
  { value: "libretranslate", label: "LibreTranslate (gratuito)" },
  { value: "argos", label: "Argos (auto-hospedado)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "gemini", label: "Gemini (gratuito)" },
  { value: "openai", label: "OpenAI" },
]

export function NewTranslationForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [pageRange, setPageRange] = useState("")
  const [pdfPages, setPdfPages] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPdfPages(0)
      setPageRange("")
      setPreviewUrl(null)
      setTextContent(null)
      setDocxHtml(null)
      return
    }

    const name = file.name.toLowerCase()

    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      setTextContent(null)
      setDocxHtml(null)

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      async function getPageCount() {
        try {
          const doc = await getDocument({ url }).promise
          setPdfPages(doc.numPages)
        } catch {
          setPdfPages(0)
        }
      }

      getPageCount()

      return () => { URL.revokeObjectURL(url) }
    }

    if (file.type === "text/plain" || name.endsWith(".txt")) {
      setPdfPages(0)
      setPageRange("")
      setPreviewUrl(null)
      setDocxHtml(null)

      const reader = new FileReader()
      reader.onload = () => setTextContent(reader.result as string)
      reader.readAsText(file)
      return
    }

    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
      setPdfPages(0)
      setPageRange("")
      setPreviewUrl(null)
      setTextContent(null)

      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const mammoth = await import("mammoth")
          const result = await mammoth.convertToHtml({ arrayBuffer: reader.result as ArrayBuffer })
          setDocxHtml(result.value)
        } catch {
          setDocxHtml(null)
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }
  }, [file])

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    validateAndSetFile(droppedFile)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  function validateAndSetFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      toast.error("Formato no permitido. Usa PDF, DOCX o TXT.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo de 10 MB")
      return
    }
    setFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !sourceLanguage || !targetLanguage) {
      toast.error("Completa todos los campos")
      return
    }
    if (sourceLanguage === targetLanguage) {
      toast.error("Los idiomas deben ser diferentes")
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("sourceLanguage", sourceLanguage)
    formData.append("targetLanguage", targetLanguage)
    if (provider) formData.append("translationProvider", provider)
    if (pageRange.trim()) formData.append("pages", pageRange.trim())

    const result = await uploadDocument(formData)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Traducción completada")
    router.push(`/dashboard/translation/${result.documentId}`)
    router.refresh()
  }

  const fileName = file?.name?.toLowerCase() || ""
  const isPdf = file?.type === "application/pdf" || fileName.endsWith(".pdf")
  const isTxt = file?.type === "text/plain" || fileName.endsWith(".txt")
  const isDocx = file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva traducción</h1>
        <p className="text-muted-foreground">
          Sube un documento legal y selecciona los idiomas para traducirlo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Idiomas</CardTitle>
            <CardDescription>
              Selecciona el idioma de origen y el idioma de destino.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source">Idioma origen</Label>
                <Select
                  value={sourceLanguage}
                  onValueChange={setSourceLanguage}
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LANGUAGES) as [Language, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Idioma destino</Label>
                <Select
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                >
                  <SelectTrigger id="target">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LANGUAGES) as [Language, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documento</CardTitle>
            <CardDescription>
              Arrastra y suelta tu archivo o haz clic para seleccionarlo.
              Formatos: PDF, DOCX, TXT (máx. 10 MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="file-upload"
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              {file ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    {isPdf ? <FileText className="h-6 w-6 text-primary" /> : isDocx ? <FileSpreadsheet className="h-6 w-6 text-primary" /> : <File className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {pdfPages > 0 && ` · ${pdfPages} páginas`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="mb-1 text-sm font-medium">
                    Arrastra tu documento aquí
                  </p>
                  <p className="text-xs text-muted-foreground">
                    o haz clic para seleccionar un archivo
                  </p>
                </>
              )}
            </label>

            {isPdf && previewUrl && (
              <embed
                src={previewUrl}
                type="application/pdf"
                className="w-full rounded-lg border border-border"
                style={{ height: "500px" }}
              />
            )}

            {isTxt && textContent !== null && (
              <pre className="max-h-96 w-full overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {textContent}
              </pre>
            )}

            {isDocx && docxHtml !== null && (
              <div
                className="max-h-96 w-full overflow-auto rounded-lg border border-border bg-white p-4 text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}

            {isPdf && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0 text-sm font-medium">Páginas:</Label>
                  <Input
                    placeholder="Ej: 1-3, 5, 7-9 (vacío = todas)"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecciona páginas o rangos específicos. Vacío = todas las páginas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proveedor de traducción</CardTitle>
            <CardDescription>
              Opcional. Si no seleccionas ninguno, se usará el configurado en Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Usar el de Settings" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full gap-2"
          size="lg"
          disabled={loading || !file || !sourceLanguage || !targetLanguage}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Traduciendo documento...
            </>
          ) : (
            <>
              <Languages className="h-5 w-5" />
              Traducir documento
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
