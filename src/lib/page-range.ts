export function parsePageRange(input: string, totalPages: number): number[] {
  if (!input || !input.trim()) return []

  const pages = new Set<number>()
  const parts = input.split(",").map((s) => s.trim())

  for (const part of parts) {
    const range = part.split("-").map((s) => s.trim())
    if (range.length === 1) {
      const page = parseInt(range[0], 10)
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pages.add(page)
      }
    } else if (range.length === 2) {
      const start = parseInt(range[0], 10)
      const end = parseInt(range[1], 10)
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= totalPages && start <= end) {
        for (let i = start; i <= end; i++) {
          pages.add(i)
        }
      }
    }
  }

  return [...pages].sort((a, b) => a - b)
}
