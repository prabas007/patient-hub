/**
 * CareLink — Node.js VectorAI Integration
 * =========================================
 * Insert and query Actian VectorAI DB from a Node.js backend.
 *
 * Actian VectorAI uses a gRPC transport on port 50051. The official SDK
 * is Python-only (actiancortex). For Node.js backends, we communicate
 * via the REST bridge or, if your deployment wraps VectorAI behind a thin
 * Python FastAPI service, via that REST API.
 *
 * This file provides:
 *   1. A VectorAI REST bridge adapter (works when you run 06_rest_bridge.py)
 *   2. Example of the full CareLink RAG pipeline (Express route handler)
 *   3. Gemini embedding generation helper
 *
 * Installation
 * ────────────
 *   npm install axios @google/generative-ai
 *
 * Quick start
 * ───────────
 *   # 1. Start VectorAI DB
 *   docker compose up -d
 *
 *   # 2. Start Python REST bridge (bridges gRPC → HTTP for Node.js)
 *   pip install fastapi uvicorn actiancortex-0.1.0b1-py3-none-any.whl
 *   python 06_rest_bridge.py
 *
 *   # 3. Use from Node.js
 *   const carelink = require('./05_node_integration');
 *   await carelink.insertExperience(expObject);
 *   const results  = await carelink.queryExperiences({ condition: 'Breast Cancer', stage: 'Stage II' });
 */

"use strict";

const axios = require("axios");

// ── Config ────────────────────────────────────────────────────────────────────

const BRIDGE_URL   = process.env.VECTORAI_BRIDGE_URL || "http://localhost:8080";
const GEMINI_KEY   = process.env.GEMINI_API_KEY       || "";
const EMBEDDING_DIM = 768;


// ── Embedding ─────────────────────────────────────────────────────────────────

/**
 * Generate a normalised 768-dim embedding via Gemini API.
 * Falls back to a deterministic simulation if no API key is set.
 *
 * @param {string} text
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"} taskType
 * @returns {Promise<number[]>}
 */
async function getEmbedding(text, taskType = "RETRIEVAL_QUERY") {
  if (GEMINI_KEY) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genai = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType,
    });
    const vec = result.embedding.values;
    return normalise(vec);
  }

  // ── Simulation fallback ──
  return simulateEmbedding(text);
}

/** L2-normalise a float array. */
function normalise(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

/** Deterministic simulation matching Python 02_generate_data.py. */
function simulateEmbedding(text, dim = EMBEDDING_DIM) {
  // Simple seeded LCG — good enough for demos, not for production
  let seed = 0;
  for (let i = 0; i < Math.min(text.length, 80); i++) {
    seed = (seed + text.charCodeAt(i)) % 2147483647;
  }
  const vec = [];
  for (let i = 0; i < dim; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    vec.push(((seed / 0x7fffffff) - 0.5) * 2);
  }
  return normalise(vec);
}


// ── REST Bridge Client ────────────────────────────────────────────────────────
// Communicates with 06_rest_bridge.py, which proxies calls to CortexClient.

async function bridgePost(path, body) {
  const res = await axios.post(`${BRIDGE_URL}${path}`, body, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}


// ── Insert functions ──────────────────────────────────────────────────────────

/**
 * Insert a single patient experience.
 *
 * @param {{
 *   id: string,
 *   user_id: string,
 *   doctor_id: string,
 *   raw_text: string,
 *   condition: string,
 *   stage: string,
 *   treatment_type?: string,
 *   age_range?: string,
 *   location_region?: string,
 *   sentiment_score: number,
 *   recovery_days: number,
 *   side_effect_tags: string[],
 *   outcome_success_score: number,
 *   created_at: string,
 * }} experience
 */
async function insertExperience(experience) {
  const embedding = await getEmbedding(
    `${experience.condition} ${experience.stage} ${experience.treatment_type ?? ""} ${experience.raw_text}`,
    "RETRIEVAL_DOCUMENT"
  );

  return bridgePost("/upsert", {
    collection: "patient_experiences",
    id:         experienceIntId(experience.id),
    vector:     embedding,
    payload:    experience,
  });
}

/**
 * Batch insert patient experiences (more efficient for seeding).
 *
 * @param {Object[]} experiences
 */
async function batchInsertExperiences(experiences) {
  const ids      = experiences.map((_, i) => 10000 + i);
  const vectors  = await Promise.all(
    experiences.map((e) =>
      getEmbedding(
        `${e.condition} ${e.stage} ${e.treatment_type ?? ""} ${e.raw_text}`,
        "RETRIEVAL_DOCUMENT"
      )
    )
  );
  const payloads = experiences.map(({ embedding_vector, ...rest }) => rest);

  return bridgePost("/batch_upsert", {
    collection: "patient_experiences",
    ids,
    vectors,
    payloads,
  });
}

/**
 * Insert a doctor profile.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   specialty: string,
 *   hospital: string,
 *   location_region: string,
 *   years_experience: number,
 *   bio: string,
 * }} doctor
 */
async function insertDoctor(doctor) {
  const embedding = await getEmbedding(
    `${doctor.specialty} ${doctor.hospital} ${doctor.bio}`,
    "RETRIEVAL_DOCUMENT"
  );
  return bridgePost("/upsert", {
    collection: "doctor_profiles",
    id:         doctorIntId(doctor.id),
    vector:     embedding,
    payload:    doctor,
  });
}


// ── Query functions ───────────────────────────────────────────────────────────

/**
 * Retrieve the top-K most similar patient experiences for a given profile.
 *
 * @param {{
 *   queryText: string,          // free-text user description
 *   condition?: string,         // filter: exact condition name
 *   stage?: string,             // filter: exact stage
 *   treatmentType?: string,     // filter: exact treatment
 *   minOutcomeScore?: number,   // filter: minimum outcome score (0–1)
 *   topK?: number,              // default: 5
 * }} params
 * @returns {Promise<Object[]>}  experiences sorted by similarity desc
 */
async function queryExperiences({
  queryText,
  condition,
  stage,
  treatmentType,
  minOutcomeScore = 0.0,
  topK            = 5,
}) {
  const embedding = await getEmbedding(queryText, "RETRIEVAL_QUERY");

  // Build filter payload — only include clauses that were specified
  const filters = [];
  if (condition)                    filters.push({ field: "condition",             op: "eq",  value: condition });
  if (stage)                        filters.push({ field: "stage",                 op: "eq",  value: stage });
  if (treatmentType)                filters.push({ field: "treatment_type",        op: "eq",  value: treatmentType });
  if (minOutcomeScore > 0)          filters.push({ field: "outcome_success_score", op: "gte", value: minOutcomeScore });

  const endpoint = filters.length ? "/search_filtered" : "/search";
  const body     = {
    collection: "patient_experiences",
    query:      embedding,
    top_k:      topK,
    ...(filters.length && { filters }),
  };

  const results = await bridgePost(endpoint, body);

  // Sort by score descending
  return (results.hits || []).sort((a, b) => b.score - a.score);
}

/**
 * Aggregate doctor recommendations from retrieved experiences.
 *
 * @param {Object[]} experiences  — result of queryExperiences()
 * @param {number}   topN         — how many doctors to return
 * @returns {Object[]}
 */
function aggregateDoctors(experiences, topN = 3) {
  const buckets = {};
  for (const exp of experiences) {
    const did = exp.payload?.doctor_id;
    if (!did) continue;
    if (!buckets[did]) buckets[did] = [];
    buckets[did].push(exp);
  }

  const ranked = Object.entries(buckets).map(([doctorId, exps]) => {
    const n           = exps.length;
    const avgSim      = exps.reduce((s, e) => s + e.score, 0) / n;
    const avgOutcome  = exps.reduce((s, e) => s + (e.payload?.outcome_success_score ?? 0), 0) / n;
    const avgSentimen = exps.reduce((s, e) => s + (e.payload?.sentiment_score ?? 0), 0) / n;
    const avgRecovery = exps.reduce((s, e) => s + (e.payload?.recovery_days ?? 0), 0) / n;
    const composite   = 0.45 * avgSim + 0.35 * avgOutcome + 0.20 * ((avgSentimen + 1) / 2);

    return {
      doctor_id:              doctorId,
      doctor_name:            exps[0].payload?.doctor_name,
      doctor_specialty:       exps[0].payload?.doctor_specialty,
      doctor_hospital:        exps[0].payload?.doctor_hospital,
      supporting_experiences: n,
      avg_similarity_score:   +avgSim.toFixed(4),
      avg_outcome_score:      +avgOutcome.toFixed(4),
      avg_sentiment_score:    +avgSentimen.toFixed(4),
      avg_recovery_days:      +avgRecovery.toFixed(1),
      composite_score:        +composite.toFixed(4),
    };
  });

  return ranked.sort((a, b) => b.composite_score - a.composite_score).slice(0, topN);
}


// ── Full RAG pipeline (Express handler) ──────────────────────────────────────

/**
 * Express route handler for the CareLink doctor recommendation endpoint.
 *
 * POST /api/recommend
 * Body: { userId, condition, stage, queryText? }
 *
 * @example
 * // In your Express app:
 * const { recommendDoctors } = require('./05_node_integration');
 * app.post('/api/recommend', recommendDoctors);
 */
async function recommendDoctors(req, res) {
  const { userId, condition, stage, queryText, topK = 5 } = req.body;

  if (!condition || !stage) {
    return res.status(400).json({ error: "condition and stage are required" });
  }

  const query = queryText ||
    `Patient seeking experiences for ${condition} at ${stage} stage.`;

  try {
    // 1. Retrieve similar experiences
    const experiences = await queryExperiences({
      queryText: query,
      condition,
      stage,
      topK,
    });

    // 2. Aggregate doctors
    const doctors = aggregateDoctors(experiences, 3);

    // 3. Build RAG context for LLM summarisation
    const ragContext = experiences
      .map((e, i) => {
        const p = e.payload;
        return (
          `[${i + 1}] ${p.condition} / ${p.stage} | ` +
          `Treatment: ${p.treatment_type} | Recovery: ${p.recovery_days}d | ` +
          `Outcome: ${p.outcome_success_score?.toFixed(2)} | ` +
          `Sentiment: ${p.sentiment_score?.toFixed(2)}\n` +
          `   "${p.raw_text}"`
        );
      })
      .join("\n\n");

    return res.json({
      query:                    { userId, condition, stage, queryText: query },
      retrieved_experiences:    experiences.map((e) => ({
        ...e.payload,
        similarity_score: e.score,
      })),
      doctor_recommendations:   doctors,
      rag_context:              ragContext,
      metadata: {
        total_experiences_retrieved: experiences.length,
        total_doctors_surfaced:      doctors.length,
        retrieval_model:             "text-embedding-004",
        similarity_metric:           "cosine",
      },
    });

  } catch (err) {
    console.error("CareLink recommendation error:", err);
    return res.status(500).json({ error: err.message });
  }
}


// ── ID helpers ────────────────────────────────────────────────────────────────
// VectorAI uses integer IDs. Map UUID → stable int via hash.

function experienceIntId(uuidStr) {
  return 10000 + (simpleHash(uuidStr) % 90000);
}
function doctorIntId(uuidStr) {
  return simpleHash(uuidStr) % 10000;
}
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}


// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getEmbedding,
  insertExperience,
  batchInsertExperiences,
  insertDoctor,
  queryExperiences,
  aggregateDoctors,
  recommendDoctors,   // Express route handler
};
