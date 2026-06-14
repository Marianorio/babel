import { Sidebar, MobileNav } from "@/features/dashboard/sidebar"
import { Topbar } from "@/features/dashboard/topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-64 transition-all duration-300">
        <Topbar />
        <main className="flex-1 p-4 pb-20 sm:p-6 sm:pb-6 md:pb-6 animate-fade-in">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
