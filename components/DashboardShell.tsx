"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

const TABS = [
  { name: "Doctor Recommender", href: "/dashboard/doctor" },
  { name: "Care Circle",        href: "/dashboard/circle"  },
  { name: "Resources",          href: "/dashboard/resources"},
]

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-5 flex justify-between items-center">
          <Link href="/dashboard/circle">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight cursor-pointer hover:text-blue-600 transition-colors">
              LINK-CARE
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
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-200"
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
      <main className="max-w-5xl mx-auto p-10 w-full flex-1">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          {children}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between text-sm">
          <p className="text-red-600 font-medium">
            ⚕ LINK-CARE is not medical advice. For emergencies, call 911.
          </p>
          <Link
            href="/dashboard/resources/guidelines"
            className="text-blue-600 hover:underline text-sm"
          >
            Guidelines & Responsible Use →
          </Link>
        </div>
      </footer>
    </div>
  )
}
