"use client"

import { useState, useEffect, useCallback } from "react"

interface Command {
  id: string
  label: string
  description?: string
  action: () => void
}

export function useCommandPalette(commands: Command[]) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggle()
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
        setQuery("")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, toggle])

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  return { open, setOpen, query, setQuery, filtered, toggle }
}
