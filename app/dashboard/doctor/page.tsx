"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DoctorCard } from "@/components/DoctorCard"
import { DoctorCardSkeleton } from "@/components/Skeleton"
import { PageTransition } from "@/components/PageTransition"
import type { Doctor } from "@/lib/mockData"

// ── Data ──────────────────────────────────────────────────────────────────────

const CONDITIONS: Record<string, { stages: string[]; icon: string }> = {
  "Breast Cancer":           { stages: ["Stage I", "Stage II", "Stage III", "Stage IV"], icon: "🎗️" },
  "Type 2 Diabetes":         { stages: ["Pre-diabetic", "Newly Diagnosed", "Moderate", "Advanced"], icon: "🩸" },
  "Coronary Artery Disease": { stages: ["Mild", "Moderate", "Severe"], icon: "❤️" },
  "Multiple Sclerosis":      { stages: ["Relapsing-Remitting", "Secondary Progressive", "Primary Progressive", "Clinically Isolated Syndrome"], icon: "🧠" },
  "Crohn's Disease":         { stages: ["Mild", "Moderate-Severe", "Remission", "Flare"], icon: "🫀" },
  "Rheumatoid Arthritis":    { stages: ["Early", "Moderate", "Severe", "Remission"], icon: "🦴" },
  "Lung Cancer":             { stages: ["Stage I", "Stage II", "Stage III", "Stage IV"], icon: "🫁" },
  "Parkinson's Disease":     { stages: ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"], icon: "🧬" },
  "Lupus":                   { stages: ["Mild", "Moderate", "Severe", "Remission"], icon: "🦋" },
  "Depression":              { stages: ["Mild", "Moderate", "Severe", "Treatment-Resistant"], icon: "🌧️" },
}

const ESI_OPTIONS = [
  { value: "calm",        label: "Calm",        desc: "Detailed & analytical",  color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "focused",     label: "Focused",     desc: "Clear & efficient",      color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "anxious",     label: "Anxious",     desc: "Warm & reassuring",      color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "overwhelmed", label: "Overwhelmed", desc: "Gentle & simplified",    color: "border-purple-400 bg-purple-50 text-purple-700" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DoctorPage() {
  const [step, setStep]           = useState<"select" | "results">("select")
  const [condition, setCondition] = useState("")
  const [stage, setStage]         = useState("")
  const [esi, setEsi]             = useState("calm")
  const [doctors, setDoctors]     = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [ragSummary, setRagSummary] = useState<any>(null)

  const stages = condition ? CONDITIONS[condition]?.stages ?? [] : []
  const canSearch = condition && stage

  async function handleSearch() {
    if (!canSearch) return
    setIsLoading(true)
    setError(null)
    setStep("results")

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition, stage, esiCategory: esi, topK: 10 }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()

      const mapped: Doctor[] = (data.doctor_recommendations ?? []).map((d: any) => ({
        id:              d.doctor_id,
        name:            d.doctor_name,
        specialty:       d.doctor_specialty,
        hospital:        d.doctor_hospital,
        location:        "",
        matchScore:      Math.round(d.composite_score * 100),
        acceptingNew:    true,
        experienceYears: 0,
        languages:       [],
        aiSummary:       "",
        patientCount:    d.supporting_experiences,
        recoveryData:    [],
      }))

      setDoctors(mapped)
      setRagSummary(data.rag_summary ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setStep("select")
    setCondition("")
    setStage("")
    setEsi("calm")
    setDoctors([])
    setRagSummary(null)
    setError(null)
  }

  return (
    <PageTransition>
      <AnimatePresence mode="wait">

        {/* ── Step 1: Selector ── */}
        {step === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Doctor Recommender</h2>
            <p className="text-gray-500 mb-8 max-w-xl">
              Tell us about your condition and we'll match you with the best doctors based on real patient outcomes.
            </p>

            {/* 1. Condition */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Step 1 · Select your condition
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(CONDITIONS).map(([name, { icon }]) => (
                  <button
                    key={name}
                    onClick={() => { setCondition(name); setStage("") }}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-sm font-medium
                      transition-all duration-150 text-center leading-tight
                      ${condition === name
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Stage */}
            <AnimatePresence>
              {condition && (
                <motion.div
                  key="stages"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-8 overflow-hidden"
                >
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Step 2 · Select your stage
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {stages.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStage(s)}
                        className={`
                          px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150
                          ${stage === s
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }
                        `}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. ESI */}
            <AnimatePresence>
              {stage && (
                <motion.div
                  key="esi"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-10 overflow-hidden"
                >
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Step 3 · How are you feeling today?
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ESI_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEsi(opt.value)}
                        className={`
                          p-4 rounded-2xl border-2 text-left transition-all duration-150
                          ${esi === opt.value
                            ? `${opt.color} shadow-sm scale-[1.02]`
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }
                        `}
                      >
                        <div className="font-semibold text-sm mb-0.5">{opt.label}</div>
                        <div className="text-xs opacity-70">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search button */}
            <AnimatePresence>
              {canSearch && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold
                               px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-200 transition-all duration-150
                               flex items-center gap-2 text-base"
                  >
                    Find Matching Doctors
                    <span>→</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Step 2: Results ── */}
        {step === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:underline mb-3 flex items-center gap-1"
            >
              ← Change selection
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Doctor Recommender</h2>
            <p className="text-gray-500 mb-6">
              Showing results for{" "}
              <span className="font-semibold text-gray-700">{condition}</span>
              {" · "}
              <span className="font-semibold text-gray-700">{stage}</span>
            </p>

            {error && (
              <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                Failed to load recommendations: {error}
              </div>
            )}

            {/* RAG narrative */}
            {!isLoading && ragSummary?.narrative && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>🤖</span>
                  <span className="font-semibold text-blue-900 text-sm">AI Summary</span>
                  {ragSummary.confidence_level != null && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {ragSummary.confidence_level}% confidence
                    </span>
                  )}
                </div>
                <p className="text-blue-800 text-sm leading-relaxed">{ragSummary.narrative}</p>
              </motion.div>
            )}

            {/* Doctor grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <DoctorCardSkeleton key={i} />)
                : doctors.length === 0
                ? (
                  <div className="col-span-2 text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="font-medium text-gray-500">No doctors found for your profile.</p>
                    <p className="text-sm mt-1">Try adjusting your condition or stage.</p>
                    <button onClick={handleReset} className="mt-4 text-blue-600 hover:underline text-sm">
                      ← Go back and adjust
                    </button>
                  </div>
                )
                : doctors.map((doctor, i) => (
                  <DoctorCard key={doctor.id} doctor={doctor} index={i} />
                ))
              }
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </PageTransition>
  )
}