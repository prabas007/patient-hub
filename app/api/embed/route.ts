/**
 * POST /api/embed
 *
 * Generates a normalised 768-dim embedding using Gemini text-embedding-004.
 *
 * Body:
 *   { text: string, taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" }
 *
 * Response:
 *   { embedding: number[], dim: number }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

function normalise(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

export async function POST(req: NextRequest) {
  try {
    const { text, taskType = "RETRIEVAL_QUERY" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const geminiRes = await fetch(GEMINI_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
      }),
    });

    if (!geminiRes.ok) 
    {
      const err = await geminiRes.text();
      console.error("Gemini error response:", err);
      return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 502 });
    }

    const data = await geminiRes.json();
    const raw: number[] = data.embedding?.values;

    if (!raw) {
      return NextResponse.json({ error: "No embedding returned from Gemini" }, { status: 502 });
    }

    const embedding = normalise(raw);

    return NextResponse.json({ embedding, dim: embedding.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
