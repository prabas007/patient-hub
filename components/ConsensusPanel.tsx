"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonaResult {
  role:        string
  label:       string
  icon:        string
  top_doctor:  string
  confidence:  number
  verdict:     string
  key_insight: string
  concern:     string
}

interface ConsensusData {
  agreed_top_doctor: string | null
  agreement_score:   number
  consensus_note:    string
  show_divergence:   boolean
  vote_breakdown:    Record<string, number>
}

interface ConsensusPanelProps {
  condition:   string
  stage:       string
  experiences: any[]
  doctors:     any[]
  esiCategory: string
}

// ── Agreement ring ────────────────────────────────────────────────────────────

function AgreementRing({ score }: { score: number }) {
  const r = 28
  const circumference = 2 * Math.PI * r
  const filled = (score / 100) * circumference

  const color =
    score === 100 ? "#16a34a" :
    score >= 60   ? "#d97706" :
                    "#dc2626"

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {score}%
      </text>
    </svg>
  )
}

// ── Persona card ──────────────────────────────────────────────────────────────

function PersonaCard({ persona, index, isWinner }: {
  persona: PersonaResult
  index: number
  isWinner: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl border-2 p-5 transition-all duration-200 ${
        isWinner
          ? "border-amber-400 bg-amber-50"
          : "border-stone-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{persona.icon}</span>
          <div>
            <div className="font-semibold text-sm text-stone-800">{persona.label}</div>
            <div className="text-xs text-stone-400">recommends</div>
          </div>
        </div>
        {/* Confidence bar */}
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold text-stone-500 mb-1">{persona.confidence}% confident</div>
          <div className="w-24 h-1.5 rounded-full bg-stone-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${persona.confidence}%` }}
              transition={{ delay: index * 0.15 + 0.3, duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Top doctor pick */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-stone-100">
        <span className="text-sm font-bold text-stone-800 truncate">{persona.top_doctor}</span>
        {isWinner && (
          <span className="ml-auto text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
            top pick
          </span>
        )}
      </div>

      {/* Verdict */}
      <p className="text-xs text-stone-600 leading-relaxed mb-3">{persona.verdict}</p>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 transition-colors"
      >
        {expanded ? "Hide details ↑" : "Key insight + concern ↓"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {persona.key_insight && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-emerald-500 shrink-0 text-sm">💡</span>
                  <p className="text-xs text-emerald-800 leading-relaxed">{persona.key_insight}</p>
                </div>
              )}
              {persona.concern && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-400 shrink-0 text-sm">⚠</span>
                  <p className="text-xs text-red-700 leading-relaxed">{persona.concern}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsensusPanel({
  condition,
  stage,
  experiences,
  doctors,
  esiCategory,
}: ConsensusPanelProps) {
  const [status, setStatus]       = useState<"idle" | "loading" | "done" | "error">("idle")
  const [personas, setPersonas]   = useState<PersonaResult[]>([])
  const [consensus, setConsensus] = useState<ConsensusData | null>(null)
  const [error, setError]         = useState<string | null>(null)

  async function runConsensus() {
    setStatus("loading")
    setError(null)

    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition, stage, experiences, doctors, esiCategory }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()

      setPersonas(data.personas ?? [])
      setConsensus(data.consensus ?? null)
      setStatus("done")
    } catch (err: any) {
      setError(err.message)
      setStatus("error")
    }
  }

  // ── Idle state ──────────────────────────────────────────────────────────────

  if (status === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-dashed border-stone-200 p-6 text-center"
      >
        <div className="text-3xl mb-2">🧠</div>
        <h3 className="font-semibold text-stone-800 mb-1">Get a Second Opinion</h3>
        <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
          Three AI specialists — a clinician, patient advocate, and data scientist —
          independently analyze your results and vote on the best match.
        </p>
        <button
          onClick={runConsensus}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                     text-white bg-stone-800 hover:bg-stone-700 active:scale-95
                     transition-all duration-150 shadow-sm"
        >
          <span>⚖️</span> Run Specialist Consensus
        </button>
        <p className="text-xs text-stone-400 mt-2">Powered by Modal · ~5 seconds</p>
      </motion.div>
    )
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-stone-200 p-8 text-center bg-white"
      >
        <div className="flex justify-center gap-6 mb-5">
          {["🩺", "🤝", "📊"].map((icon, i) => (
            <motion.div
              key={icon}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
              className="text-3xl"
            >
              {icon}
            </motion.div>
          ))}
        </div>
        <p className="font-semibold text-stone-700 text-sm">3 specialists deliberating in parallel…</p>
        <p className="text-xs text-stone-400 mt-1">Running on Modal GPU infrastructure</p>
        <div className="mt-4 space-y-1.5 max-w-xs mx-auto">
          {["Clinical Specialist analyzing outcomes…", "Patient Advocate reviewing experiences…", "Data Scientist validating sample sizes…"].map((msg, i) => (
            <motion.div
              key={msg}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.6 }}
              className="text-xs text-stone-400 flex items-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border border-stone-300 border-t-stone-600 rounded-full shrink-0"
              />
              {msg}
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <p className="text-sm text-red-600 mb-3">⚠ Consensus unavailable: {error}</p>
        <button
          onClick={runConsensus}
          className="text-xs text-red-600 underline hover:text-red-700"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Results ─────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Consensus summary bar */}
      {consensus && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 mb-4 flex items-center gap-4"
        >
          <AgreementRing score={consensus.agreement_score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-stone-800">Specialist Consensus</span>
              {consensus.agreed_top_doctor && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                  ✓ {consensus.agreed_top_doctor}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">{consensus.consensus_note}</p>
            {consensus.show_divergence && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ↓ Expand each panel to understand why they disagree
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Persona cards — 3 col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {personas.map((persona, i) => (
          <PersonaCard
            key={persona.role}
            persona={persona}
            index={i}
            isWinner={consensus?.agreed_top_doctor === persona.top_doctor}
          />
        ))}
      </div>

      {/* Rerun */}
      <div className="mt-4 text-center">
        <button
          onClick={runConsensus}
          className="text-xs text-stone-400 hover:text-stone-600 underline transition-colors"
        >
          Re-run consensus
        </button>
      </div>
    </motion.div>
  )
}
