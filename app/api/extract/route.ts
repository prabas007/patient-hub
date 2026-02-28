/**
 * POST /api/extract
 *
 * Uses Gemini to extract structured outcome data from a raw patient experience.
 *
 * Body:
 *   { text: string }
 *
 * Response:
 *   {
 *     recovery_days: number,
 *     side_effect_tags: string[],
 *     sentiment_score: number,       // -1.0 to 1.0
 *     outcome_success_score: number, // 0.0 to 1.0
 *     treatment_type: string,
 *     condition: string,
 *     stage: string,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a medical data extraction assistant for CareLink, a patient intelligence platform.

Given a patient's free-text experience, extract the following fields and return ONLY valid JSON — no markdown, no explanation, no preamble.

Fields to extract:
- recovery_days: integer (estimate if not stated explicitly; use 0 if unknown)
- side_effect_tags: array of lowercase snake_case strings (e.g. ["nausea", "hair_loss", "fatigue"])
- sentiment_score: float from -1.0 (very negative) to 1.0 (very positive), reflecting the patient's emotional tone
- outcome_success_score: float from 0.0 (poor outcome) to 1.0 (excellent outcome), based on language like "cancer-free", "complications", "successful", etc.
- treatment_type: one of "Chemotherapy", "Radiation", "Surgery", "Immunotherapy", "Hormone Therapy", "Other"
- condition: the medical condition mentioned (e.g. "Breast Cancer", "Type 2 Diabetes")
- stage: the stage if mentioned (e.g. "Stage II"), or null if not mentioned

Return strictly this JSON shape:
{
  "recovery_days": number,
  "side_effect_tags": string[],
  "sentiment_score": number,
  "outcome_success_score": number,
  "treatment_type": string,
  "condition": string,
  "stage": string | null
}`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          temperature: 0.1, // low temp for consistent structured output
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiRes.ok) {
  const err = await geminiRes.text();
  console.error("Gemini extract error:", err);
  return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 502 });
}

    const data = await geminiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned non-JSON output", raw },
        { status: 502 }
      );
    }

    // Clamp numeric fields to valid ranges
    parsed.sentiment_score = Math.max(-1, Math.min(1, parsed.sentiment_score ?? 0));
    parsed.outcome_success_score = Math.max(0, Math.min(1, parsed.outcome_success_score ?? 0));
    parsed.recovery_days = Math.max(0, Math.round(parsed.recovery_days ?? 0));

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
