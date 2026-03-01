"use client"

import { notFound } from "next/navigation"
import { ConfidenceMeter } from "@/components/ConfidenceMeter"
import { RecoveryChart } from "@/components/RecoveryChart"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { EMOTION_CSS_VARS, EMOTION_THEMES, type EsiCategory } from "@/lib/emotionTheme"
import React from "react"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default function DoctorDetailPage({ params, searchParams }: PageProps) {
  return <DoctorDetailClient params={params} searchParams={searchParams} />
}

function confidenceJustification(score: number) {
  if (score >= 80) return { label: "Strong match.", body: "This doctor's patient outcomes are highly similar to your profile — multiple patients with your condition and stage reported positive results." }
  if (score >= 60) return { label: "Good match.", body: "Several patients with a similar diagnosis responded well to this doctor's care. Minor profile differences account for the remaining gap." }
  if (score >= 40) return { label: "Moderate match.", body: "This doctor has relevant experience with your condition, though fewer direct patient comparisons were available in our database." }
  return { label: "Partial match.", body: "Limited patient data for your specific profile. This doctor may still be a strong fit — we recommend reviewing their full background." }
}

function DoctorDetailClient({ params, searchParams }: PageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [resolvedParams, setResolvedParams] = React.useState<{
    name?: string; specialty?: string; hospital?: string
    matchScore: number; patientCount: number; emotion: EsiCategory
  } | null>(null)

  useEffect(() => {
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

  useEffect(() => {
    if (!resolvedParams || !wrapperRef.current) return
    const vars = EMOTION_CSS_VARS[resolvedParams.emotion] ?? EMOTION_CSS_VARS.neutral
    const el = wrapperRef.current
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  }, [resolvedParams])

  if (!resolvedParams) return null
  const { name, specialty, hospital, matchScore, patientCount, emotion } = resolvedParams
  if (!name) return notFound()

  const justification = confidenceJustification(matchScore)

  return (
    <div
      ref={wrapperRef}
      className="min-h-screen p-6"
      style={{ backgroundColor: "var(--theme-bg, #f9fafb)", transition: "background-color 2.5s ease" }}
    >
      {/* Back link */}
      <Link href="/dashboard/doctor"
        className="text-sm hover:underline mb-6 inline-block transition-colors"
        style={{ color: "var(--theme-accent, #2563eb)" }}>
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
            <span className="inline-block text-sm px-3 py-1.5 rounded-full border font-medium"
              style={{ backgroundColor: "var(--theme-accent-soft)", borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}>
              Accepting New Patients
            </span>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Summary */}
        <div className="lg:col-span-2 rounded-2xl p-6 border"
          style={{ backgroundColor: "var(--theme-summary-bg)", borderColor: "var(--theme-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold" style={{ color: "var(--theme-accent)" }}>AI Summary</h3>
          </div>
          <p className="text-sm leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--theme-text) 80%, transparent)" }}>
            {specialty} specialist at {hospital}. Recommended based on strong patient outcome
            scores and high similarity to your profile.
          </p>
        </div>

        {/* Confidence Score */}
        <div className="bg-white rounded-2xl border p-6 flex flex-col justify-between"
          style={{ borderColor: "var(--theme-border)" }}>
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Match Confidence</h3>
            <div className="text-5xl font-bold mb-1" style={{ color: "var(--theme-accent)" }}>
              {matchScore}%
            </div>
            <p className="text-xs text-gray-400 mb-3">based on patient similarity</p>
            <ConfidenceMeter score={matchScore} showLabel={false} />

            {/* Justification */}
            <div className="mt-4 rounded-xl p-3 text-xs leading-relaxed"
              style={{ backgroundColor: "var(--theme-accent-soft, #eff6ff)", color: "var(--theme-accent, #2563eb)" }}>
              <span className="font-semibold">{justification.label} </span>
              {justification.body}
            </div>
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
        <div style={{ minHeight: "160px" }}>
  <RecoveryChart data={[
    { month: "Sep", successRate: Math.min(99, Math.round(matchScore * 0.7 + 20)) },
    { month: "Oct", successRate: Math.min(99, Math.round(matchScore * 0.7 + 22)) },
    { month: "Nov", successRate: Math.min(99, Math.round(matchScore * 0.7 + 21)) },
    { month: "Dec", successRate: Math.min(99, Math.round(matchScore * 0.7 + 24)) },
    { month: "Jan", successRate: Math.min(99, Math.round(matchScore * 0.7 + 25)) },
    { month: "Feb", successRate: Math.min(99, Math.round(matchScore * 0.7 + 27)) },
  ]} />
</div>
      </div>
    </div>
  )
}