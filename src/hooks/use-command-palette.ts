"use client"

import { useState, useEffect, useCallback } from "react"

interface Command {
  id: string
  label: string
  description?: string
  action: () => void
}

export function useCommandPalette(commands: Command[]) {
  const [query, setQuery] = useState("")

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  return { query, setQuery, filtered }
}
