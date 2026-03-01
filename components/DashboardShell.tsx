"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

const TABS = [
  { name: "Chat",               href: "/dashboard/chat"     },
  { name: "Doctor Recommender", href: "/dashboard/doctor"   },
  { name: "Care Circle",        href: "/dashboard/circle"   },
  { name: "Resources",          href: "/dashboard/resources"},
]

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8e6e6] via-[#e2e0e0] to-[#d8d5d5] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#b0aeae]/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-5 flex justify-between items-center">
          <Link href="/dashboard/circle">
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer transition-opacity hover:opacity-80">
              <span className="text-[#3a3030]">Link</span><span className="text-[#2233cc]">Care</span>
            </h1>
          </Link>

          {/* Nav tabs */}
          <nav className="flex gap-2">
            {TABS.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? "bg-[#2233cc] text-white shadow-sm"
                      : "text-[#625e5e] hover:text-[#3a3030] hover:bg-[#d5d3d3]"
                    }`}
                >
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-10 py-10 w-full flex-1">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-[#b0aeae]/40 p-10">
          {children}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between text-sm">
          <p className="text-red-600 font-medium">
            ⚕ LinkCare is not medical advice. For emergencies, call 911.
          </p>
          <Link
            href="/dashboard/resources/guidelines"
            className="text-[#5c3d9e] hover:underline text-sm"
          >
            Guidelines & Responsible Use →
          </Link>
        </div>
      </footer>
    </div>
  )
}
