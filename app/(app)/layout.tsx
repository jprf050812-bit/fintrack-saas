import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { Chatbot } from "@/components/chatbot"
import { ScopeToggle } from "@/components/scope-toggle"
import { getPartner, getScope } from "@/lib/scope"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const partner = await getPartner(session.user.id)
  const { shared } = await getScope(session.user.id)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        {partner && (
          <ScopeToggle
            scope={shared ? "couple" : "me"}
            partnerName={partner.name || partner.email}
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
      <Chatbot />
    </div>
  )
}
