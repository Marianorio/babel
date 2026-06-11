export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface TextItem {
  str: string
  x: number
  width: number
  height: number
}

export interface ParagraphLine {
  y: number
  texts: TextItem[]
}

export interface Paragraph {
  id: string
  pageNum: number
  y: number
  x: number
  height: number
  text: string
  lines: ParagraphLine[]
}

export interface Document {
  id: string
  userId: string
  originalName: string
  storedName: string
  sourceLanguage: string
  targetLanguage: string
  originalText: string
  translatedText: string | null
  status: string
  fileSize: number
  wordCount: number
  charCount: number
  pageRange: string | null
  pageCount: number | null
  pageLines: string | null
  pageLineTranslations: string | null
  paragraphs: string | null
  paragraphTranslations: string | null
  createdAt: Date
  updatedAt: Date
}

export type Language = "es" | "en" | "pt" | "fr"

export const LANGUAGES: Record<Language, string> = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
}

export type DocumentStatus = "pending" | "processing" | "completed" | "error"
