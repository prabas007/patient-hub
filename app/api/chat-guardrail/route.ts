import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]

// ── In-memory cache ───────────────────────────────────────────────────────────
const cache = new Map<string, { blocked: boolean; reason: string | null }>()
const MAX_CACHE = 200

function cacheKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120)
}

// ── Keyword pre-screen ────────────────────────────────────────────────────────
// Catches numeric dosing, brand/generic drug names, directed advice, diagnostics.
// Only messages that pass this screen get sent to Gemini.
const RED_FLAG_PATTERNS = [
  // Any numeric dose (70mg, 25 milligrams, 5 units, etc.)
  /\b\d+\s*(mg|milligrams?|mcg|micrograms?|units?|ml)\b/i,
  // take/try/start/stop X near a drug name or dose unit
  /\b(take|try|use|start|stop|increase|decrease|double|halve)\b.{0,40}\b(mg|milligrams?|dose|pill|tablet|medication|drug|advil|tylenol|ibuprofen|aspirin|metoprolol|lisinopril|warfarin|xarelto|eliquis|statin|beta.?blocker|atorvastatin|losartan|amlodipine|furosemide|carvedilol|digoxin|amiodarone|clopidogrel|rivaroxaban|apixaban)\b/i,
  // Directed advice: "you should/need to take/start/stop"
  /\byou (should|need to|must|have to)\b.{0,40}\b(take|start|stop|try|use)\b/i,
  // Diagnostic conclusions
  /\b(sounds? like|probably|likely|might be|could be)\b.{0,30}\b(arrhythmia|afib|af|stenosis|tachycardia|bradycardia|fibrillation|angina|embolism|heart failure|infarction|hvd|hfpef|hfref)\b/i,
  // Explicit prescribing/diagnosing language
  /\b(prescribe|diagnose|your (ef|ejection fraction|lvef|bpm|heart rate) should)\b/i,
  // Dose adjustment
  /\b(increase|decrease|double|reduce|lower|raise)\b.{0,20}\b(dose|dosage|mg|milligrams?|medication)\b/i,
  // Stop taking
  /\bstop (taking|your)\b/i,
]

function hasRedFlags(text: string): boolean {
  return RED_FLAG_PATTERNS.some((r) => r.test(text))
}

const SYSTEM_PROMPT = `You are a strict content moderator for a peer support platform for cardiac patients.

Your ONLY job is to detect if a message contains ACTUAL MEDICAL ADVICE — meaning specific clinical guidance that should only come from a licensed healthcare professional.

Flag as BLOCKED if the message contains:
- Specific medication recommendations or dosing instructions directed at another person
- Telling someone to start, stop, or change a prescribed treatment
- Diagnosing or concluding what condition someone's symptoms indicate
- Specific lab/test value thresholds given as personal advice

Do NOT flag:
- Sharing one's own experiences ("my doctor put me on metoprolol")
- General lifestyle tips ("Mediterranean diet helped me")
- Emotional support, questions, encouragement

Respond ONLY with valid JSON — no markdown:
{"blocked": false}
or
{"blocked": true, "reason": "one sentence"}`

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ blocked: false })
    }

    const text = message.trim()
    const key = cacheKey(text)

    // 1. Cache hit
    if (cache.has(key)) {
      return NextResponse.json(cache.get(key)!)
    }

    // 2. Pre-screen — safe messages never touch Gemini
    if (!hasRedFlags(text)) {
      const result = { blocked: false, reason: null }
      cache.set(key, result)
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!)
      return NextResponse.json(result)
    }

    // 3. Red flags found — confirm with Gemini
    console.log("[chat-guardrail] Pre-screen flagged, calling Gemini for:", text.slice(0, 80))
    let res: Response | null = null
    for (const model of MODELS) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${SYSTEM_PROMPT}\n\nMessage:\n"${text}"` }],
              },
            ],
            generationConfig: { temperature: 0, maxOutputTokens: 80 },
          }),
        }
      )
      if (res.status !== 429) break
      console.warn(`[chat-guardrail] 429 on ${model}, trying next...`)
      await new Promise((r) => setTimeout(r, 300))
    }

    if (!res || !res.ok) {
      // Gemini unavailable — pre-screen already flagged this, so block it
      console.warn("[chat-guardrail] Gemini unavailable, blocking pre-screened message:", res?.status)
      return NextResponse.json({
        blocked: true,
        reason: "This message could not be verified and was held for review. Please rephrase or consult your healthcare provider directly.",
      })
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const clean = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    const result = {
      blocked: parsed.blocked === true,
      reason: parsed.reason ?? null,
    }

    cache.set(key, result)
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!)

    return NextResponse.json(result)
  } catch (err) {
    console.error("[chat-guardrail] Error:", err)
    return NextResponse.json({ blocked: false })
  }
}