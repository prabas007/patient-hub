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
 *     condition: string | null,
 *     stage: string | null,
 *     esi_category: EsiCategory,
 *     confidence: number,
 *     condition_confidence: number,   // ≥ 60 → auto-skip, even without stage
 *     reasoning: string,
 *     emotional_signals: string[],
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
Set condition_confidence to 60–90 if the condition is clearly named or strongly implied, even if no stage is mentioned.

2. STAGE: If a condition is identified, match the stage from its valid options:
${Object.entries(VALID_CONDITIONS).map(([c, stages]) => `   ${c}: ${stages.map(s => `"${s}"`).join(", ")}`).join("\n")}
Return null if stage is not mentioned or unclear. A missing stage does NOT lower condition_confidence.

3. EMOTIONAL TONE — read the ACTUAL language carefully. Do not assume. Score each category and pick the best fit.

SCORING GUIDE — look for explicit signals, not just topic:

"overwhelmed" signals (score +3 each):
  - Fragmented sentences, trailing off ("I just… I don't even know")
  - Explicit exhaustion or hopelessness ("I'm so tired of this", "I can't do this anymore", "I give up")
  - Multiple compounding stressors named at once ("the kids, the job, the diagnosis, I can't")
  - Crying cues or emotional break ("I keep crying", "I broke down", "I can't stop thinking about it")
  - Feeling incapable of action ("I don't know how I'm going to", "I can't handle")

"anxious" signals (score +2 each):
  - Explicit fear or worry words ("scared", "terrified", "worried", "nervous", "afraid")
  - Future uncertainty questions ("what if", "what happens if", "will I be okay", "how bad is it")
  - Seeking reassurance ("is that normal", "should I be worried", "am I going to be okay")
  - Recent diagnosis shock ("just found out", "just diagnosed", "just got the results")
  - Hedging or self-doubt ("I think", "I'm not sure", "maybe", "I don't really know")

"focused" signals (score +2 each):
  - Clear action intent ("I need to find", "I want to compare", "help me choose", "I'm looking for")
  - Specific factual questions ("what are the success rates", "which hospital", "how long is recovery")
  - Organized multi-point delivery ("first… second… also…")
  - No emotional language anywhere in the transcript
  - References to research or preparation ("I've been reading", "I've looked into")

"calm" signals (score +2 each):
  - Past-tense reporting without emotion ("I was diagnosed last year", "I've been managing it")
  - Acceptance language ("I've come to terms with", "I'm dealing with it", "it's been a process")
  - Measured pacing, no urgency
  - Factual update tone ("my last checkup showed", "my levels have been stable")
  - Long-term perspective ("over the past few years", "since my diagnosis in")

CLASSIFICATION RULES:
- Pick the category with the highest cumulative score.
- If "overwhelmed" signals are present AND "anxious" signals are also present, pick "overwhelmed".
- If "focused" signals dominate but ONE worry phrase slips in, still pick "focused" — one hedge doesn't override a businesslike tone.
- If the patient sounds calm AND accepting (not just neutral), pick "calm" — don't conflate emotional flatness with calm.
- Only use "calm" when there is genuine acceptance/composure, not just absence of panic.
- Do NOT default to any single category. Each transcript should be evaluated on its own merits.

CALIBRATED EXAMPLES:
- "I was just diagnosed with Stage II breast cancer and I'm really scared about what comes next" → anxious (explicit fear + future uncertainty)
- "I can't do this anymore. Every day is just… I'm exhausted. The chemo, my family, I don't even know how to keep going" → overwhelmed (exhaustion + fragmentation + compounding stressors)
- "I have Type 2 diabetes, moderate stage. I want to find a specialist with strong outcomes data, ideally someone at a teaching hospital" → focused (clear action intent + specific criteria + no emotional language)
- "I've had Crohn's disease for about six years now. Currently in remission. Looking to switch to a gastroenterologist closer to home" → calm (past-tense managing + acceptance + factual update)
- "I think I might have MS? I'm not totally sure, the symptoms have been weird lately and I'm kind of freaking out" → anxious (self-doubt + uncertainty + explicit emotional signal)
- "My Parkinson's has progressed to Stage 3. I need to understand my options for deep brain stimulation — specifically outcomes for patients my age" → focused (specific medical question + research orientation despite serious condition)
- "I've been living with lupus for three years. It's been hard but I'm managing okay. Just want to make sure I have the right doctor going forward" → calm (long-term perspective + acceptance language + low urgency)

Return ONLY valid JSON, no markdown:
{
  "condition": string | null,
  "stage": string | null,
  "esi_category": "calm" | "focused" | "anxious" | "overwhelmed",
  "confidence": number (0-100, how confident you are in the emotion classification based on signal strength),
  "condition_confidence": number (0-100, how confident in condition match — stage NOT required for high score),
  "reasoning": string (one sentence: name the top 1-2 signals that drove your emotion choice),
  "emotional_signals": string[] (2-4 exact short phrases verbatim from the transcript that drove classification)
}

If the transcript is empty or too short to classify, return all nulls with esi_category "calm" and confidence 30.`;

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
        reasoning: "Transcript too short to classify",
        emotional_signals: [],
      });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Patient said: "${transcript}"` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
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