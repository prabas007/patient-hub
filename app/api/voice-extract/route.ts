/**
 * POST /api/voice-extract
 *
 * Single Gemini call that extracts condition, stage, AND emotional tone
 * from a Whisper transcript. Powers the "smart skip" voice path.
 *
 * Body:
 *   { transcript: string }
 *
 * Response:
 *   {
 *     condition: string | null,        // matched to CareLink condition list
 *     stage: string | null,            // matched to condition's stage list
 *     esi_category: EsiCategory,       // calm | focused | anxious | overwhelmed
 *     confidence: number,              // 0–100
 *     reasoning: string,
 *     emotional_signals: string[],
 *     condition_confidence: number,    // how confident we are in condition match
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Must mirror CONDITIONS in the frontend exactly
const VALID_CONDITIONS: Record<string, string[]> = {
  "Breast Cancer":           ["Stage I", "Stage II", "Stage III", "Stage IV"],
  "Type 2 Diabetes":         ["Pre-diabetic", "Newly Diagnosed", "Moderate", "Advanced"],
  "Coronary Artery Disease": ["Mild", "Moderate", "Severe"],
  "Multiple Sclerosis":      ["Relapsing-Remitting", "Secondary Progressive", "Primary Progressive", "Clinically Isolated Syndrome"],
  "Crohn's Disease":         ["Mild", "Moderate-Severe", "Remission", "Flare"],
  "Rheumatoid Arthritis":    ["Early", "Moderate", "Severe", "Remission"],
  "Lung Cancer":             ["Stage I", "Stage II", "Stage III", "Stage IV"],
  "Parkinson's Disease":     ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"],
  "Lupus":                   ["Mild", "Moderate", "Severe", "Remission"],
  "Depression":              ["Mild", "Moderate", "Severe", "Treatment-Resistant"],
};

const SYSTEM_PROMPT = `You are CareLink's voice intelligence engine. A patient has spoken about their medical situation. Extract three things simultaneously:

1. CONDITION: Match to the closest condition from this exact list:
${Object.keys(VALID_CONDITIONS).map(c => `   - "${c}"`).join("\n")}
Return null if no condition is clearly mentioned or implied.

2. STAGE: If a condition is identified, match the stage from its valid options:
${Object.entries(VALID_CONDITIONS).map(([c, stages]) => `   ${c}: ${stages.map(s => `"${s}"`).join(", ")}`).join("\n")}
Return null if stage is not mentioned or unclear.

3. EMOTIONAL TONE: Classify as one of:
   - "calm": composed, measured, not in distress
   - "focused": direct, goal-oriented, businesslike
   - "anxious": worried, scared, uncertain — words like "scared", "worried", "don't know", "what if"
   - "overwhelmed": distressed, exhausted, fragmented, hopeless

Return ONLY valid JSON, no markdown:
{
  "condition": string | null,
  "stage": string | null,
  "esi_category": "calm" | "focused" | "anxious" | "overwhelmed",
  "confidence": number (0-100, overall emotion confidence),
  "condition_confidence": number (0-100, how confident in condition match),
  "reasoning": string (one sentence),
  "emotional_signals": string[] (2-4 key phrases that drove emotion classification)
}

If the transcript is empty or too short to extract anything meaningful, return all nulls with esi_category "calm" and confidence 30.`;

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
      return NextResponse.json({
        condition: null,
        stage: null,
        esi_category: "calm",
        confidence: 30,
        condition_confidence: 0,
        reasoning: "Transcript too short",
        emotional_signals: [],
      });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Patient said: "${transcript}"` }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini voice-extract error:", err);
      return NextResponse.json({
        condition: null,
        stage: null,
        esi_category: "calm",
        confidence: 30,
        condition_confidence: 0,
        reasoning: "Extraction unavailable",
        emotional_signals: [],
      });
    }

    const data = await geminiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        condition: null,
        stage: null,
        esi_category: "calm",
        confidence: 30,
        condition_confidence: 0,
        reasoning: "Parse error",
        emotional_signals: [],
      });
    }

    // Validate condition against known list
    if (parsed.condition && !VALID_CONDITIONS[parsed.condition]) {
      // Try fuzzy match — find closest key
      const lower = parsed.condition.toLowerCase();
      const match = Object.keys(VALID_CONDITIONS).find(c =>
        c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase().split(" ")[0])
      );
      parsed.condition = match ?? null;
      if (!match) parsed.condition_confidence = Math.min(parsed.condition_confidence ?? 50, 40);
    }

    // Validate stage against condition's valid stages
    if (parsed.condition && parsed.stage) {
      const validStages = VALID_CONDITIONS[parsed.condition] ?? [];
      if (!validStages.includes(parsed.stage)) {
        // Try to find closest stage
        const lower = parsed.stage.toLowerCase();
        const match = validStages.find(s =>
          s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase().split(" ")[0])
        );
        parsed.stage = match ?? null;
      }
    }

    // Validate esi_category
    const validEsi = ["calm", "focused", "anxious", "overwhelmed"];
    if (!validEsi.includes(parsed.esi_category)) parsed.esi_category = "calm";

    parsed.confidence           = Math.max(0, Math.min(100, parsed.confidence ?? 50));
    parsed.condition_confidence = Math.max(0, Math.min(100, parsed.condition_confidence ?? 50));

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("voice-extract error:", err);
    return NextResponse.json({
      condition: null,
      stage: null,
      esi_category: "calm",
      confidence: 30,
      condition_confidence: 0,
      reasoning: "Error",
      emotional_signals: [],
    });
  }
}
