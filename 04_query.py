"""
CareLink — Vector Query & Retrieval Engine
============================================
Semantic retrieval of patient experiences for the RAG doctor recommendation
pipeline, powered by Actian VectorAI DB.

Key functions
─────────────
  retrieve_similar_experiences()   – filtered ANN search on patient_experiences
  retrieve_similar_doctors()       – ANN search on doctor_profiles
  aggregate_doctor_recommendations() – rank doctors from retrieved experiences
  build_rag_payload()              – structured JSON ready for LLM injection
  run_demo_query()                 – end-to-end demo with sample output

Similarity metric:  COSINE (all vectors are L2-normalised)
Index type:         HNSW (configured in 01_schema.py)

Usage
─────
  python 04_query.py
  python 04_query.py --condition "Breast Cancer" --stage "Stage II" --top-k 5
  python 04_query.py --condition "Depression" --stage "Severe" --top-k 8

Prerequisites
─────────────
  1. docker compose up -d
  2. python 01_schema.py  &&  python 02_generate_data.py  &&  python 03_insert.py
  4. pip install actiancortex-0.1.0b1-py3-none-any.whl numpy

Environment variables
─────────────────────
  VECTORAI_HOST   default: localhost:50051
  GEMINI_API_KEY  optional — enables real Gemini embeddings
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from typing import Optional

import numpy as np

from cortex import CortexClient
from cortex.filters import Filter, Field

VECTORAI_HOST = os.getenv("VECTORAI_HOST", "localhost:50051")


# ── Embedding utilities ───────────────────────────────────────────────────────

def get_query_embedding(text: str, dim: int = 768) -> list:
    """
    Return a normalised 768-dim query embedding.

    Uses the Gemini API when GEMINI_API_KEY is set, otherwise falls back to
    the deterministic simulation used in data generation.

    Gemini note: use task_type="RETRIEVAL_QUERY" for queries and
    task_type="RETRIEVAL_DOCUMENT" for documents being indexed.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            res = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="RETRIEVAL_QUERY",
            )
            vec = np.array(res["embedding"], dtype=np.float32)
            vec /= np.linalg.norm(vec)
            return vec.tolist()
        except Exception as exc:
            print(f"  ⚠  Gemini API error ({exc}), falling back to simulation")

    # Simulated embedding (identical algorithm to 02_generate_data.py)
    seed = sum(ord(c) for c in text[:80]) % (2 ** 31)
    rng  = np.random.default_rng(seed)
    vec  = rng.standard_normal(dim).astype(np.float32)
    vec /= np.linalg.norm(vec)
    return vec.tolist()


# ── Core retrieval ────────────────────────────────────────────────────────────

def retrieve_similar_experiences(
    client:               CortexClient,
    query_embedding:      list,
    condition:            Optional[str] = None,
    stage:                Optional[str] = None,
    treatment_type:       Optional[str] = None,
    min_outcome_score:    float         = 0.0,
    top_k:                int           = 10,
) -> list[dict]:
    """
    Top-K ANN search over patient_experiences with optional metadata filters.

    Actian VectorAI Filter DSL is used to push condition/stage/outcome
    predicates into the index scan so only matching vectors are ranked.

    Parameters
    ──────────
    client            : Active CortexClient connection
    query_embedding   : Normalised 768-dim vector (user profile or free-text query)
    condition         : Exact match on 'condition' payload field (e.g. "Breast Cancer")
    stage             : Exact match on 'stage' payload field   (e.g. "Stage II")
    treatment_type    : Optional exact match on 'treatment_type'
    min_outcome_score : Exclude experiences below this 0–1 threshold
    top_k             : Number of nearest neighbours to return

    Returns
    ───────
    List of dicts — each contains all payload fields plus 'similarity_score'
    (cosine similarity, 0–1, higher is better).
    """
    # Build filter — only add clauses that were specified
    f = Filter()

    if condition:
        f = f.must(Field("condition").eq(condition))
    if stage:
        f = f.must(Field("stage").eq(stage))
    if treatment_type:
        f = f.must(Field("treatment_type").eq(treatment_type))
    if min_outcome_score > 0.0:
        f = f.must(Field("outcome_success_score").range(gte=min_outcome_score))

    has_filters = any([condition, stage, treatment_type, min_outcome_score > 0.0])

    if has_filters:
        raw_results = client.search_filtered(
            collection = "patient_experiences",
            query      = query_embedding,
            filter     = f,
            top_k      = top_k,
        )
    else:
        raw_results = client.search(
            collection = "patient_experiences",
            query      = query_embedding,
            top_k      = top_k,
        )

    results = []
    for r in raw_results:
        entry = dict(r.payload)               # all metadata fields
        entry["_vector_id"]       = r.id      # VectorAI integer ID
        entry["similarity_score"] = round(float(r.score), 6)
        results.append(entry)

    # Sort by similarity descending (VectorAI returns COSINE distance;
    # score = 1 − distance, so higher is more similar)
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results


def retrieve_similar_doctors(
    client:          CortexClient,
    query_embedding: list,
    specialty:       Optional[str] = None,
    top_k:           int           = 5,
) -> list[dict]:
    """
    Semantic search over doctor_profiles.
    Optionally filter by specialty.
    """
    if specialty:
        f       = Filter().must(Field("specialty").eq(specialty))
        raw     = client.search_filtered(
            "doctor_profiles", query_embedding, f, top_k=top_k
        )
    else:
        raw = client.search("doctor_profiles", query_embedding, top_k=top_k)

    results = []
    for r in raw:
        entry = dict(r.payload)
        entry["_vector_id"]       = r.id
        entry["similarity_score"] = round(float(r.score), 6)
        results.append(entry)

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results


# ── Doctor aggregation ────────────────────────────────────────────────────────

def aggregate_doctor_recommendations(
    experiences: list[dict],
    top_n:       int = 3,
) -> list[dict]:
    """
    Rank doctors surfaced by retrieved experiences using a composite score:

        composite = 0.45 × avg_similarity
                  + 0.35 × avg_outcome_success_score
                  + 0.20 × normalised_avg_sentiment   (−1..1 → 0..1)

    Weights reflect the CareLink product priority:
      similarity > clinical outcome > patient sentiment
    """
    buckets: dict[str, list] = defaultdict(list)
    for exp in experiences:
        did = exp.get("doctor_id")
        if did:
            buckets[did].append(exp)

    ranked = []
    for doctor_id, exps in buckets.items():
        n           = len(exps)
        avg_sim     = sum(e["similarity_score"]        for e in exps) / n
        avg_outcome = sum(e["outcome_success_score"]   for e in exps) / n
        avg_sent    = sum(e["sentiment_score"]         for e in exps) / n
        avg_recovery= sum(e["recovery_days"]           for e in exps) / n

        composite = (
            0.45 * avg_sim +
            0.35 * avg_outcome +
            0.20 * ((avg_sent + 1.0) / 2.0)   # normalise to [0,1]
        )

        ranked.append({
            "doctor_id":               doctor_id,
            "doctor_name":             exps[0].get("doctor_name"),
            "doctor_specialty":        exps[0].get("doctor_specialty"),
            "doctor_hospital":         exps[0].get("doctor_hospital"),
            "doctor_region":           exps[0].get("doctor_region"),
            "supporting_experiences":  n,
            "avg_similarity_score":    round(avg_sim, 4),
            "avg_outcome_score":       round(avg_outcome, 4),
            "avg_sentiment_score":     round(avg_sent, 4),
            "avg_recovery_days":       round(avg_recovery, 1),
            "composite_score":         round(composite, 4),
        })

    ranked.sort(key=lambda x: x["composite_score"], reverse=True)
    return ranked[:top_n]


# ── RAG payload builder ───────────────────────────────────────────────────────

def build_rag_payload(
    query_text:  str,
    experiences: list[dict],
    doctors:     list[dict],
    condition:   Optional[str] = None,
    stage:       Optional[str] = None,
) -> dict:
    """
    Constructs a structured JSON payload ready for:
      • LLM summarisation  (rag_context injected into system prompt)
      • Frontend rendering (doctor recommendation cards)
      • Audit / logging
    """
    # Strip internal keys before serialising
    clean_exps = [
        {k: v for k, v in e.items() if not k.startswith("_")}
        for e in experiences
    ]

    return {
        "query": {
            "text":      query_text,
            "condition": condition,
            "stage":     stage,
        },
        "retrieved_experiences":  clean_exps,
        "doctor_recommendations": doctors,
        "rag_context":            _build_rag_context(experiences),
        "metadata": {
            "total_experiences_retrieved": len(experiences),
            "total_doctors_surfaced":      len(doctors),
            "retrieval_model":             "text-embedding-004",
            "similarity_metric":           "cosine",
            "index_type":                  "HNSW",
        },
    }


def _build_rag_context(experiences: list[dict]) -> str:
    """
    Flattened context string for direct injection into an LLM prompt.
    Each entry is one paragraph, ordered by similarity score (highest first).
    """
    lines = []
    for i, e in enumerate(experiences, 1):
        lines.append(
            f"[Experience {i}]  "
            f"Condition: {e.get('condition')} | Stage: {e.get('stage')} | "
            f"Treatment: {e.get('treatment_type', 'N/A')} | "
            f"Recovery: {e.get('recovery_days')} days | "
            f"Outcome score: {e.get('outcome_success_score', 0):.2f} | "
            f"Sentiment: {e.get('sentiment_score', 0):+.2f} | "
            f"Side effects: {', '.join(e.get('side_effect_tags', []))} | "
            f"Similarity: {e.get('similarity_score', 0):.4f}\n"
            f"   Patient account: \"{e.get('raw_text', '')}\""
        )
    return "\n\n".join(lines)


# ── Demo ──────────────────────────────────────────────────────────────────────

def run_demo_query(
    host:      str  = VECTORAI_HOST,
    condition: str  = "Breast Cancer",
    stage:     str  = "Stage II",
    top_k:     int  = 5,
):
    print(f"\n{'═'*62}")
    print(f"  CareLink RAG — Semantic Retrieval Demo")
    print(f"{'═'*62}")
    print(f"  Condition : {condition}")
    print(f"  Stage     : {stage}")
    print(f"  Top-K     : {top_k}")
    print(f"{'═'*62}\n")

    # Build user profile embedding
    query_text = (
        f"I am a patient recently diagnosed with {condition}, {stage}. "
        f"I am looking for treatment experiences and doctor recommendations "
        f"from others who have been through similar journeys."
    )
    print("🔍  Generating query embedding …")
    query_emb = get_query_embedding(query_text)

    print(f"🔌  Connecting to Actian VectorAI DB at {host} …")
    try:
        with CortexClient(host) as client:
            version, uptime = client.health_check()
            print(f"✅  Connected — {version}, uptime {uptime}s\n")

            print("🔎  Retrieving similar experiences …")
            experiences = retrieve_similar_experiences(
                client            = client,
                query_embedding   = query_emb,
                condition         = condition,
                stage             = stage,
                min_outcome_score = 0.0,
                top_k             = top_k,
            )

            doctors = aggregate_doctor_recommendations(experiences, top_n=3)

            payload = build_rag_payload(
                query_text   = query_text,
                experiences  = experiences,
                doctors      = doctors,
                condition    = condition,
                stage        = stage,
            )

    except Exception as exc:
        print(f"\n❌  DB connection failed: {exc}")
        print("    Falling back to OFFLINE DEMO with synthetic data.\n")
        payload = _offline_demo(query_text, condition, stage, top_k)

    # Print results
    exps  = payload["retrieved_experiences"]
    docs  = payload["doctor_recommendations"]

    print(f"\n{'─'*62}")
    print(f"  📋  Retrieved {len(exps)} experiences")
    print(f"{'─'*62}")
    for i, e in enumerate(exps, 1):
        print(
            f"  [{i}] similarity={e['similarity_score']:.4f} | "
            f"outcome={e['outcome_success_score']:.2f} | "
            f"sentiment={e['sentiment_score']:+.2f} | "
            f"recovery={e['recovery_days']}d"
        )
        print(f"       doctor_id={e.get('doctor_id')}")
        print(f"       treatment={e.get('treatment_type')} | "
              f"side_effects={e.get('side_effect_tags')}")
        print()

    print(f"{'─'*62}")
    print(f"  🏥  Top Doctor Recommendations")
    print(f"{'─'*62}")
    for i, d in enumerate(docs, 1):
        print(f"  [{i}] {d.get('doctor_name', d['doctor_id'])}")
        print(f"       specialty={d.get('doctor_specialty')} | "
              f"hospital={d.get('doctor_hospital')}")
        print(f"       composite={d['composite_score']:.4f} | "
              f"avg_outcome={d['avg_outcome_score']:.2f} | "
              f"supporting_exp={d['supporting_experiences']}")
        print()

    print(f"{'─'*62}")
    print(f"  📦  RAG context snippet (first 800 chars):")
    print(f"{'─'*62}")
    print(payload["rag_context"][:800])
    print("  …")

    out_file = "carelink_query_output.json"
    with open(out_file, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"\n✅  Full payload saved → {out_file}")


# ── Offline demo (no DB required) ────────────────────────────────────────────

def _offline_demo(
    query_text: str, condition: str, stage: str, top_k: int
) -> dict:
    """Generate a plausible synthetic demo payload without a live DB."""
    import random, uuid
    rng = random.Random(7)

    treatments = {
        "Breast Cancer": ["Chemotherapy", "Radiation", "Hormone Therapy", "Surgery"],
        "Depression":    ["SSRIs", "Therapy", "TMS", "SNRIs"],
    }.get(condition, ["Treatment A", "Treatment B", "Treatment C"])

    side_effects_pool = ["nausea", "fatigue", "hair_loss", "neuropathy",
                          "hot_flashes", "weight_changes"]

    doctor_ids   = [str(uuid.uuid4()) for _ in range(3)]
    doctor_names = ["Dr. Sarah Chen", "Dr. Marcus Webb", "Dr. Priya Nair"]
    specialties  = ["Oncology", "Surgical Oncology", "Radiation Oncology"]
    hospitals    = ["Mayo Clinic", "Johns Hopkins Hospital", "Cleveland Clinic"]

    experiences = []
    for i in range(top_k):
        outcome   = round(rng.uniform(0.45, 0.97), 3)
        sentiment = round((outcome - 0.5) * 1.6 + rng.uniform(-0.12, 0.12), 3)
        sentiment = max(-1.0, min(1.0, sentiment))
        recovery  = rng.randint(60, 400)
        doc_idx   = i % 3
        treatment = rng.choice(treatments)
        effects   = rng.sample(side_effects_pool, 2)

        experiences.append({
            "id":                    str(uuid.uuid4()),
            "user_id":               str(uuid.uuid4()),
            "doctor_id":             doctor_ids[doc_idx],
            "doctor_name":           doctor_names[doc_idx],
            "doctor_specialty":      specialties[doc_idx],
            "doctor_hospital":       hospitals[doc_idx],
            "condition":             condition,
            "stage":                 stage,
            "treatment_type":        treatment,
            "age_range":             rng.choice(["35-44", "45-54", "55-64"]),
            "location_region":       rng.choice(["Northeast US", "Midwest US"]),
            "recovery_days":         recovery,
            "sentiment_score":       round(sentiment, 3),
            "side_effect_tags":      effects,
            "outcome_success_score": outcome,
            "similarity_score":      round(rng.uniform(0.72, 0.96), 4),
            "raw_text": (
                f"I was diagnosed with {condition} ({stage}) and underwent "
                f"{treatment}. Recovery took {recovery} days. "
                f"Side effects included {', '.join(effects)}."
            ),
        })

    experiences.sort(key=lambda x: x["similarity_score"], reverse=True)
    doctors = aggregate_doctor_recommendations(experiences, top_n=3)
    payload = build_rag_payload(query_text, experiences, doctors, condition, stage)
    payload["metadata"]["source"] = "OFFLINE_DEMO — synthetic data"
    return payload


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="CareLink VectorAI — semantic retrieval demo"
    )
    parser.add_argument("--condition", default="Breast Cancer")
    parser.add_argument("--stage",     default="Stage II")
    parser.add_argument("--top-k",     type=int, default=5)
    parser.add_argument("--host",      default=VECTORAI_HOST)
    args = parser.parse_args()

    run_demo_query(
        host      = args.host,
        condition = args.condition,
        stage     = args.stage,
        top_k     = args.top_k,
    )
