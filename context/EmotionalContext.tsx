"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { EmotionalState } from "@/lib/mockData"

interface EmotionalContextValue {
  state: EmotionalState
  setState: (s: EmotionalState) => void
}

const EmotionalContext = createContext<EmotionalContextValue | null>(null)

export function EmotionalStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmotionalState>("calm")

  return (
    <EmotionalContext.Provider value={{ state, setState }}>
      {children}
    </EmotionalContext.Provider>
  )
}

export function useEmotionalState() {
  const ctx = useContext(EmotionalContext)
  if (!ctx) throw new Error("useEmotionalState must be used within EmotionalStateProvider")
  return ctx
}
