import { rateLimit } from "@/lib/rate-limit"

export class TranslationError extends Error {
  constructor(message?: string) {
    super(message || "Límite de intentos alcanzado. Cambia de proveedor o intenta más tarde.")
    this.name = "TranslationError"
  }
}

export type TranslationProvider = "deepseek" | "openrouter" | "gemini" | "openai" | "libretranslate" | "argos" | "mock"

interface TranslationResult {
  translatedText: string
  provider: TranslationProvider
}

interface TranslationRequest {
  text: string
  sourceLanguage: string
  targetLanguage: string
}

const LANGUAGE_MAP: Record<string, string> = {
  es: "español",
  en: "inglés",
  pt: "portugués",
  fr: "francés",
}

const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    en: "This is a simulated translation from Spanish to English. In a production environment, this text would be processed by an AI translation provider.",
    pt: "Esta é uma simulação de tradução do espanhol para o português. Em um ambiente de produção, este texto seria processado por um provedor de tradução de IA.",
    fr: "Ceci est une simulation de traduction de l'espagnol vers le français. Dans un environnement de production, ce texte serait traité par un fournisseur de traduction IA.",
  },
  en: {
    es: "Esta es una traducción simulada del inglés al español. En un entorno de producción, este texto sería procesado por un proveedor de traducción de IA.",
    pt: "Esta é uma tradução simulada do inglês para o português. Em um ambiente de produção, este texto seria processado por um provedor de tradução de IA.",
    fr: "Ceci est une traduction simulée de l'anglais vers le français. Dans un environnement de production, ce texte serait traité par un fournisseur de traduction IA.",
  },
  pt: {
    es: "Esta es una traducción simulada del portugués al español.",
    en: "This is a simulated translation from Portuguese to English.",
    fr: "Ceci est une traduction simulée du portugais vers le français.",
  },
  fr: {
    es: "Esta es una traducción simulada del francés al español.",
    en: "This is a simulated translation from French to English.",
    pt: "Esta é uma tradução simulada do francês para o português.",
  },
}

export class TranslationService {
  private provider: TranslationProvider

  constructor(provider?: TranslationProvider) {
    this.provider = provider || (process.env.TRANSLATION_PROVIDER as TranslationProvider) || "mock"
  }

  setProvider(provider: TranslationProvider) {
    this.provider = provider
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    switch (this.provider) {
      case "deepseek":
        return this.translateWithDeepSeek(request)
      case "openrouter":
        return this.translateWithOpenRouter(request)
      case "gemini":
        return this.translateWithGemini(request)
      case "openai":
        return this.translateWithOpenAI(request)
      case "libretranslate":
        return this.translateWithLibreTranslate(request)
      case "argos":
        return this.translateWithArgos(request)
      case "mock":
      default:
        return this.translateWithMock(request)
    }
  }

  private async translateWithMock(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const source = request.sourceLanguage.toLowerCase()
    const target = request.targetLanguage.toLowerCase()

    let translatedText = MOCK_TRANSLATIONS[source]?.[target]

    if (!translatedText) {
      translatedText = `[Traducción simulada de ${LANGUAGE_MAP[source] || source} a ${LANGUAGE_MAP[target] || target}]\n\n${request.text}`
    }

    return { translatedText, provider: "mock" }
  }

  private async translateWithDeepSeek(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new TranslationError("DeepSeek no configurado. Añade DEEPSEEK_API_KEY en .env.")
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Eres un traductor legal profesional. Traduce el siguiente texto de ${LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage} a ${LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage}. Mantén el formato, la terminología legal precisa y el tono formal.`,
          },
          {
            role: "user",
            content: request.text,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new TranslationError("Error en DeepSeek: " + response.status)
    }

    const data = await response.json()
    return {
      translatedText: data.choices[0].message.content,
      provider: "deepseek",
    }
  }

  private async translateWithOpenRouter(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new TranslationError("OpenRouter no configurado. Añade OPENROUTER_API_KEY en .env.")
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: [
            {
              role: "system",
              content: `Eres un traductor legal profesional. Traduce el siguiente texto de ${LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage} a ${LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage}.`,
            },
            {
              role: "user",
              content: request.text,
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new TranslationError("Error en OpenRouter: " + response.status)
    }

    const data = await response.json()
    return {
      translatedText: data.choices[0].message.content,
      provider: "openrouter",
    }
  }

  private async translateWithGemini(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new TranslationError("Gemini no configurado. Añade GEMINI_API_KEY en .env.")
    }

    const rateCheck = rateLimit("gemini:direct", 50, 60000)
    if (!rateCheck.allowed) {
      throw new TranslationError("Límite de intentos alcanzado para Gemini. Espera un momento o cambia de proveedor.")
    }

    const text =
      request.text.length > 10000
        ? request.text.slice(0, 10000) + "..."
        : request.text

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Traduce el siguiente texto de " + (LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage) + " a " + (LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage) + ". Devuelve solo la traducción, sin explicaciones ni prefijos:\n\n" + text,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      if (response.status === 429) {
        throw new TranslationError("Límite de intentos alcanzado para Gemini. Espera un momento o cambia de proveedor.")
      }
      throw new TranslationError("Error en Gemini (" + response.status + "): " + errText)
    }

    const data = await response.json()
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!translatedText) {
      throw new TranslationError("Gemini no devolvió una traducción válida.")
    }

    return { translatedText, provider: "gemini" }
  }

  private async translateWithOpenAI(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new TranslationError("OpenAI no configurado. Añade OPENAI_API_KEY en .env.")
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `Eres un traductor legal profesional. Traduce de ${LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage} a ${LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage}.`,
            },
            { role: "user", content: request.text },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new TranslationError("Error en OpenAI: " + response.status)
    }

    const data = await response.json()
    return {
      translatedText: data.choices[0].message.content,
      provider: "openai",
    }
  }

  private async translateWithLibreTranslate(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const baseUrl = process.env.LIBRETRANSLATE_URL
    const ltApiKey = process.env.LIBRETRANSLATE_API_KEY

    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ltApiKey && { Authorization: `Bearer ${ltApiKey}` }),
          },
          body: JSON.stringify({
            q: request.text,
            source: request.sourceLanguage,
            target: request.targetLanguage,
            format: "text",
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return { translatedText: data.translatedText, provider: "libretranslate" }
        }
      } catch {
        console.warn("LibreTranslate instance unavailable")
      }
    }

    // Fallback: Gemini 2.5 Flash Lite
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      throw new TranslationError("No hay ningún proveedor configurado. Configura GEMINI_API_KEY o LIBRETRANSLATE_URL en .env, o selecciona otro proveedor.")
    }

    const rateCheck = rateLimit("gemini:libretranslate", 50, 60000)
    if (!rateCheck.allowed) {
      throw new TranslationError("Límite de intentos alcanzado. Espera un momento o cambia de proveedor.")
    }

    const text =
      request.text.length > 10000
        ? request.text.slice(0, 10000) + "..."
        : request.text

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=" + geminiApiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Traduce el siguiente texto de " + (LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage) + " a " + (LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage) + ". Devuelve solo la traducción, sin explicaciones ni prefijos:\n\n" + text,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      if (response.status === 429) {
        throw new TranslationError("Límite de intentos alcanzado. Espera un momento o cambia de proveedor.")
      }
      throw new TranslationError("Error en traducción (" + response.status + "): " + errText)
    }

    const data = await response.json()
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!translatedText) {
      throw new TranslationError("El proveedor no devolvió una traducción válida.")
    }

    return { translatedText, provider: "libretranslate" }
  }

  private async translateWithArgos(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const baseUrl = process.env.ARGOS_URL || "http://localhost:5000"

    const response = await fetch(`${baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: request.text,
        source: request.sourceLanguage,
        target: request.targetLanguage,
      }),
    })

    if (!response.ok) {
      throw new TranslationError("Error en Argos (" + response.status + "). Verifica que el servidor esté corriendo.")
    }

    const data = await response.json()
    return {
      translatedText: data.translatedText,
      provider: "argos",
    }
  }
}

export const translationService = new TranslationService()
