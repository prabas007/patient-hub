# CareLink — Actian VectorAI DB Integration
## The Intelligence Memory Layer

---

## What this is

This package is the **vector memory foundation** for CareLink's RAG-powered doctor recommendation pipeline. It connects patient experience narratives, outcome data, and doctor profiles to Actian VectorAI DB so that any new patient query can instantly surface the most semantically similar past experiences and produce ranked doctor recommendations.

---

## Repository layout

```
carelink_vectordb/
├── 01_schema.py              # Create all VectorAI collections
├── 02_generate_data.py       # Generate realistic fake seed data
├── 03_insert.py              # Insert vectors + metadata into VectorAI
├── 04_query.py               # Query engine + RAG payload builder
├── 05_node_integration.js    # Node.js REST client for the pipeline
├── 06_rest_bridge.py         # Python FastAPI bridge (gRPC → HTTP)
├── docker-compose.yml        # VectorAI DB + bridge services
├── Dockerfile.bridge         # Docker image for the REST bridge
└── carelink_query_output.json  # Sample output (Breast Cancer / Stage II)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CareLink Backend                            │
│                                                                     │
│  Node.js API server                                                 │
│    │                                                                │
│    │ POST /api/recommend                                            │
│    ▼                                                                │
│  05_node_integration.js                                             │
│    │  1. Get Gemini embedding for user query                        │
│    │  2. POST /search_filtered  ──────────────────────────────────► │
│    │                                          06_rest_bridge.py     │
│    │                                          (FastAPI on :8080)    │
│    │                                                │               │
│    │                                          CortexClient (gRPC)   │
│    │                                                │               │
│    │                                          Actian VectorAI DB    │
│    │                                          (port 50051)          │
│    │◄─────────────────────────────────────────────                  │
│    │  3. Aggregate doctors (composite score)                        │
│    │  4. Build RAG context string                                   │
│    │  5. Inject into Gemini / Claude prompt                         │
│    │  6. Return structured JSON to frontend                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Collections

| Collection | Vectors | Purpose |
|---|---|---|
| `patient_experiences` | 768-dim COSINE | Core RAG memory — patient narratives + outcome metadata |
| `doctor_profiles` | 768-dim COSINE | Doctor semantic matching |
| `circle_posts` | 768-dim COSINE | Future: community post search |
| `emotional_states` | 768-dim COSINE | Future: Presage adaptive UI embeddings |

All collections use **HNSW indexing** with:
- `m = 16` — graph connectivity
- `ef_construct = 200` — build-time quality
- `ef_search = 100` — query-time recall vs. speed balance

---

## Quick Start

### 1. Start Actian VectorAI DB

```bash
# Clone the SDK repo
git clone https://github.com/hackmamba-io/actian-vectorAI-db-beta
cd actian-vectorAI-db-beta

# Load the DB image (you need Actian_VectorAI_DB_Beta.tar from Actian)
docker image load -i Actian_VectorAI_DB_Beta.tar

# Start the DB (or use docker compose up -d from this package)
docker compose up -d

# Verify it's running
docker logs vectoraidb
```

### 2. Install the Python SDK

```bash
pip install actiancortex-0.1.0b1-py3-none-any.whl
pip install numpy fastapi uvicorn  # for the bridge
```

### 3. Run the pipeline

```bash
# Create collections
python 01_schema.py

# Generate 60 fake patient experiences + 15 doctors + 20 circle posts
python 02_generate_data.py

# Insert into VectorAI DB
python 03_insert.py

# Run a demo query (Breast Cancer / Stage II)
python 04_query.py --condition "Breast Cancer" --stage "Stage II" --top-k 5

# Start the REST bridge for Node.js
python 06_rest_bridge.py
```

---

## How the RAG pipeline works

```
1. USER INPUT
   Patient submits profile: condition + stage + free-text description

2. EMBEDDING
   Gemini text-embedding-004 (task_type="RETRIEVAL_QUERY")
   → 768-dim normalised vector

3. VECTOR SEARCH
   CortexClient.search_filtered(
       collection = "patient_experiences",
       query      = user_embedding,
       filter     = condition == "Breast Cancer" AND stage == "Stage II",
       top_k      = 10
   )
   → Returns top-10 results sorted by cosine similarity

4. DOCTOR AGGREGATION
   Group results by doctor_id
   For each doctor compute composite score:
     score = 0.45 × avg_cosine_similarity
           + 0.35 × avg_outcome_success_score
           + 0.20 × normalised_avg_sentiment

5. RAG CONTEXT INJECTION
   Format top experiences as structured text →
   inject into Gemini / Claude system prompt

6. LLM SUMMARISATION
   LLM synthesises personalised recommendations:
   "Based on 10 similar patient journeys with Stage II Breast Cancer…"

7. RESPONSE
   Structured JSON: experiences + doctor_recommendations + narrative summary
```

---

## Sample Output

**Input:** Breast Cancer / Stage II, top-5

```json
{
  "query": {
    "condition": "Breast Cancer",
    "stage": "Stage II"
  },
  "retrieved_experiences": [
    {
      "condition": "Breast Cancer",
      "stage": "Stage II",
      "treatment_type": "Chemotherapy",
      "recovery_days": 174,
      "sentiment_score": -0.015,
      "side_effect_tags": ["hot_flashes", "lymphedema"],
      "outcome_success_score": 0.481,
      "similarity_score": 0.9543,
      "doctor_id": "ebc8a7b6-4b79-4130-998c-d4ddfbde0a9c"
    },
    {
      "condition": "Breast Cancer",
      "stage": "Stage II",
      "treatment_type": "Surgery",
      "recovery_days": 104,
      "sentiment_score": 0.608,
      "side_effect_tags": ["neuropathy", "nausea"],
      "outcome_success_score": 0.923,
      "similarity_score": 0.8523,
      "doctor_id": "c98d9272-94ad-4e90-ac52-7eef87520d76"
    }
  ],
  "doctor_recommendations": [
    {
      "doctor_name": "Dr. Marcus Webb",
      "doctor_specialty": "Surgical Oncology",
      "doctor_hospital": "Johns Hopkins Hospital",
      "composite_score": 0.8397,
      "avg_outcome_score": 0.864,
      "avg_recovery_days": 228.0,
      "supporting_experiences": 2
    }
  ]
}
```

Full sample output: `carelink_query_output.json`

---

## Payload fields in VectorAI

Actian VectorAI stores a free-form JSON **payload** alongside each vector.
CareLink stores the following fields per collection:

### `patient_experiences`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Experience UUID |
| `user_id` | string (UUID) | Patient UUID |
| `doctor_id` | string (UUID) | Treating doctor UUID |
| `raw_text` | string | Full patient narrative |
| `condition` | string | e.g. "Breast Cancer" |
| `stage` | string | e.g. "Stage II" |
| `treatment_type` | string | e.g. "Chemotherapy" |
| `age_range` | string | e.g. "35-44" |
| `location_region` | string | e.g. "Northeast US" |
| `sentiment_score` | float −1..1 | Gemini-extracted sentiment |
| `recovery_days` | integer | Days to recovery |
| `side_effect_tags` | string[] | e.g. ["nausea", "fatigue"] |
| `outcome_success_score` | float 0..1 | Gemini-extracted outcome |
| `created_at` | ISO-8601 | Timestamp |

### `doctor_profiles`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Doctor UUID |
| `name` | string | Full name |
| `specialty` | string | Medical specialty |
| `hospital` | string | Affiliated hospital |
| `location_region` | string | Geographic region |
| `years_experience` | integer | Clinical experience |
| `bio` | string | Narrative biography |

---

## Filter DSL cheatsheet

```python
from cortex.filters import Filter, Field

# Single condition
f = Filter().must(Field("condition").eq("Breast Cancer"))

# Condition + stage
f = (Filter()
     .must(Field("condition").eq("Breast Cancer"))
     .must(Field("stage").eq("Stage II")))

# Outcome threshold
f = (Filter()
     .must(Field("condition").eq("Type 2 Diabetes"))
     .must(Field("outcome_success_score").range(gte=0.6)))

# Pass to search
results = client.search_filtered("patient_experiences", query_vec, f, top_k=10)
```

---

## Production embedding (Gemini API)

Replace `simulate_embedding()` in `02_generate_data.py` and `get_query_embedding()` in `04_query.py`:

```python
import google.generativeai as genai
import numpy as np
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

def embed_document(text: str) -> list[float]:
    res = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_DOCUMENT",
    )
    vec = np.array(res["embedding"], dtype=np.float32)
    return (vec / np.linalg.norm(vec)).tolist()   # normalise!

def embed_query(text: str) -> list[float]:
    res = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_QUERY",
    )
    vec = np.array(res["embedding"], dtype=np.float32)
    return (vec / np.linalg.norm(vec)).tolist()
```

---

## Future-proofing notes

| Feature | How to extend |
|---|---|
| **Circle post search** | `circle_posts` collection is already created. Insert with `batch_upsert`, query with `search_filtered(Field("circle_id").eq(...))` |
| **Presage emotional embeddings** | `emotional_states` collection is ready. Embed `emotion_label + arousal + valence` text, insert, query by `user_id` to personalise UI tone |
| **Location-aware search** | `location_region` is already in the payload. Add `Field("location_region").eq(region)` to any filter |
| **Treatment comparison** | Filter by `treatment_type` to compare outcome distributions across treatment modalities |
| **Expanding to 1536-dim** | Change `dimension` param in `create_collection()` and re-embed; existing data must be re-indexed |

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VECTORAI_HOST` | `localhost:50051` | Actian VectorAI gRPC address |
| `BRIDGE_PORT` | `8080` | REST bridge HTTP port |
| `GEMINI_API_KEY` | — | Enables real Gemini embeddings |

---

## Known VectorAI SDK issues (from official repo)

- **CRTX-202** — Do not close or delete collections while reads/writes are in progress
- **CRTX-232** — `scroll` API uses `cursor` as an offset, not a true cursor token
- **CRTX-233** — `get_many` does not return vector IDs in results

---

*CareLink Intelligence Layer — built on Actian VectorAI DB Beta*
