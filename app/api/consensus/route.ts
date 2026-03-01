/**
 * POST /api/consensus
 *
 * Calls the Modal consensus engine which fires 3 specialist Gemini agents
 * IN PARALLEL and returns independent verdicts + agreement scoring.
 *
 * Body:
 *   {
 *     condition: string,
 *     stage?: string,
 *     experiences: object[],   // from /api/recommend retrieved_experiences
 *     doctors: object[],       // from /api/recommend doctor_recommendations
 *     esiCategory?: string,
 *   }
 *
 * Response:
 *   {
 *     personas: [
 *       { role, label, icon, top_doctor, confidence, verdict, key_insight, concern }
 *       x3
 *     ],
 *     consensus: {
 *       agreed_top_doctor: string | null,
 *       agreement_score: number,
 *       consensus_note: string,
 *       show_divergence: boolean,
 *       vote_breakdown: Record<string, number>,
 *     }
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const MODAL_CONSENSUS_URL = process.env.MODAL_CONSENSUS_URL!;
const GEMINI_API_KEY       = process.env.GEMINI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { condition, stage, experiences, doctors, esiCategory = "calm" } = await req.json();

    if (!condition || !doctors?.length) {
      return NextResponse.json(
        { error: "condition and doctors are required" },
        { status: 400 }
      );
    }

    if (!MODAL_CONSENSUS_URL) {
      return NextResponse.json(
        { error: "MODAL_CONSENSUS_URL not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(MODAL_CONSENSUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        condition,
        stage:       stage || null,
        experiences: experiences || [],
        doctors,
        esi_category: esiCategory,
        gemini_key:   GEMINI_API_KEY,   // passed server-side, never exposed to client
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Modal consensus error:", err);
      return NextResponse.json({ error: `Modal error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("consensus route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
