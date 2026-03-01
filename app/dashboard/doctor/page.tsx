"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DoctorCard } from "@/components/DoctorCard"
import { DoctorCardSkeleton } from "@/components/Skeleton"
import { PageTransition } from "@/components/PageTransition"
import {
  EmotionProvider,
  useEmotion,
  type EsiCategory,
  EMOTION_THEMES,
  EMOTION_CSS_VARS,
} from "@/lib/emotionTheme"
import type { Doctor } from "@/lib/mockData"

// ── Condition / Stage Data ────────────────────────────────────────────────────

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

const ESI_OPTIONS: { value: EsiCategory; label: string; desc: string; color: string }[] = [
  { value: "calm",        label: "Calm",        desc: "Detailed & analytical", color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "focused",     label: "Focused",     desc: "Clear & efficient",     color: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "anxious",     label: "Anxious",     desc: "Warm & reassuring",     color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "overwhelmed", label: "Overwhelmed", desc: "Gentle & simplified",   color: "border-purple-400 bg-purple-50 text-purple-700" },
]

// ── Voice Recorder Hook ───────────────────────────────────────────────────────

function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null)
  const [micError, setMicError]       = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      setMicError(null)
      setAudioBlob(null)
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start(250)
      setIsRecording(true)
    } catch (err: any) {
      setMicError(err.message ?? "Microphone access denied")
    }
  }, [])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
    setIsRecording(false)
  }, [])

  return { isRecording, audioBlob, micError, start, stop }
}

// ── TTS Hook ─────────────────────────────────────────────────────────────────

function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ttsError, setTtsError]   = useState<string | null>(null)

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }

    setIsLoading(true)
    setTtsError(null)

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) throw new Error(`TTS failed: ${res.status}`)

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(url)
        audioRef.current = null
      }

      await audio.play()
      setIsPlaying(true)
    } catch (err: any) {
      setTtsError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [])

  return { speak, stop, isPlaying, isLoading, ttsError }
}

function emotionIcon(e: EsiCategory | "neutral") {
  return { calm: "🌊", focused: "⚡", anxious: "🌤️", overwhelmed: "🌸", neutral: "✨" }[e] ?? "✨"
}

// ── Inner page ────────────────────────────────────────────────────────────────

function DoctorPageInner() {
  const { emotion, setEmotion } = useEmotion()

  const [condition, setCondition]   = useState("")
  const [stage, setStage]           = useState("")
  const [esi, setEsi]               = useState<EsiCategory>("calm")
  const [region, setRegion]         = useState("")
  const [step, setStep]             = useState<"select" | "results">("select")
  const [doctors, setDoctors]       = useState<Doctor[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [ragSummary, setRagSummary] = useState<any>(null)

  const { isRecording, audioBlob, micError, start, stop } = useVoiceRecorder()
  const { speak, isPlaying: ttsPlaying, isLoading: ttsLoading, ttsError } = useTTS()

  const [isProcessing, setIsProcessing]   = useState(false)
  const [transcript, setTranscript]       = useState("")
  const [voiceDetected, setVoiceDetected] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<{
    condition: string | null
    stage: string | null
    esi_category: EsiCategory
    condition_confidence: number
    emotional_signals: string[]
  } | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Apply CSS vars on emotion change
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    Object.entries(EMOTION_CSS_VARS[emotion] ?? EMOTION_CSS_VARS.neutral)
      .forEach(([k, v]) => el.style.setProperty(k, v))
  }, [emotion])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    Object.entries(EMOTION_CSS_VARS.neutral).forEach(([k, v]) => el.style.setProperty(k, v))
  }, [])

  useEffect(() => {
    if (audioBlob) processAudio(audioBlob)
  }, [audioBlob])

  // ── Voice pipeline ───────────────────────────────────────────────────────

  async function processAudio(blob: Blob) {
    setIsProcessing(true)
    try {
      const form = new FormData()
      form.append("audio", blob, "recording.webm")
      const txRes  = await fetch("/api/transcribe", { method: "POST", body: form })
      const txData = await txRes.json()
      const text   = txData.transcript ?? ""
      setTranscript(text)
      if (!text) return

      const exRes     = await fetch("/api/voice-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      })
      const extracted = await exRes.json()

      const detectedEsi = extracted.esi_category as EsiCategory
      setEmotion(detectedEsi)
      setEsi(detectedEsi)
      setExtractedInfo(extracted)
      setVoiceDetected(true)

      // Auto-search if condition confidence ≥ 60 (stage no longer required)
      if (extracted.condition && extracted.condition_confidence >= 60) {
        setCondition(extracted.condition)
        if (extracted.stage) setStage(extracted.stage)
        await runSearch({
          condition:   extracted.condition,
          stage:       extracted.stage ?? "",   // empty string = search all stages
          esiCategory: detectedEsi,
          queryText:   text,
        })
      } else {
        if (extracted.condition) setCondition(extracted.condition)
        if (extracted.stage)     setStage(extracted.stage)
      }
    } catch (err: any) {
      console.error("Voice processing error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────

  async function runSearch(override?: {
    condition: string; stage: string; esiCategory: EsiCategory; queryText?: string
  }) {
    const c = override?.condition   ?? condition
    const s = override?.stage       ?? stage
    const e = override?.esiCategory ?? esi
    const q = override?.queryText   ?? transcript
    if (!c) return

    setIsLoading(true)
    setError(null)
    setStep("results")

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition: c,
          stage: s || undefined,
          region: region || undefined,
          esiCategory: e,
          queryText: q || undefined,
          topK: 10,
        }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()

      setDoctors(
        (data.doctor_recommendations ?? []).map((d: any, idx: number) => ({
          id:              d.doctor_id,
          name:            d.doctor_name,
          specialty:       d.doctor_specialty,
          hospital:        d.doctor_hospital,
          location:        d.doctor_location_region ?? "",
          matchScore:      Math.round(d.composite_score * 100),
          acceptingNew:    true,
          experienceYears: d.experience_years ?? [14, 9, 18, 11, 7, 22][idx % 6],
          languages:       [],
          aiSummary:       "",
          patientCount:    d.supporting_experiences,
          recoveryData:    [],
        }))
      )
      setRagSummary(data.rag_summary ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setStep("select"); setCondition(""); setStage(""); setEsi("calm"); setRegion("")
    setEmotion("neutral"); setDoctors([]); setRagSummary(null); setError(null)
    setTranscript(""); setVoiceDetected(false); setExtractedInfo(null)
  }

  const stages    = condition ? CONDITIONS[condition]?.stages ?? [] : []
  const canSearch = condition && !isProcessing

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={wrapperRef}
      style={{ transition: "background-color 2.5s ease" }}
    >
      <PageTransition>
        <AnimatePresence mode="wait">

          {/* ── SELECT ── */}
          {step === "select" && (
            <motion.div key="select"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--theme-text, #111827)" }}>
                Doctor Recommender
              </h2>
              <p className="mb-8 max-w-xl text-sm text-stone-500">
                Select your condition below, or speak to skip straight to matched doctors.
              </p>

              {/* 1. Condition Grid */}
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
                  Step 1 · Select your condition
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(CONDITIONS).map(([name, { icon }]) => (
                    <button key={name}
                      onClick={() => { setCondition(name); setStage("") }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-sm
                                 font-medium transition-all duration-200 text-center leading-tight"
                      style={condition === name ? {
                        borderColor: "var(--theme-accent, #2563eb)",
                        backgroundColor: "var(--theme-accent-soft, #eff6ff)",
                        color: "var(--theme-accent, #2563eb)",
                        transform: "scale(1.02)",
                      } : { borderColor: "#e5e7eb", backgroundColor: "white", color: "#4b5563" }}
                    >
                      <span className="text-2xl">{icon}</span>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Stage — optional, manual path only, hidden after voice detection */}
              <AnimatePresence>
                {condition && !voiceDetected && (
                  <motion.div key="stages"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="mb-8 overflow-hidden"
                  >
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">
                      Step 2 · Select your stage
                    </h3>
                    <p className="text-xs text-stone-400 mb-3">Optional — skip to search across all stages</p>
                    <div className="flex flex-wrap gap-3">
                      {stages.map((s) => (
                        <button key={s} onClick={() => setStage(stage === s ? "" : s)}
                          className="px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200"
                          style={stage === s ? {
                            borderColor: "var(--theme-accent, #2563eb)",
                            backgroundColor: "var(--theme-accent-soft, #eff6ff)",
                            color: "var(--theme-accent, #2563eb)",
                          } : { borderColor: "#e5e7eb", backgroundColor: "white", color: "#4b5563" }}
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
                {condition && !voiceDetected && (
                  <motion.div key="esi"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="mb-8 overflow-hidden"
                  >
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
                      Step 3 · How are you feeling today?
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {ESI_OPTIONS.map((opt) => (
                        <button key={opt.value}
                          onClick={() => { setEsi(opt.value); setEmotion(opt.value) }}
                          className={`p-4 rounded-2xl border-2 text-left transition-all duration-150
                            ${esi === opt.value ? `${opt.color} shadow-sm scale-[1.02]`
                              : "border-stone-200 bg-white text-stone-600 hover:border-gray-300"}`}
                        >
                          <div className="font-semibold text-sm mb-0.5">{opt.label}</div>
                          <div className="text-xs opacity-70">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 4. Location — shown once condition is selected */}
              <AnimatePresence>
                {condition && !voiceDetected && (
                  <motion.div key="location"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="mb-8 overflow-hidden"
                  >
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">
                      Step 4 · Your location
                    </h3>
                    <p className="text-xs text-stone-400 mb-3">Optional — doctors near you will appear first</p>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. San Francisco, Chicago, Boston…"
                      className="w-full max-w-sm px-4 py-2.5 rounded-xl border-2 text-sm
                                 border-stone-200 bg-white text-stone-700 placeholder-stone-400
                                 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Divider ── */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs text-stone-400 uppercase tracking-widest font-medium">
                    or use your voice
                  </span>
                </div>
              </div>

              {/* ── Mic Section ── */}
              <AnimatePresence mode="wait">

                {isProcessing && (
                  <motion.div key="processing"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--theme-accent-soft, #eff6ff)" }}>
                      <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24"
                        style={{ color: "var(--theme-accent, #2563eb)" }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--theme-accent, #2563eb)" }}>
                      Analyzing your voice…
                    </p>
                    <p className="text-xs text-stone-400">Transcribing and detecting your condition</p>
                  </motion.div>
                )}

                {!isProcessing && voiceDetected && extractedInfo && (
                  <motion.div key="voice-result"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border p-5 mb-4"
                    style={{ backgroundColor: "var(--theme-accent-soft)", borderColor: "var(--theme-border)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{emotionIcon(emotion)}</span>
                          <span className="font-semibold text-sm" style={{ color: "var(--theme-accent)" }}>
                            Voice analyzed · {EMOTION_THEMES[emotion].label} tone detected
                          </span>
                        </div>
                        <p className="text-xs mb-3 italic line-clamp-2"
                          style={{ color: "color-mix(in srgb, var(--theme-text, #374151) 60%, transparent)" }}>
                          "{transcript}"
                        </p>
                        {extractedInfo.emotional_signals.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {extractedInfo.emotional_signals.map((sig) => (
                              <span key={sig}
                                className="text-xs px-2 py-0.5 rounded-full border font-medium"
                                style={{ backgroundColor: "white", borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}>
                                {sig}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setVoiceDetected(false); setTranscript(""); setExtractedInfo(null); setEmotion("neutral") }}
                        className="text-xs text-stone-400 hover:text-stone-600 underline shrink-0"
                      >
                        Re-record
                      </button>
                    </div>

                    {(extractedInfo.condition || extractedInfo.stage) && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center"
                        style={{ borderColor: "var(--theme-border)" }}>
                        <span className="text-xs text-stone-500">Detected:</span>
                        {extractedInfo.condition && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: "var(--theme-accent)" }}>
                            {extractedInfo.condition}
                          </span>
                        )}
                        {extractedInfo.stage && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                            style={{ borderColor: "var(--theme-accent)", color: "var(--theme-accent)" }}>
                            {extractedInfo.stage}
                          </span>
                        )}
                        {!extractedInfo.stage && extractedInfo.condition && (
                          <span className="text-xs text-stone-400 italic">No stage detected — searching all stages</span>
                        )}
                        {extractedInfo.condition && extractedInfo.condition_confidence >= 60 && (
                          <span className="text-xs text-stone-400 ml-auto">Searching automatically…</span>
                        )}
                      </div>
                    )}

                    {/* Location input after voice detection too */}
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--theme-border)" }}>
                      <p className="text-xs text-stone-500 mb-2">Your location (optional — prioritises nearby doctors)</p>
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. San Francisco, Chicago…"
                        className="w-full max-w-xs px-3 py-2 rounded-lg border text-sm
                                   border-stone-200 bg-white text-stone-700 placeholder-stone-400
                                   focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}

                {!isProcessing && !voiceDetected && isRecording && (
                  <motion.div key="recording"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="relative">
                      <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-red-400" />
                      <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-400" style={{ animationDelay: "0.4s" }} />
                      <button onClick={stop}
                        className="relative w-16 h-16 rounded-full bg-red-500 flex items-center justify-center
                                   text-white shadow-xl hover:bg-red-600 active:scale-95 transition-all">
                        <span className="w-5 h-5 rounded-sm bg-white" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-red-500">Recording — tap to stop</p>
                    <p className="text-xs text-stone-400 text-center max-w-xs">
                      Try: "I was just diagnosed with breast cancer and I'm scared about what's next"
                    </p>
                  </motion.div>
                )}

                {!isProcessing && !voiceDetected && !isRecording && (
                  <motion.div key="idle"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-3 py-2"
                  >
                    <button onClick={start}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white
                                 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: "var(--theme-btn, #2563eb)",
                        boxShadow: "0 8px 30px color-mix(in srgb, var(--theme-accent, #2563eb) 30%, transparent)",
                      }}
                    >
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.93V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A8 8 0 0 1 4 12a1 1 0 0 1 1-1z" />
                      </svg>
                    </button>
                    <p className="text-sm font-medium text-stone-600">Describe your situation to skip ahead</p>
                    <p className="text-xs text-stone-400">We'll detect your condition, stage, and mood automatically</p>
                    {micError && <p className="text-xs text-red-400 text-center max-w-xs">{micError}</p>}
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Manual search CTA — only needs condition now */}
              <AnimatePresence>
                {canSearch && !isProcessing && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-10"
                  >
                    <button onClick={() => runSearch()}
                      className="text-white font-semibold px-8 py-3.5 rounded-2xl transition-all
                                 duration-150 flex items-center gap-2 text-base active:scale-95"
                      style={{
                        backgroundColor: "var(--theme-btn, #2563eb)",
                        boxShadow: "0 8px 25px color-mix(in srgb, var(--theme-accent, #2563eb) 25%, transparent)",
                      }}
                    >
                      Find Matching Doctors <span>→</span>
                    </button>
                    {!stage && (
                      <p className="text-xs text-stone-400 mt-2">No stage selected — showing doctors across all stages</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── RESULTS ── */}
          {step === "results" && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
            >
              <button onClick={handleReset}
                className="text-sm hover:underline mb-3 flex items-center gap-1"
                style={{ color: "var(--theme-accent, #2563eb)" }}>
                ← Change selection
              </button>

              <h2 className="text-3xl font-bold mb-1" style={{ color: "var(--theme-text, #111827)" }}>
                Doctor Recommender
              </h2>
              <p className="mb-6 text-sm" style={{ color: "color-mix(in srgb, var(--theme-text, #6b7280) 60%, transparent)" }}>
                Results for{" "}
                <span className="font-semibold" style={{ color: "var(--theme-text)" }}>{condition}</span>
                {stage && (
                  <><span style={{ color: "var(--theme-text)" }}>{" · "}</span>
                  <span className="font-semibold" style={{ color: "var(--theme-text)" }}>{stage}</span></>
                )}
                {!stage && (
                  <span className="ml-1 text-xs text-stone-400 italic">· all stages</span>
                )}
                {region && (
                  <span className="ml-1 text-xs text-stone-400">· near {region}</span>
                )}
                {voiceDetected && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "var(--theme-accent-soft)", color: "var(--theme-accent)" }}>
                    {emotionIcon(emotion)} {EMOTION_THEMES[emotion].label} tone
                  </span>
                )}
              </p>

              {error && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  Failed to load recommendations: {error}
                </div>
              )}

              {/* ── AI Summary with TTS button ── */}
              {!isLoading && ragSummary?.narrative && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5 mb-6 border"
                  style={{ backgroundColor: "var(--theme-summary-bg, #eff6ff)", borderColor: "var(--theme-border, #e5e7eb)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>🤖</span>
                    <span className="font-semibold text-sm" style={{ color: "var(--theme-accent)" }}>AI Summary</span>
                    {ragSummary.confidence_level != null && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--theme-accent-soft)", color: "var(--theme-accent)" }}>
                        {ragSummary.confidence_level}% confidence
                      </span>
                    )}

                    {/* ── Read Aloud Button ── */}
                    <button
                      onClick={() => speak(ragSummary.narrative)}
                      disabled={ttsLoading}
                      className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5
                                 rounded-xl border transition-all duration-150 active:scale-95
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: "var(--theme-accent)",
                        color: ttsPlaying ? "white" : "var(--theme-accent)",
                        backgroundColor: ttsPlaying
                          ? "var(--theme-accent)"
                          : "var(--theme-accent-soft, transparent)",
                      }}
                      title={ttsPlaying ? "Stop reading" : "Read aloud"}
                    >
                      {ttsLoading ? (
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : ttsPlaying ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                      )}
                      {ttsLoading ? "Loading…" : ttsPlaying ? "Stop" : "Read aloud"}
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed"
                    style={{ color: "color-mix(in srgb, var(--theme-text) 80%, transparent)" }}>
                    {ragSummary.narrative}
                  </p>

                  {ttsError && (
                    <p className="text-xs text-red-400 mt-2">⚠ {ttsError}</p>
                  )}
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <DoctorCardSkeleton key={i} />)
                  : doctors.length === 0
                  ? (
                    <div className="col-span-2 text-center py-16 text-stone-400">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-medium text-stone-500">No doctors found for your profile.</p>
                      <p className="text-sm mt-1">Try adjusting your condition or stage.</p>
                      <button onClick={handleReset} className="mt-4 hover:underline text-sm"
                        style={{ color: "var(--theme-accent)" }}>
                        ← Go back and adjust
                      </button>
                    </div>
                  )
                  : doctors.map((doctor, i) => <DoctorCard key={doctor.id} doctor={doctor} index={i} />)
                }
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </PageTransition>
    </div>
  )
}

export default function DoctorPage() {
  return (
    <EmotionProvider>
      <DoctorPageInner />
    </EmotionProvider>
  )
}