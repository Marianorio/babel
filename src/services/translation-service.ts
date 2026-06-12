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
  preserveMarkers?: boolean
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

  private buildPrompt(request: TranslationRequest): string {
    const srcLang = LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage
    const tgtLang = LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage

    if (request.preserveMarkers) {
      return (
        "Traduce el siguiente documento de " + srcLang + " a " + tgtLang + ".\n\n" +
        "INSTRUCCIONES:\n" +
        "- NO elimines las etiquetas <paragraph id=\"...\"> y </paragraph>\n" +
        "- NO cambies los IDs de los párrafos\n" +
        "- NO agregues etiquetas nuevas\n" +
        "- Solo traduce el contenido interno de cada párrafo\n" +
        "- Mantén los saltos de línea dentro de cada párrafo\n" +
        "- Devuelve exactamente la misma estructura XML\n\n" +
        "DOCUMENTO:\n" + request.text
      )
    }

    return (
      "Traduce el siguiente texto de " + srcLang + " a " + tgtLang + ". Devuelve solo la traducción, sin explicaciones ni prefijos:\n\n" +
      request.text
    )
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    if (this.provider === "mock") {
      return this.translateWithMock(request)
    }

    const providerMap: Record<string, (r: TranslationRequest) => Promise<TranslationResult>> = {
      deepseek: this.translateWithDeepSeek.bind(this),
      openrouter: this.translateWithOpenRouter.bind(this),
      gemini: this.translateWithGemini.bind(this),
      openai: this.translateWithOpenAI.bind(this),
      libretranslate: this.translateWithLibreTranslate.bind(this),
      argos: this.translateWithArgos.bind(this),
      mock: this.translateWithMock.bind(this),
    }

    const handler = providerMap[this.provider]
    if (!handler) {
      throw new TranslationError("Proveedor no válido.")
    }

    try {
      return await handler(request)
    } catch (err) {
      if (err instanceof TranslationError) {
        if (
          err.message.includes("429") ||
          err.message.includes("rate_limit") ||
          err.message.includes("Too Many Requests")
        ) {
          throw new TranslationError("Límite de intentos alcanzado.")
        }
        throw err
      }
      throw new TranslationError("Ha ocurrido un error con este proveedor.")
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

    const prompt = this.buildPrompt(request)

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
            role: "user",
            content: prompt,
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

    const prompt = this.buildPrompt(request)

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      const errLower = errText.toLowerCase()

      if (
        errLower.includes("insufficient_quota") ||
        errLower.includes("billing") ||
        errLower.includes("payment") ||
        errLower.includes("credits") ||
        errLower.includes("free tier")
      ) {
        throw new TranslationError("Opción de pago requerida. OpenRouter requiere créditos o el modelo gratuito no está disponible.")
      }

      if (response.status === 429) {
        throw new TranslationError("Límite de intentos alcanzado en OpenRouter.")
      }

      if (response.status === 401 || response.status === 403) {
        throw new TranslationError("Error de autenticación en OpenRouter. Verifica que la API key sea válida.")
      }

      throw new TranslationError("Error en OpenRouter (" + response.status + "): " + errText)
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

    const prompt = this.buildPrompt({ ...request, text })

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      const errLower = errText.toLowerCase()

      if (
        errLower.includes("billing") ||
        errLower.includes("payment") ||
        errLower.includes("quota") ||
        errLower.includes("financial") ||
        errLower.includes("free tier")
      ) {
        throw new TranslationError("Opción de pago requerida. Gemini requiere un método de pago válido o has agotado la cuota gratuita.")
      }

      if (response.status === 429) {
        throw new TranslationError("Límite de intentos alcanzado para Gemini. Espera un momento o cambia de proveedor.")
      }

      if (response.status === 403) {
        throw new TranslationError("Error de autenticación en Gemini. Verifica que la API key sea válida.")
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

    const prompt = this.buildPrompt(request)

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      const errLower = errText.toLowerCase()

      if (
        errLower.includes("insufficient_quota") ||
        errLower.includes("billing") ||
        errLower.includes("payment")
      ) {
        throw new TranslationError("Opción de pago requerida. OpenAI requiere un método de pago válido.")
      }

      if (response.status === 429) {
        throw new TranslationError("Límite de intentos alcanzado en OpenAI.")
      }

      if (response.status === 401 || response.status === 403) {
        throw new TranslationError("Error de autenticación en OpenAI. Verifica que la API key sea válida y tenga crédito disponible.")
      }
      throw new TranslationError("Error en OpenAI (" + response.status + "): " + errText)
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
