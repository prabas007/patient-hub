"""
CareLink — Modal Consensus Engine
===================================
Spins up 3 specialist AI agents IN PARALLEL using asyncio.gather,
each independently analyzing the same patient data from a different expert lens.

Deploy:  modal deploy modal_consensus.py
"""

import modal
from fastapi import Request

app = modal.App("carelink-consensus")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]", "httpx", "python-multipart")
)

# ── Specialist persona definitions ────────────────────────────────────────────

PERSONAS = [
    {
        "role": "clinical_specialist",
        "label": "Clinical Specialist",
        "icon": "🩺",
        "system": """You are a senior clinical specialist evaluating doctor recommendations for a patient.
Your lens: clinical outcomes, treatment efficacy, complication rates, and evidence-based medicine.
You care about: outcome success scores, recovery times, side effect profiles, and specialty match.
You are direct, precise, and prioritize measurable clinical results over bedside manner.""",
    },
    {
        "role": "patient_advocate",
        "label": "Patient Advocate",
        "icon": "🤝",
        "system": """You are an experienced patient advocate helping a vulnerable person navigate their healthcare options.
Your lens: patient experience, emotional support, communication style, accessibility, and quality of life.
You care about: sentiment scores from real patients, how doctors handle fear and uncertainty, hospital accessibility, and holistic care.
You are warm, honest, and always center the human behind the diagnosis.""",
    },
    {
        "role": "data_scientist",
        "label": "Data Scientist",
        "icon": "📊",
        "system": """You are a healthcare data scientist analyzing statistical patterns in patient outcome data.
Your lens: sample sizes, score distributions, statistical significance, outliers, and data quality.
You care about: how many supporting experiences back each doctor, variance in outcome scores, whether composite scores are robust or driven by noise.
You are skeptical, precise, and flag when conclusions are under-supported by data.""",
    },
]

# ── Single persona analysis (async, called in parallel via asyncio.gather) ────

async def analyze_as_persona(
    client,
    persona: dict,
    condition: str,
    stage: str | None,
    experiences: list,
    doctors: list,
    esi: str,
    gemini_key: str,
) -> dict:
    import json

    exp_summary = "\n".join([
        f"- Dr. {e.get('doctor_name', 'Unknown')}: outcome={e.get('outcome_success_score', 0):.2f}, "
        f"sentiment={e.get('sentiment_score', 0):.2f}, recovery={e.get('recovery_days', 0)}d, "
        f"treatment={e.get('treatment_type', 'unknown')}"
        for e in experiences[:12]
    ])

    doctor_summary = "\n".join([
        f"- {d['doctor_name']} ({d['doctor_specialty']} at {d['doctor_hospital']}): "
        f"composite={d['composite_score']:.3f}, avg_outcome={d['avg_outcome_score']:.2f}, "
        f"avg_sentiment={d['avg_sentiment_score']:.2f}, n={d['supporting_experiences']}"
        for d in doctors
    ])

    user_prompt = f"""Patient condition: {condition}{f' — {stage}' if stage else ' (stage unspecified)'}
Patient emotional state: {esi}

DOCTOR CANDIDATES:
{doctor_summary}

SUPPORTING PATIENT EXPERIENCES ({len(experiences)} total):
{exp_summary}

From your expert perspective, provide your independent analysis. Return ONLY valid JSON:
{{
  "top_doctor": "<exact doctor name from candidates above>",
  "confidence": <integer 0-100>,
  "verdict": "<2 sentences: your recommendation and primary reason>",
  "key_insight": "<1 sentence: the most important thing you noticed that others might miss>",
  "concern": "<1 sentence: your biggest honest reservation or caveat>"
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={gemini_key}"

    try:
        res = await client.post(
            url,
            json={
                "system_instruction": {"parts": [{"text": persona["system"]}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512},
            },
            timeout=45,
        )
        raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)

        return {
            "role":        persona["role"],
            "label":       persona["label"],
            "icon":        persona["icon"],
            "top_doctor":  parsed.get("top_doctor", doctors[0]["doctor_name"] if doctors else ""),
            "confidence":  max(0, min(100, int(parsed.get("confidence", 70)))),
            "verdict":     parsed.get("verdict", ""),
            "key_insight": parsed.get("key_insight", ""),
            "concern":     parsed.get("concern", ""),
        }
    except Exception as e:
        return {
            "role":        persona["role"],
            "label":       persona["label"],
            "icon":        persona["icon"],
            "top_doctor":  doctors[0]["doctor_name"] if doctors else "",
            "confidence":  50,
            "verdict":     "Analysis unavailable.",
            "key_insight": "",
            "concern":     str(e),
        }


# ── Consensus aggregation ─────────────────────────────────────────────────────

def compute_consensus(persona_results: list) -> dict:
    top_picks = [r["top_doctor"] for r in persona_results]

    vote_counts: dict = {}
    for pick in top_picks:
        vote_counts[pick] = vote_counts.get(pick, 0) + 1

    if not vote_counts:
        return {
            "agreed_top_doctor": None,
            "agreement_score": 0,
            "consensus_note": "No specialist recommendations available.",
            "show_divergence": True,
            "vote_breakdown": {},
        }

    max_votes = max(vote_counts.values())
    top_pick  = max(vote_counts, key=vote_counts.get)

    # --- NEW: compute smarter agreement score ---
    avg_confidence = sum(r["confidence"] for r in persona_results) / len(persona_results)
    agreement_ratio = max_votes / len(persona_results)

    # Final consensus score blends confidence + agreement strength
    agreement_score = min(95, int(avg_confidence * agreement_ratio))

    # --- Narrative logic ---
    if max_votes == len(persona_results):
        agreed_top_doctor = top_pick
        consensus_note = (
            f"All specialists independently chose {top_pick}. "
            f"Consensus strength reflects both agreement and confidence levels."
        )
        show_divergence = False

    elif max_votes == 2:
        agreed_top_doctor = top_pick
        minority = next(
            r["label"] for r in persona_results if r["top_doctor"] != top_pick
        )
        consensus_note = (
            f"Two specialists favor {top_pick}. "
            f"{minority} has a different perspective — review their concern."
        )
        show_divergence = True

    else:
        agreed_top_doctor = None
        consensus_note = (
            "The specialists disagree. "
            "Your decision depends on what you value most — read each perspective carefully."
        )
        show_divergence = True

    return {
        "agreed_top_doctor": agreed_top_doctor,
        "agreement_score": agreement_score,
        "consensus_note": consensus_note,
        "show_divergence": show_divergence,
        "vote_breakdown": vote_counts,
    }


# ── FastAPI endpoint ──────────────────────────────────────────────────────────

@app.function(image=image, timeout=90)
@modal.fastapi_endpoint(method="POST", label="consensus")
async def consensus_endpoint(request: Request) -> dict:
    import asyncio
    import httpx

    body = await request.json()

    condition   = body.get("condition", "")
    stage       = body.get("stage")
    experiences = body.get("experiences", [])
    doctors     = body.get("doctors", [])
    esi         = body.get("esi_category", "calm")
    gemini_key  = body.get("gemini_key", "")

    if not doctors or not gemini_key:
        return {"error": "doctors and gemini_key are required"}

    # Fire all 3 Gemini calls simultaneously with asyncio.gather
    async with httpx.AsyncClient() as client:
        persona_results = await asyncio.gather(*[
            analyze_as_persona(
                client, persona, condition, stage,
                experiences, doctors, esi, gemini_key
            )
            for persona in PERSONAS
        ])

    consensus = compute_consensus(list(persona_results))

    return {
        "personas":  list(persona_results),
        "consensus": consensus,
    }