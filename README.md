CareLink — AI-Powered Patient Intelligence Platform
CareLink helps patients navigate serious medical diagnoses by surfacing real patient experiences, semantically matching them to their condition, and recommending doctors through a multi-agent AI consensus engine. It combines a Next.js frontend with a Python RAG (Retrieval-Augmented Generation) backend powered by Actian VectorAI DB, Gemini embeddings, and Modal serverless GPU infrastructure.

Architecture Overview
┌─────────────────────────────────────────────┐
│              Next.js Frontend (React 19)     │
│         Tailwind CSS + Framer Motion         │
└────────────────────┬────────────────────────┘
                     │ API Routes
        ┌────────────┼─────────────────┐
        │            │                 │
┌───────▼──────┐ ┌───▼──────────┐ ┌───▼──────────────────┐
│ Modal Whisper │ │Modal Consensus│ │  Python REST Bridge  │
│  (GPU: T4)   │ │   Engine      │ │  (FastAPI, port 8080) │
│ Whisper base  │ │ Gemini Flash  │ │                      │
│ + ffmpeg      │ │ 3 AI personas │ │  Actian VectorAI DB  │
└──────────────┘ └──────────────┘ │  (gRPC, port 50051)  │
                                   └──────────────────────┘

Tech Stack
Layer
Technology
Frontend
Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion
Vector DB
Actian VectorAI (HNSW index, cosine similarity, 3072-dim)
Embeddings
Google Gemini gemini-embedding-001
AI / LLM
Google Gemini gemini-2.5-flash-lite (consensus engine)
Speech-to-text
OpenAI Whisper (base model, GPU-accelerated via Modal)
Serverless GPU
Modal (T4 GPU for Whisper; CPU for consensus)
REST Bridge
FastAPI + uvicorn (Python ↔ VectorAI gRPC adapter)
Containerization
Docker Compose (VectorAI DB)


Features
Semantic Doctor Recommendations — Patients describe their condition in natural language or by voice; the system retrieves the most similar patient experiences from VectorAI and surfaces ranked doctor recommendations using a composite score (similarity × outcome × sentiment).
Multi-Agent Consensus Engine — Three AI specialist personas (Clinical Specialist 🩺, Patient Advocate 🤝, Data Scientist 📊) independently analyze the same data in parallel via asyncio.gather, then vote to produce a consensus recommendation with a confidence score.
Voice Input via Whisper — Patients can speak their query; audio is recorded as WebM, re-muxed to WAV via ffmpeg, and transcribed by Whisper on a Modal T4 GPU.
Emotional State Awareness — The consensus engine accepts an esi_category (emotional state indicator) to tailor recommendations to how the patient is feeling.
Community Circles — A vector collection for condition-specific community posts (searchable by semantic similarity).
Presage Adaptive UI — An emotional_states collection is reserved for future adaptive UI personalization based on arousal/valence embeddings.

Repository Structure
patient-hub/
├── 01_schema.py          # Create Actian VectorAI collections
├── 02_generate_data.py   # Generate + embed seed data (Gemini API)
├── 03_insert.py          # Batch-insert vectors into VectorAI DB
├── 04_query.py           # Semantic retrieval + RAG payload builder
├── 06_rest_bridge.py     # FastAPI REST proxy over VectorAI gRPC
├── modal_whisper.py      # Modal endpoint: Whisper audio transcription
├── modal_consensus.py    # Modal endpoint: 3-persona AI consensus engine
├── package.json          # Next.js app (frontend)
└── actiancortex-*.whl    # Actian VectorAI Python SDK (local wheel)

Vector DB Schema
Four HNSW collections, all using cosine similarity:
Collection
Purpose
Dimensions
patient_experiences
Core RAG memory — patient narratives + outcome scores
3072
doctor_profiles
Doctor semantic profiles for recommendation
3072
circle_posts
Community condition-specific posts
3072
emotional_states
Future: adaptive UI personalization
3072

The composite doctor ranking score is weighted as:
composite = 0.45 × avg_similarity
          + 0.35 × avg_outcome_success_score
          + 0.20 × normalized_avg_sentiment

Prerequisites
Docker (for VectorAI DB)
Python 3.11+
Node.js 18+
A Google Gemini API key
A Modal account (for Whisper and consensus endpoints)

Setup
1. Start the Vector Database
bash
docker compose up -d
VectorAI DB will be available at localhost:50051.
2. Install the Python SDK
bash
pip install actiancortex-0.1.0b1-py3-none-any.whl
pip install numpy fastapi uvicorn httpx python-multipart
3. Initialize the Database Schema
bash
python 01_schema.py

# To wipe and recreate:
python 01_schema.py --drop-first
4. Generate and Insert Seed Data
bash
export GEMINI_API_KEY=your_key_here

# Generate 60 patient experiences, 15 doctors, 20 circle posts
python 02_generate_data.py

# Preview without writing:
python 02_generate_data.py --preview

# Insert into VectorAI DB
python 03_insert.py

# Optional: tune batch size
python 03_insert.py --batch-size 25
5. Test Semantic Retrieval
bash
python 04_query.py
python 04_query.py --condition "Breast Cancer" --stage "Stage II" --top-k 5
python 04_query.py --condition "Depression" --stage "Severe"
6. Start the REST Bridge (for Next.js)
bash
python 06_rest_bridge.py
# or in production:
uvicorn 06_rest_bridge:app --host 0.0.0.0 --port 8080 --workers 2
7. Deploy Modal Endpoints
bash
modal deploy modal_whisper.py
modal deploy modal_consensus.py
8. Start the Frontend
bash
npm install
npm run dev

REST Bridge API
The bridge (06_rest_bridge.py) exposes VectorAI's gRPC interface over HTTP so the Next.js app can call it directly.
Method
Endpoint
Description
GET
/health
Health check + VectorAI ping
POST
/upsert
Insert or update a single vector
POST
/batch_upsert
Insert multiple vectors
POST
/search
Unfiltered top-K ANN search
POST
/search_filtered
Filtered search (by condition, stage, etc.)
GET
/count/{collection}
Vector count in a collection
DELETE
/delete/{collection}/{id}
Delete a vector


Modal Endpoints
Whisper Transcription
POST /transcribe-form — accepts multipart form with an audio field (WebM from browser MediaRecorder). Returns:
json
{
  "transcript": "I was diagnosed with...",
  "language": "en",
  "duration_seconds": 12.4
}
Consensus Engine
POST /consensus — accepts patient condition data and doctor candidates, fires 3 Gemini calls in parallel, returns per-persona verdicts + a consensus vote:
json
{
  "personas": [
    {
      "role": "clinical_specialist",
      "label": "Clinical Specialist",
      "icon": "🩺",
      "top_doctor": "Dr. Sarah Chen",
      "confidence": 87,
      "verdict": "...",
      "key_insight": "...",
      "concern": "..."
    }
  ],
  "consensus": {
    "agreed_top_doctor": "Dr. Sarah Chen",
    "agreement_score": 79,
    "consensus_note": "All specialists independently chose Dr. Sarah Chen.",
    "show_divergence": false,
    "vote_breakdown": { "Dr. Sarah Chen": 3 }
  }
}

Environment Variables
Variable
Default
Description
GEMINI_API_KEY
—
Required for embeddings and consensus engine
VECTORAI_HOST
localhost:50051
Actian VectorAI gRPC address
BRIDGE_PORT
8080
REST bridge HTTP port


Seed Data
The generator (02_generate_data.py) produces realistic synthetic data across 10 medical conditions: Breast Cancer, Type 2 Diabetes, Coronary Artery Disease, Multiple Sclerosis, Crohn's Disease, Rheumatoid Arthritis, Lung Cancer, Parkinson's Disease, Lupus, and Depression. All embeddings are generated via the Gemini gemini-embedding-001 model.

## Use of AI

We used ChatGPT to assist with the planning process of this project. We primarily used ChatGPT for advice as to which frameworks and languages to use. 

Additionally, we used Claude for coding assistance throughout the development of this project. It facilitated debugging and also provided suggestions on how to improve our code.

## Disclaimer

LinkCare is not a medical provider. It does not diagnose, treat, or replace professional medical advice. For emergencies, call 911.
