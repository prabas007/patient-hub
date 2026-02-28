"""
CareLink — Actian VectorAI DB Schema Setup
===========================================
Creates all collections (tables) needed by the CareLink intelligence layer.

Actian VectorAI stores vectors + arbitrary JSON payloads in "collections".
There is no SQL DDL; schema is defined by the collection parameters you pass
to create_collection().

Collections created
───────────────────
  patient_experiences   768-dim COSINE  (core RAG memory)
  doctor_profiles       768-dim COSINE  (doctor semantic search)
  circle_posts          768-dim COSINE  (future: community circles)
  emotional_states      768-dim COSINE  (future: Presage adaptive UI)

Prerequisites
─────────────
  1. Docker running:  docker compose up -d
     (uses docker-compose.yml from the repo root)
  2. pip install actiancortex-0.1.0b1-py3-none-any.whl

Usage
─────
  python 01_schema.py               # create all collections
  python 01_schema.py --drop-first  # recreate (wipe + create)
"""

import argparse
import sys
from cortex import CortexClient, DistanceMetric

# ── Config ────────────────────────────────────────────────────────────────────

VECTORAI_HOST = "localhost:50051"   # override with env var VECTORAI_HOST
EMBEDDING_DIM = 768                 # Gemini text-embedding-004 output dimension

# HNSW tuning — balance recall vs. speed
HNSW_M             = 16    # edges per node        (higher → better recall, more RAM)
HNSW_EF_CONSTRUCT  = 200   # build-time candidates (higher → better index quality)
HNSW_EF_SEARCH     = 100   # query-time candidates (higher → better recall)

# ── Collection definitions ────────────────────────────────────────────────────
# Each dict maps to a create_collection() call.
# "payload_schema" is documentation only — VectorAI accepts free-form JSON payloads.

COLLECTIONS = [
    {
        "name":        "patient_experiences",
        "description": "Core RAG memory: patient experience narratives + outcome metadata.",
        "payload_schema": {
            # identifiers
            "user_id":               "string (uuid)",
            "doctor_id":             "string (uuid)",
            # narrative
            "raw_text":              "string",
            # medical metadata
            "condition":             "string  — e.g. 'Breast Cancer'",
            "stage":                 "string  — e.g. 'Stage II'",
            "treatment_type":        "string  — e.g. 'Chemotherapy'  [future-proof]",
            "age_range":             "string  — e.g. '35-44'         [future-proof]",
            "location_region":       "string  — e.g. 'Northeast US'  [future-proof]",
            # outcome metrics (extracted by Gemini)
            "sentiment_score":       "float   — -1.0 to 1.0",
            "recovery_days":         "integer — >= 0",
            "side_effect_tags":      "list[string]",
            "outcome_success_score": "float   — 0.0 to 1.0",
            # timestamps
            "created_at":            "ISO-8601 string",
        },
    },
    {
        "name":        "doctor_profiles",
        "description": "Doctor semantic profiles for recommendation aggregation.",
        "payload_schema": {
            "name":             "string",
            "specialty":        "string",
            "hospital":         "string",
            "location_region":  "string",
            "years_experience": "integer",
            "bio":              "string",
            "created_at":       "ISO-8601 string",
        },
    },
    {
        "name":        "circle_posts",
        "description": "Future: community posts inside condition-specific circles.",
        "payload_schema": {
            "circle_id":      "string (uuid)",
            "user_id":        "string (uuid)",
            "raw_text":       "string",
            "sentiment_score":"float — -1.0 to 1.0",
            "created_at":     "ISO-8601 string",
        },
    },
    {
        "name":        "emotional_states",
        "description": "Future: Presage emotional embeddings for adaptive UI personalisation.",
        "payload_schema": {
            "user_id":       "string (uuid)",
            "session_id":    "string (uuid)",
            "emotion_label": "string — e.g. 'anxious', 'hopeful'",
            "arousal":       "float  — 0.0 to 1.0",
            "valence":       "float  — -1.0 to 1.0",
            "recorded_at":   "ISO-8601 string",
        },
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def create_all(client: CortexClient, drop_first: bool = False) -> None:
    for coll in COLLECTIONS:
        name = coll["name"]

        if drop_first and client.has_collection(name):
            client.delete_collection(name)
            print(f"  🗑  Dropped existing collection: {name}")

        if client.has_collection(name):
            print(f"  ✓  Already exists (skip):        {name}")
            continue

        client.create_collection(
            name             = name,
            dimension        = EMBEDDING_DIM,
            distance_metric  = DistanceMetric.COSINE,
            hnsw_m           = HNSW_M,
            hnsw_ef_construct= HNSW_EF_CONSTRUCT,
            hnsw_ef_search   = HNSW_EF_SEARCH,
        )
        print(f"  ✅  Created collection:            {name}")
        print(f"      desc  : {coll['description']}")
        print(f"      dim   : {EMBEDDING_DIM}  |  metric: COSINE")
        print(f"      HNSW  : m={HNSW_M}, ef_construct={HNSW_EF_CONSTRUCT}, ef_search={HNSW_EF_SEARCH}")
        print()


def verify(client: CortexClient) -> None:
    print("\n🔍  Verifying collections:")
    for coll in COLLECTIONS:
        name    = coll["name"]
        exists  = client.has_collection(name)
        status  = "✅" if exists else "❌"
        count   = client.count(name) if exists else "—"
        print(f"  {status}  {name:<30}  vectors: {count}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareLink — Create Actian VectorAI collections"
    )
    parser.add_argument(
        "--drop-first", action="store_true",
        help="Delete existing collections before re-creating them (destructive!)"
    )
    parser.add_argument(
        "--host", default=VECTORAI_HOST,
        help=f"VectorAI DB address (default: {VECTORAI_HOST})"
    )
    args = parser.parse_args()

    print(f"🔌  Connecting to Actian VectorAI DB at {args.host} …")
    try:
        with CortexClient(args.host) as client:
            version, uptime = client.health_check()
            print(f"✅  Connected — server {version}, uptime {uptime}s\n")

            print("📦  Creating CareLink collections:")
            create_all(client, drop_first=args.drop_first)
            verify(client)

    except Exception as exc:
        print(f"\n❌  Error: {exc}")
        print(
            "\nTroubleshooting:\n"
            "  1. Is the Docker container running?  →  docker compose up -d\n"
            "  2. Is port 50051 accessible?\n"
            "  3. Is actiancortex installed?        →  pip install actiancortex-0.1.0b1-py3-none-any.whl\n"
        )
        sys.exit(1)

    print("\n🎉  Schema setup complete. Run 02_generate_data.py next.")


if __name__ == "__main__":
    main()
