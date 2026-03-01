/**
 * POST /api/emotion
 *
 * Uses Gemini to classify the emotional tone of a voice transcript
 * into one of CareLink's ESI categories for adaptive UI theming.
 *
 * Body:
 *   { transcript: string }
 *
 * Response:
 *   {
 *     esi_category: "calm" | "focused" | "anxious" | "overwhelmed",
 *     confidence: number,       // 0–100
 *     reasoning: string,        // short explanation
 *     emotional_signals: string[] // key words/phrases detected
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are CareLink's emotional intelligence engine. Your job is to analyze the emotional tone of a patient's spoken words (transcribed) and classify their current emotional state to personalize their medical consultation experience.

Classify into EXACTLY ONE of these categories:

- "calm": Patient sounds composed, measured, analytical. Uses neutral language. Not in distress.
- "focused": Patient is direct, goal-oriented, wants efficient information. May sound businesslike or determined.
- "anxious": Patient sounds worried, scared, uncertain. Uses words like "scared", "worried", "don't know what to do", "what if", or speaks with emotional urgency.
- "overwhelmed": Patient sounds distressed, exhausted, or like they're struggling to cope. May be fragmented, repetitive, or express feeling lost/hopeless.

Return ONLY valid JSON, no markdown, no preamble:
{
  "esi_category": "calm" | "focused" | "anxious" | "overwhelmed",
  "confidence": number (0-100),
  "reasoning": string (one sentence explaining the classification),
  "emotional_signals": string[] (2-4 key words or phrases that drove the classification)
}

If the transcript is empty, very short, or unclear, default to "calm" with confidence 30.`;

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { esi_category: "calm", confidence: 30, reasoning: "No transcript provided", emotional_signals: [] },
        { status: 200 }
      );
    }

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Patient transcript: "${transcript}"` }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini emotion error:", err);
      // Fallback gracefully
      return NextResponse.json({
        esi_category: "calm",
        confidence: 30,
        reasoning: "Emotion detection unavailable",
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
        esi_category: "calm",
        confidence: 30,
        reasoning: "Could not parse emotion response",
        emotional_signals: [],
      });
    }

    // Validate esi_category
    const valid = ["calm", "focused", "anxious", "overwhelmed"];
    if (!valid.includes(parsed.esi_category)) {
      parsed.esi_category = "calm";
    }

    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence ?? 50));

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Emotion route error:", err);
    return NextResponse.json({
      esi_category: "calm",
      confidence: 30,
      reasoning: "Error in emotion detection",
      emotional_signals: [],
    });
  }
}
