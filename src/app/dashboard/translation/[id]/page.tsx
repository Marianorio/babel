import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TranslationViewer } from "@/features/translation/translation-viewer"
import { notFound } from "next/navigation"

export default async function TranslationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const document = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!document) notFound()

  return <TranslationViewer document={document} />
}
