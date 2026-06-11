"use client"

import { useEffect, useRef, useCallback } from "react"
import { Search, FileText, Languages, LayoutDashboard, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCommandPalette } from "@/hooks/use-command-palette"

interface Props {
  onClose: () => void
}

export function CommandPalette({ onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = [
    {
      id: "dashboard",
      label: "Ir al Dashboard",
      description: "Ver resumen de actividad",
      action: () => { router.push("/dashboard"); onClose() },
    },
    {
      id: "documents",
      label: "Mis documentos",
      description: "Ver historial de documentos",
      action: () => { router.push("/dashboard/documents"); onClose() },
    },
    {
      id: "new-translation",
      label: "Nueva traducción",
      description: "Subir y traducir un documento",
      action: () => { router.push("/dashboard/translation/new"); onClose() },
    },
    {
      id: "settings",
      label: "Configuración",
      description: "Ajustes de cuenta y preferencias",
      action: () => { router.push("/dashboard/settings"); onClose() },
    },
  ]

  const { query, setQuery, filtered } = useCommandPalette(commands)

  const handleClose = useCallback(() => {
    setQuery("")
    onClose()
  }, [onClose, setQuery])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleClose])

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2">
        <div className="rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar comandos..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action()
                    setQuery("")
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    {cmd.id === "dashboard" && <LayoutDashboard className="h-4 w-4" />}
                    {cmd.id === "documents" && <FileText className="h-4 w-4" />}
                    {cmd.id === "new-translation" && <Languages className="h-4 w-4" />}
                    {cmd.id === "settings" && <Settings className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{cmd.label}</p>
                    {cmd.description && (
                      <p className="text-xs text-muted-foreground">{cmd.description}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
