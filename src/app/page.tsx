import { Navbar } from "@/features/landing/navbar"
import { Hero } from "@/features/landing/hero"
import { Services } from "@/features/landing/services"
import { HowItWorks } from "@/features/landing/how-it-works"
import { Benefits } from "@/features/landing/benefits"
import { Footer } from "@/features/landing/footer"

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Services />
        <HowItWorks />
        <Benefits />
      </main>
      <Footer />
    </>
  )
}
