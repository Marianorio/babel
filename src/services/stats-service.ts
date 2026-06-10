import { prisma } from "@/lib/prisma"

export interface DashboardStats {
  totalDocuments: number
  completedTranslations: number
  pendingTranslations: number
  errorTranslations: number
  totalWords: number
  byLanguage: { language: string; count: number }[]
  last30Days: { date: string; count: number }[]
}

export async function getUserStats(userId: string): Promise<DashboardStats> {
  const [
    totalDocuments,
    completedTranslations,
    pendingTranslations,
    errorTranslations,
    totalWords,
    byLanguage,
    documents,
  ] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: "completed" } }),
    prisma.document.count({ where: { userId, status: "pending" } }),
    prisma.document.count({ where: { userId, status: "error" } }),
    prisma.document.aggregate({
      where: { userId },
      _sum: { wordCount: true },
    }),
    prisma.document.groupBy({
      by: ["targetLanguage"],
      where: { userId },
      _count: true,
    }),
    prisma.document.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const dayCounts: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dayCounts[d.toISOString().slice(0, 10)] = 0
  }
  for (const doc of documents) {
    const key = doc.createdAt.toISOString().slice(0, 10)
    if (key >= thirtyDaysAgo.toISOString().slice(0, 10)) {
      dayCounts[key] = (dayCounts[key] || 0) + 1
    }
  }

  return {
    totalDocuments,
    completedTranslations,
    pendingTranslations,
    errorTranslations,
    totalWords: totalWords._sum.wordCount || 0,
    byLanguage: byLanguage.map((l) => ({
      language: l.targetLanguage,
      count: l._count,
    })),
    last30Days: Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  }
}
