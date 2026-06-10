type TranslationProvider = "deepseek" | "openrouter" | "gemini" | "openai" | "mock"

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

  constructor(provider: TranslationProvider = "mock") {
    this.provider = provider
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
      return this.translateWithMock(request)
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
      return this.translateWithMock(request)
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
      return this.translateWithMock(request)
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Traduce el siguiente texto legal de ${LANGUAGE_MAP[request.sourceLanguage] || request.sourceLanguage} a ${LANGUAGE_MAP[request.targetLanguage] || request.targetLanguage}. Mantén el formato legal:\n\n${request.text}`,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    return {
      translatedText: data.candidates[0].content.parts[0].text,
      provider: "gemini",
    }
  }

  private async translateWithOpenAI(
    request: TranslationRequest
  ): Promise<TranslationResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return this.translateWithMock(request)
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

    const data = await response.json()
    return {
      translatedText: data.choices[0].message.content,
      provider: "openai",
    }
  }
}

export const translationService = new TranslationService()
