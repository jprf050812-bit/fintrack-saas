"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { setValuesHidden } from "@/lib/utils"

const KEY = "fintrack:hide-values"

const PrivacyContext = createContext({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)

  // Keep formatCurrency in sync during render so children format correctly.
  setValuesHidden(hidden)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setHidden(true)
    } catch {}
  }, [])

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h
      try {
        localStorage.setItem(KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
}

export const usePrivacy = () => useContext(PrivacyContext)
