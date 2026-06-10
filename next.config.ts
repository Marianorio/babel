import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "pdfjs-dist", "mammoth", "tesseract.js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
}

export default withNextIntl(nextConfig)
