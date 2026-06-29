import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { TranslationService, TranslationError } from "@/services/translation-service"
import type { TranslationProvider } from "@/services/translation-service"
import type { Paragraph, TextItem } from "@/types"

const NORMALIZE_WS = (s: string) => s.replace(/\s+/g, " ").trim()

export const maxDuration = 60

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    console.log("API translate: document found, userId:", document.userId)

    await prisma.document.update({ where: { id }, data: { status: "processing" } })

    const user = await prisma.user.findUnique({
      where: { id: document.userId },
      select: { translationProvider: true },
    })
    const provider = user?.translationProvider as TranslationProvider | undefined
    console.log("API translate: provider from user settings:", provider)

    const service = new TranslationService(provider)

    let translatedText = ""
    let pageLineTranslations: any = null
    let paragraphTranslationsMap: Record<string, string> | null = null

    const allParagraphs: Paragraph[] = document.paragraphs ? JSON.parse(document.paragraphs) : []
    const allPageLines: { pageNum: number; lines: { y: number; chars: number; texts: TextItem[] }[] }[] =
      document.pageLines ? JSON.parse(document.pageLines) : []

    console.log("API translate: paragraphs:", allParagraphs.length, "pageLines:", allPageLines.length)

    if (allParagraphs && allParagraphs.length > 0) {
      const markedText = allParagraphs
        .map(p => `<paragraph id="${p.id}">\n${p.text}\n</paragraph>`)
        .join("\n\n")

      console.log("API translate: calling service.translate with paragraphs")
      const result = await service.translate({
        text: markedText,
        sourceLanguage: document.sourceLanguage,
        targetLanguage: document.targetLanguage,
        preserveMarkers: true,
      })
      console.log("API translate: translation result received, provider:", result.provider)

      translatedText = result.translatedText

      const paraRegex = /<\s*paragraph\s+id="([^"]+)"\s*>([\s\S]*?)<\s*\/\s*paragraph\s*>/gi
      paragraphTranslationsMap = {}
      let match
      while ((match = paraRegex.exec(translatedText)) !== null) {
        paragraphTranslationsMap[match[1]] = NORMALIZE_WS(match[2])
      }

      const matchedCount = Object.keys(paragraphTranslationsMap).length
      const markersFailed = matchedCount < allParagraphs.length * 0.5
      console.log("API translate: markers matched:", matchedCount, "of", allParagraphs.length, "failed:", markersFailed)

      if (markersFailed) {
        console.log("API translate: markers failed, retrying without markers")
        const result2 = await service.translate({
          text: document.originalText,
          sourceLanguage: document.sourceLanguage,
          targetLanguage: document.targetLanguage,
        })
        translatedText = result2.translatedText
        paragraphTranslationsMap = null
      }

      if (allPageLines && allPageLines.length > 0) {
        if (paragraphTranslationsMap) {
          const pMap = paragraphTranslationsMap
          pageLineTranslations = allPageLines.map((pg) => {
            const pageParas = allParagraphs.filter(p => p.pageNum === pg.pageNum)
            const translations: string[] = []
            for (const line of pg.lines) {
              const lineText = NORMALIZE_WS(line.texts.map(t => t.str).join(" "))
              const owner = pageParas.find(p =>
                p.lines.some(l => NORMALIZE_WS(l.texts.map(t => t.str).join(" ")) === lineText)
              )
              translations.push(owner ? (pMap[owner.id] || "") : "")
            }
            return { pageNum: pg.pageNum, translations }
          })
        } else if (translatedText) {
          type PageLineData = (typeof allPageLines)[number]
          type LineData = PageLineData["lines"][number]
          const lineWords = (l: LineData) => l.texts.map((t: any) => t.str).join(" ").split(/\s+/).filter(Boolean).length
          const pageOrigWords: number[] = allPageLines.map((p: PageLineData) => p.lines.reduce((s: number, l: LineData) => s + lineWords(l), 0))
          const totalOrigWords: number = pageOrigWords.reduce((s: number, c: number) => s + c, 0) || 1
          pageLineTranslations = allPageLines.map((pageData: PageLineData, pageIdx: number) => {
            const pageRatio = pageOrigWords[pageIdx] / totalOrigWords
            const prevWords = pageOrigWords.slice(0, pageIdx).reduce((s: number, c: number) => s + c, 0)
            const transWords = translatedText.split(/\s+/).filter(Boolean)
            const pageStart = Math.round(prevWords / totalOrigWords * transWords.length)
            const pageLen = Math.round(pageRatio * transWords.length)
            let wordStart = 0
            const translations: string[] = []
            for (const line of pageData.lines) {
              const wc = lineWords(line)
              const ratio = wc / (pageData.lines.reduce((s: number, l: LineData) => s + lineWords(l), 0) || 1)
              const nWords = Math.max(Math.round(ratio * pageLen), 1)
              const slice = transWords.slice(pageStart + wordStart, Math.min(pageStart + wordStart + nWords, transWords.length))
              translations.push(slice.join(" "))
              wordStart += nWords
            }
            return { pageNum: pageData.pageNum, translations }
          })
        }
      }
    } else {
      console.log("API translate: no paragraphs, translating full text")
      const result = await service.translate({
        text: document.originalText,
        sourceLanguage: document.sourceLanguage,
        targetLanguage: document.targetLanguage,
      })
      translatedText = result.translatedText
      console.log("API translate: full text translation received")

      if (allPageLines && allPageLines.length > 0 && translatedText) {
        type PageLineData = (typeof allPageLines)[number]
        type LineData = PageLineData["lines"][number]
        const lineWords = (l: LineData) => l.texts.map((t: any) => t.str).join(" ").split(/\s+/).filter(Boolean).length
        const pageOrigWords: number[] = allPageLines.map((p: PageLineData) => p.lines.reduce((s: number, l: LineData) => s + lineWords(l), 0))
        const totalOrigWords: number = pageOrigWords.reduce((s: number, c: number) => s + c, 0) || 1
        pageLineTranslations = allPageLines.map((pageData: PageLineData, pageIdx: number) => {
          const pageRatio = pageOrigWords[pageIdx] / totalOrigWords
          const prevWords = pageOrigWords.slice(0, pageIdx).reduce((s: number, c: number) => s + c, 0)
          const transWords = translatedText.split(/\s+/).filter(Boolean)
          const pageStart = Math.round(prevWords / totalOrigWords * transWords.length)
          const pageLen = Math.round(pageRatio * transWords.length)
          let wordStart = 0
          const translations: string[] = []
          for (const line of pageData.lines) {
            const wc = lineWords(line)
            const ratio = wc / (pageData.lines.reduce((s: number, l: LineData) => s + lineWords(l), 0) || 1)
            const nWords = Math.max(Math.round(ratio * pageLen), 1)
            const slice = transWords.slice(pageStart + wordStart, Math.min(pageStart + wordStart + nWords, transWords.length))
            translations.push(slice.join(" "))
            wordStart += nWords
          }
          return { pageNum: pageData.pageNum, translations }
        })
      }
    }

    console.log("API translate: saving to DB")
    await prisma.document.update({
      where: { id },
      data: {
        translatedText,
        pageLineTranslations: pageLineTranslations ? JSON.stringify(pageLineTranslations) : undefined,
        paragraphTranslations: paragraphTranslationsMap ? JSON.stringify(paragraphTranslationsMap) : undefined,
        status: "completed",
      },
    })
    console.log("API translate: completed successfully")

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("API translate ERROR:", err instanceof Error ? err.message : err)
    if (err instanceof Error) console.error("Stack:", err.stack)

    await prisma.document.update({
      where: { id },
      data: { status: "error" },
    }).catch(() => {})

    const message = err instanceof TranslationError ? err.message : "Error al procesar la traducción"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
