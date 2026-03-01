"use client"

import { notFound } from "next/navigation"
import { ConfidenceMeter } from "@/components/ConfidenceMeter"
import { RecoveryChart } from "@/components/RecoveryChart"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { EMOTION_CSS_VARS, EMOTION_THEMES, type EsiCategory } from "@/lib/emotionTheme"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

// Since this is a server component by default in Next.js App Router,
// we make it a client component to apply CSS var transitions.

export default function DoctorDetailPage({ params, searchParams }: PageProps) {
  return <DoctorDetailClient params={params} searchParams={searchParams} />
}

function DoctorDetailClient({ params, searchParams }: PageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // We read params synchronously in a client component via use()
  // But since Next.js 15 made params a Promise, we need to handle it
  // For simplicity, read from URL directly
  const [resolvedParams, setResolvedParams] = React.useState<{
    name?: string; specialty?: string; hospital?: string
    matchScore: number; patientCount: number; emotion: EsiCategory
  } | null>(null)

  useEffect(() => {
    // Parse URL search params on the client
    const sp = new URLSearchParams(window.location.search)
    const emotion = (sp.get("emotion") ?? "neutral") as EsiCategory
    setResolvedParams({
      name:         sp.get("name") ?? undefined,
      specialty:    sp.get("specialty") ?? undefined,
      hospital:     sp.get("hospital") ?? undefined,
      matchScore:   Number(sp.get("matchScore") ?? 0),
      patientCount: Number(sp.get("patientCount") ?? 0),
      emotion,
    })
  }, [])

  // Apply CSS vars when emotion is known
  useEffect(() => {
    if (!resolvedParams || !wrapperRef.current) return
    const vars = EMOTION_CSS_VARS[resolvedParams.emotion] ?? EMOTION_CSS_VARS.neutral
    const el = wrapperRef.current
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  }, [resolvedParams])

  if (!resolvedParams) return null
  const { name, specialty, hospital, matchScore, patientCount, emotion } = resolvedParams
  if (!name) return notFound()

  return (
    <div
      ref={wrapperRef}
      className="min-h-screen p-6"
      style={{
        backgroundColor: "var(--theme-bg, #f9fafb)",
        transition: "background-color 2.5s ease",
      }}
    >
      {/* Back link */}
      <Link
        href="/dashboard/doctor"
        className="text-sm hover:underline mb-6 inline-block transition-colors"
        style={{ color: "var(--theme-accent, #2563eb)" }}
      >
        ← Back to Recommendations
      </Link>

      {/* Doctor header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-1" style={{ color: "var(--theme-text, #111827)" }}>
              {name}
            </h2>
            <p className="text-lg" style={{ color: "color-mix(in srgb, var(--theme-text) 60%, transparent)" }}>
              {specialty} · {hospital}
            </p>
          </div>
          <div className="text-right">
            <span
              className="inline-block text-sm px-3 py-1.5 rounded-full border font-medium"
              style={{
                backgroundColor: "var(--theme-accent-soft)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-accent)",
              }}
            >
              Accepting New Patients
            </span>
          </div>
        </div>
      </div>

      {/* 3-column grid: AI Summary + Confidence Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Summary - 2 cols */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 border"
          style={{
            backgroundColor: "var(--theme-summary-bg)",
            borderColor: "var(--theme-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold" style={{ color: "var(--theme-accent)" }}>
              AI Summary
            </h3>
          </div>
          <p className="text-sm leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--theme-text) 80%, transparent)" }}>
            {specialty} specialist at {hospital}. Recommended based on strong patient outcome
            scores and high similarity to your profile.
          </p>
        </div>

        {/* Confidence Score - 1 col */}
        <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between"
          style={{ borderColor: "var(--theme-border)" }}>
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Match Confidence</h3>
            <div className="text-5xl font-bold mb-1" style={{ color: "var(--theme-accent)" }}>
              {matchScore}%
            </div>
            <p className="text-xs text-gray-400 mb-4">based on patient similarity</p>
            <ConfidenceMeter score={matchScore} showLabel={false} />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Matched against {patientCount.toLocaleString()} similar patient outcomes
          </p>
        </div>
      </div>

      {/* Recovery Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-2">
          Patient Recovery Rates — Last 6 Months
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          Percentage of patients with similar profiles achieving positive outcomes
        </p>
        <RecoveryChart data={[]} />
      </div>
    </div>
  )
}

// Need React import for useState in client component
import React from "react"
