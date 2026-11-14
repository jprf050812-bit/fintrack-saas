"use client"

import { SessionProvider } from "next-auth/react"
import { PrivacyProvider } from "@/components/privacy-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PrivacyProvider>{children}</PrivacyProvider>
    </SessionProvider>
  )
}
