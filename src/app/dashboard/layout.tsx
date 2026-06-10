import { Sidebar } from "@/features/dashboard/sidebar"
import { Topbar } from "@/features/dashboard/topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  )
}
