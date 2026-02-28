/**
 * POST /api/recommend
 *
 * Full CareLink RAG pipeline:
 *   1. Embeds the user query via Gemini
 *   2. Queries VectorAI DB via the REST bridge for similar experiences
 *   3. Aggregates doctor scores
 *   4. Sends RAG context to Gemini for a structured recommendation summary
 *   5. Returns experiences + doctors + AI narrative
 *
 * Body:
 *   {
 *     condition: string,
 *     stage: string,
 *     queryText?: string,      // optional free-text override
 *     esiCategory?: "calm" | "focused" | "anxious" | "overwhelmed",
 *     topK?: number,           // default: 10
 *   }
 *
 * Response:
 *   {
 *     query: object,
 *     retrieved_experiences: object[],
 *     doctor_recommendations: object[],
 *     rag_summary: {
 *       key_strengths: string[],
 *       potential_concerns: string[],
 *       typical_patient_profile: string,
 *       recovery_time_summary: string,
 *       confidence_level: number,        // 0–100
 *       narrative: string,               // tone-adapted paragraph
 *     },
 *     metadata: object,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const BRIDGE_URL = process.env.VECTORAI_BRIDGE_URL || "http://localhost:8080";
const EMBED_MODEL = "gemini-embedding-001";
const GEN_MODEL = "gemini-2.5-flash-lite";

const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
const GEMINI_GEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── Tone instructions per ESI category ────────────────────────────────────────

const ESI_TONE: Record<string, string> = {
  calm:
    "Use a balanced, technical, and informative tone. Include detailed outcome statistics and comparisons.",
  focused:
    "Use a clear, structured tone. Highlight the most relevant facts efficiently.",
  anxious:
    "Use a warm, reassuring, and confidence-building tone. Lead with positive outcomes. Avoid overwhelming statistics.",
  overwhelmed:
    "Use a very gentle, simplified tone. Highlight only the single most important recommendation. Keep it brief and encouraging.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalise(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(GEMINI_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${await res.text()}`);
  const data = await res.json();
  return normalise(data.embedding?.values ?? []);
}

async function queryVectorDB(
  embedding: number[],
  condition: string,
  stage: string,
  topK: number
): Promise<any[]> {
  const res = await fetch(`${BRIDGE_URL}/search_filtered`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collection: "patient_experiences",
      query: embedding,
      top_k: topK,
      filters: [
        { field: "condition", op: "eq", value: condition },
        { field: "stage", op: "eq", value: stage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`VectorDB query failed: ${await res.text()}`);
  const data = await res.json();
  return (data.hits ?? []).sort((a: any, b: any) => b.score - a.score);
}

function aggregateDoctors(experiences: any[], topN = 3): any[] {
  const buckets: Record<string, any[]> = {};
  for (const exp of experiences) {
    const did = exp.payload?.doctor_id;
    if (!did) continue;
    if (!buckets[did]) buckets[did] = [];
    buckets[did].push(exp);
  }

  return Object.entries(buckets)
    .map(([doctorId, exps]) => {
      const n = exps.length;
      const avgSim = exps.reduce((s, e) => s + e.score, 0) / n;
      const avgOutcome = exps.reduce((s, e) => s + (e.payload?.outcome_success_score ?? 0), 0) / n;
      const avgSentiment = exps.reduce((s, e) => s + (e.payload?.sentiment_score ?? 0), 0) / n;
      const avgRecovery = exps.reduce((s, e) => s + (e.payload?.recovery_days ?? 0), 0) / n;
      const composite = 0.45 * avgSim + 0.35 * avgOutcome + 0.20 * ((avgSentiment + 1) / 2);

      return {
        doctor_id: doctorId,
        doctor_name: exps[0].payload?.doctor_name,
        doctor_specialty: exps[0].payload?.doctor_specialty,
        doctor_hospital: exps[0].payload?.doctor_hospital,
        supporting_experiences: n,
        avg_similarity_score: +avgSim.toFixed(4),
        avg_outcome_score: +avgOutcome.toFixed(4),
        avg_sentiment_score: +avgSentiment.toFixed(4),
        avg_recovery_days: +avgRecovery.toFixed(1),
        composite_score: +composite.toFixed(4),
      };
    })
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, topN);
}

function buildRagContext(experiences: any[]): string {
  return experiences
    .map((e, i) => {
      const p = e.payload;
      return (
        `[Experience ${i + 1}]\n` +
        `Condition: ${p.condition} | Stage: ${p.stage} | Treatment: ${p.treatment_type}\n` +
        `Recovery: ${p.recovery_days} days | Outcome score: ${p.outcome_success_score?.toFixed(2)} | ` +
        `Sentiment: ${p.sentiment_score?.toFixed(2)}\n` +
        `Side effects: ${(p.side_effect_tags ?? []).join(", ")}\n` +
        `Doctor: ${p.doctor_name} (${p.doctor_specialty}) at ${p.doctor_hospital}\n` +
        `Patient: "${p.raw_text}"`
      );
    })
    .join("\n\n");
}

async function generateRagSummary(
  ragContext: string,
  doctors: any[],
  condition: string,
  stage: string,
  esiCategory: string
): Promise<any> {
  const tone = ESI_TONE[esiCategory] ?? ESI_TONE.calm;

  const systemPrompt = `You are CareLink's AI recommendation engine. You synthesize real patient experiences to help new patients make informed healthcare decisions.

Tone instruction: ${tone}

Return ONLY valid JSON — no markdown, no explanation. Use this exact shape:
{
  "key_strengths": string[],          // 3 bullet points about top doctor strengths
  "potential_concerns": string[],     // 2 honest concerns or caveats
  "typical_patient_profile": string,  // 1–2 sentences describing who these doctors work best for
  "recovery_time_summary": string,    // 1 sentence summarizing recovery range
  "confidence_level": number,         // 0–100, based on number and quality of supporting experiences
  "narrative": string                 // 2–3 sentence tone-adapted paragraph for the patient
}`;

  const userPrompt = `Condition: ${condition} | Stage: ${stage}
Top recommended doctors: ${doctors.map((d) => `${d.doctor_name} (composite score: ${d.composite_score})`).join(", ")}

Patient experiences retrieved:
${ragContext}`;

  const res = await fetch(GEMINI_GEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini generation failed: ${await res.text()}`);

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { narrative: cleaned, confidence_level: 50 };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      condition,
      stage,
      queryText,
      esiCategory = "calm",
      topK = 10,
    } = await req.json();

    if (!condition || !stage) {
      return NextResponse.json(
        { error: "condition and stage are required" },
        { status: 400 }
      );
    }

    const query =
      queryText ||
      `Patient seeking experiences for ${condition} at ${stage}. Looking for doctor recommendations and treatment outcomes.`;

    // 1. Embed
    const embedding = await getEmbedding(query);

    // 2. Retrieve from VectorDB
    const hits = await queryVectorDB(embedding, condition, stage, topK);

    // 3. Aggregate doctors
    const doctors = aggregateDoctors(hits, 3);

    // 4. Build RAG context
    const ragContext = buildRagContext(hits);

    // 5. Gemini RAG summary
    const ragSummary = await generateRagSummary(
      ragContext,
      doctors,
      condition,
      stage,
      esiCategory
    );

    return NextResponse.json({
      query: { condition, stage, queryText: query, esiCategory },
      retrieved_experiences: hits.map((e) => ({
        ...e.payload,
        similarity_score: e.score,
      })),
      doctor_recommendations: doctors,
      rag_summary: ragSummary,
      metadata: {
        total_experiences_retrieved: hits.length,
        total_doctors_surfaced: doctors.length,
        retrieval_model: EMBED_MODEL,
        generation_model: GEN_MODEL,
        similarity_metric: "cosine",
        esi_category: esiCategory,
      },
    });
  } catch (err: any) {
    console.error("CareLink /api/recommend error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
