"""
CareLink — Fake Data Generator
================================
Generates realistic patient experiences, doctor profiles, and circle posts
and writes them to  carelink_seed_data.json  for ingestion by 03_insert.py.

• 60 patient experiences across 10 conditions
• 15 doctor profiles across matching specialties
• 20 circle posts (community layer)

Embeddings are simulated: deterministically seeded, unit-normalized 768-dim
vectors.  Swap  simulate_embedding()  for a real Gemini API call in production.

Usage
─────
  python 02_generate_data.py             # writes carelink_seed_data.json
  python 02_generate_data.py --preview   # prints stats without writing file
  python 02_generate_data.py --count 100 # generate 100 experiences

Dependencies
────────────
  pip install numpy
"""

import argparse
import json
import random
import uuid
from datetime import datetime, timedelta

import numpy as np

RNG    = random.Random(42)
NP_RNG = np.random.default_rng(42)

# ── Medical vocabulary ────────────────────────────────────────────────────────

CONDITIONS: dict = {
    "Breast Cancer": {
        "stages":       ["Stage I", "Stage II", "Stage III", "Stage IV"],
        "specialties":  ["Oncology", "Surgical Oncology", "Radiation Oncology"],
        "treatments":   ["Chemotherapy", "Radiation", "Hormone Therapy",
                         "Immunotherapy", "Surgery", "Targeted Therapy"],
        "side_effects": ["nausea", "fatigue", "hair_loss", "hot_flashes",
                         "lymphedema", "neuropathy", "bone_pain"],
        "recovery_range": (30, 540),
    },
    "Type 2 Diabetes": {
        "stages":       ["Pre-diabetic", "Newly Diagnosed", "Moderate", "Advanced"],
        "specialties":  ["Endocrinology", "Internal Medicine", "Nephrology"],
        "treatments":   ["Metformin", "Insulin", "GLP-1 Agonists",
                         "Lifestyle Modification", "SGLT2 Inhibitors"],
        "side_effects": ["hypoglycemia", "weight_gain", "fatigue",
                         "neuropathy", "vision_blurring"],
        "recovery_range": (90, 730),
    },
    "Coronary Artery Disease": {
        "stages":       ["Mild", "Moderate", "Severe"],
        "specialties":  ["Cardiology", "Interventional Cardiology", "Cardiac Surgery"],
        "treatments":   ["Statin Therapy", "Angioplasty", "CABG Surgery",
                         "Beta Blockers", "Lifestyle Modification"],
        "side_effects": ["chest_pain", "shortness_of_breath", "fatigue",
                         "edema", "dizziness"],
        "recovery_range": (60, 365),
    },
    "Multiple Sclerosis": {
        "stages":       ["Relapsing-Remitting", "Secondary Progressive",
                         "Primary Progressive", "Clinically Isolated Syndrome"],
        "specialties":  ["Neurology", "Neuroimmunology"],
        "treatments":   ["Interferon Beta", "Natalizumab", "Ocrelizumab",
                         "Physical Therapy", "Glatiramer Acetate"],
        "side_effects": ["fatigue", "spasticity", "cognitive_fog",
                         "vision_loss", "bladder_issues", "depression"],
        "recovery_range": (180, 1095),
    },
    "Crohn's Disease": {
        "stages":       ["Mild", "Moderate-Severe", "Remission", "Flare"],
        "specialties":  ["Gastroenterology", "Colorectal Surgery"],
        "treatments":   ["Mesalamine", "Biologics", "Immunosuppressants",
                         "Surgery", "Nutritional Therapy", "Steroids"],
        "side_effects": ["abdominal_pain", "diarrhea", "fatigue",
                         "weight_loss", "joint_pain", "fistulas"],
        "recovery_range": (14, 365),
    },
    "Rheumatoid Arthritis": {
        "stages":       ["Early", "Moderate", "Severe", "Remission"],
        "specialties":  ["Rheumatology", "Internal Medicine"],
        "treatments":   ["Methotrexate", "Biologics", "NSAIDs",
                         "Corticosteroids", "Physical Therapy", "JAK Inhibitors"],
        "side_effects": ["joint_swelling", "morning_stiffness", "fatigue",
                         "fever", "anemia", "infections"],
        "recovery_range": (30, 730),
    },
    "Lung Cancer": {
        "stages":       ["Stage I", "Stage II", "Stage III", "Stage IV"],
        "specialties":  ["Thoracic Oncology", "Pulmonology", "Radiation Oncology"],
        "treatments":   ["Chemotherapy", "Targeted Therapy", "Immunotherapy",
                         "Radiation", "Surgery"],
        "side_effects": ["cough", "dyspnea", "fatigue", "hemoptysis",
                         "weight_loss", "neuropathy"],
        "recovery_range": (60, 730),
    },
    "Parkinson's Disease": {
        "stages":       ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"],
        "specialties":  ["Neurology", "Movement Disorders", "Geriatric Medicine"],
        "treatments":   ["Levodopa", "Dopamine Agonists", "DBS Surgery",
                         "Physical Therapy", "MAO-B Inhibitors"],
        "side_effects": ["tremor", "rigidity", "bradykinesia", "falls",
                         "dyskinesia", "sleep_disturbance", "depression"],
        "recovery_range": (180, 1825),
    },
    "Lupus": {
        "stages":       ["Mild", "Moderate", "Severe", "Remission"],
        "specialties":  ["Rheumatology", "Nephrology", "Dermatology"],
        "treatments":   ["Hydroxychloroquine", "Corticosteroids", "Belimumab",
                         "Immunosuppressants", "NSAIDs"],
        "side_effects": ["joint_pain", "rash", "fatigue", "fever",
                         "kidney_issues", "hair_loss", "photosensitivity"],
        "recovery_range": (30, 365),
    },
    "Depression": {
        "stages":       ["Mild", "Moderate", "Severe", "Treatment-Resistant"],
        "specialties":  ["Psychiatry", "Psychology"],
        "treatments":   ["SSRIs", "SNRIs", "Therapy", "TMS",
                         "Ketamine", "ECT", "Combination Therapy"],
        "side_effects": ["weight_changes", "sleep_disturbance",
                         "sexual_dysfunction", "nausea", "emotional_blunting"],
        "recovery_range": (30, 365),
    },
}

HOSPITALS = [
    "Mayo Clinic", "Johns Hopkins Hospital", "Cleveland Clinic",
    "Massachusetts General Hospital", "UCSF Medical Center",
    "Cedars-Sinai Medical Center", "Mount Sinai Hospital",
    "Northwestern Memorial Hospital", "Duke University Hospital",
    "Vanderbilt University Medical Center", "Brigham and Women's Hospital",
    "Stanford Health Care", "NYU Langone Health",
]

REGIONS    = ["Northeast US", "Southeast US", "Midwest US", "Southwest US",
              "West Coast US", "Pacific Northwest US", "Mountain West US",
              "UK", "Canada", "Australia"]

AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

DOCTOR_NAMES = [
    ("Sarah",  "Chen"),     ("Marcus", "Webb"),    ("Priya",  "Nair"),
    ("James",  "Harrison"), ("Elena",  "Vasquez"), ("David",  "Kim"),
    ("Maria",  "Santos"),   ("Robert", "Mueller"), ("Angela", "Okafor"),
    ("Chen",   "Liu"),      ("Thomas", "Patel"),   ("Fatima", "Reyes"),
    ("Nathan", "Park"),     ("Lisa",   "Thompson"),("Kevin",  "Williams"),
]


# ── Embedding simulation ──────────────────────────────────────────────────────

def simulate_embedding(text: str, dim: int = 768) -> list:
    """
    Deterministic, unit-normalized 768-dim vector seeded from text content.

    ── Production replacement (Gemini API) ─────────────────────────────────
    import google.generativeai as genai, numpy as np, os
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    res = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_DOCUMENT",   # use RETRIEVAL_QUERY for searches
    )
    vec = np.array(res["embedding"], dtype=np.float32)
    return (vec / np.linalg.norm(vec)).tolist()
    ────────────────────────────────────────────────────────────────────────
    """
    seed = sum(ord(c) for c in text[:80]) % (2 ** 31)
    rng  = np.random.default_rng(seed)
    vec  = rng.standard_normal(dim).astype(np.float32)
    vec /= np.linalg.norm(vec)
    return vec.tolist()


# ── Narrative helpers ─────────────────────────────────────────────────────────

def _iso_ago(days: int) -> str:
    return (datetime.utcnow() - timedelta(days=days)).isoformat(timespec="seconds")


def _experience_narrative(
    condition: str, stage: str, treatment: str,
    side_effects: list, recovery_days: int, outcome: float
) -> str:
    tone = ("life-changing and ultimately rewarding"
            if outcome > 0.72 else
            ("manageable with good support"
             if outcome > 0.45 else
             "very difficult — I wish I had more resources earlier"))
    effects_str = ", ".join(side_effects[:3]) if side_effects else "minimal side effects"
    months = RNG.randint(2, 30)
    closing = (
        "I feel hopeful and grateful for the care I received."
        if outcome > 0.72 else
        "I'm still navigating the day-to-day challenges but making slow progress."
    )
    return (
        f"I was diagnosed with {condition} ({stage}) about {months} months ago. "
        f"My care team recommended {treatment}, and the overall journey has been {tone}. "
        f"During treatment I experienced {effects_str}. "
        f"My recovery took approximately {recovery_days} days. "
        f"{closing}"
    )


def _doctor_bio(
    name: str, specialty: str, hospital: str,
    years_exp: int, conditions: list
) -> str:
    cond_str = " and ".join(conditions[:2])
    return (
        f"Dr. {name} is a board-certified {specialty} specialist at {hospital} "
        f"with {years_exp} years of clinical experience. "
        f"Their expertise spans {cond_str}, and they are recognised for a "
        f"compassionate, evidence-based approach to complex patient care."
    )


# ── Generators ────────────────────────────────────────────────────────────────

def generate_doctors(n: int = 15) -> list:
    all_specialties = list({s for m in CONDITIONS.values() for s in m["specialties"]})
    RNG.shuffle(all_specialties)

    doctors = []
    for i in range(n):
        first, last = DOCTOR_NAMES[i % len(DOCTOR_NAMES)]
        full_name   = f"{first} {last}"
        specialty   = all_specialties[i % len(all_specialties)]
        hospital    = HOSPITALS[i % len(HOSPITALS)]
        region      = RNG.choice(REGIONS)
        years_exp   = RNG.randint(5, 35)

        related = [c for c, m in CONDITIONS.items() if specialty in m["specialties"]]
        if not related:
            related = [RNG.choice(list(CONDITIONS.keys()))]

        bio      = _doctor_bio(full_name, specialty, hospital, years_exp, related)
        emb_text = f"{specialty} {hospital} {bio}"

        doctors.append({
            "id":               str(uuid.uuid4()),
            "name":             f"Dr. {full_name}",
            "specialty":        specialty,
            "hospital":         hospital,
            "location_region":  region,
            "years_experience": years_exp,
            "bio":              bio,
            "embedding_vector": simulate_embedding(emb_text),
            "created_at":       _iso_ago(RNG.randint(365, 1825)),
        })
    return doctors


def generate_experiences(doctors: list, n: int = 60) -> list:
    condition_list = list(CONDITIONS.keys())

    assignments = []
    per_cond = n // len(condition_list)
    for c in condition_list:
        assignments.extend([c] * per_cond)
    while len(assignments) < n:
        assignments.append(RNG.choice(condition_list))
    RNG.shuffle(assignments)

    experiences = []
    for condition in assignments[:n]:
        meta         = CONDITIONS[condition]
        stage        = RNG.choice(meta["stages"])
        treatment    = RNG.choice(meta["treatments"])
        n_effects    = RNG.randint(1, 4)
        side_effects = RNG.sample(meta["side_effects"],
                                  min(n_effects, len(meta["side_effects"])))
        outcome      = round(RNG.uniform(0.10, 1.00), 3)
        recovery     = RNG.randint(*meta["recovery_range"])
        raw_sent     = (outcome - 0.5) * 1.8 + RNG.uniform(-0.25, 0.25)
        sentiment    = round(max(-1.0, min(1.0, raw_sent)), 3)

        matched = [d for d in doctors if d["specialty"] in meta["specialties"]]
        doctor  = RNG.choice(matched) if matched else RNG.choice(doctors)

        raw_text = _experience_narrative(
            condition, stage, treatment, side_effects, recovery, outcome
        )

        experiences.append({
            "id":                    str(uuid.uuid4()),
            "user_id":               str(uuid.uuid4()),
            "doctor_id":             doctor["id"],
            "raw_text":              raw_text,
            "condition":             condition,
            "stage":                 stage,
            "treatment_type":        treatment,
            "age_range":             RNG.choice(AGE_RANGES),
            "location_region":       RNG.choice(REGIONS),
            "sentiment_score":       sentiment,
            "recovery_days":         recovery,
            "side_effect_tags":      side_effects,
            "outcome_success_score": outcome,
            "embedding_vector":      simulate_embedding(
                                         f"{condition} {stage} {treatment} {raw_text}"
                                     ),
            "created_at":            _iso_ago(RNG.randint(1, 1095)),
        })
    return experiences


def generate_circle_posts(n: int = 20) -> list:
    templates = [
        "Has anyone tried {t} for {c}? Would love to hear your experience.",
        "Feeling overwhelmed by my {c} diagnosis ({s}). Any advice welcome.",
        "Just completed 6 months of {t} for {c}. Happy to share my journey.",
        "Looking to connect with others managing {c} at the {s} stage.",
        "My doctor suggested switching to {t}. Has this worked for others with {c}?",
    ]
    posts = []
    for _ in range(n):
        condition = RNG.choice(list(CONDITIONS.keys()))
        meta      = CONDITIONS[condition]
        stage     = RNG.choice(meta["stages"])
        treatment = RNG.choice(meta["treatments"])
        raw_text  = RNG.choice(templates).format(
            c=condition, s=stage, t=treatment
        )
        posts.append({
            "id":               str(uuid.uuid4()),
            "circle_id":        str(uuid.uuid4()),
            "user_id":          str(uuid.uuid4()),
            "raw_text":         raw_text,
            "sentiment_score":  round(RNG.uniform(-0.5, 0.85), 3),
            "embedding_vector": simulate_embedding(f"{condition} {raw_text}"),
            "created_at":       _iso_ago(RNG.randint(1, 730)),
        })
    return posts


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareLink fake data generator"
    )
    parser.add_argument("--preview",  action="store_true",
                        help="Show stats only, do not write file")
    parser.add_argument("--count", type=int, default=60,
                        help="Number of patient experiences (default: 60)")
    args = parser.parse_args()

    print("🏥  CareLink — Generating seed data …")
    doctors      = generate_doctors(15)
    experiences  = generate_experiences(doctors, args.count)
    circle_posts = generate_circle_posts(20)

    payload = {
        "generated_at":  datetime.utcnow().isoformat(),
        "embedding_dim": 768,
        "counts": {
            "doctors":      len(doctors),
            "experiences":  len(experiences),
            "circle_posts": len(circle_posts),
        },
        "doctors":      doctors,
        "experiences":  experiences,
        "circle_posts": circle_posts,
    }

    if args.preview:
        from collections import Counter
        print(f"\n   • {len(doctors)} doctor profiles")
        print(f"   • {len(experiences)} patient experiences")
        print(f"   • {len(circle_posts)} circle posts")
        print(f"\n   Condition distribution:")
        for cond, cnt in sorted(Counter(e["condition"] for e in experiences).items()):
            print(f"   {cond:<32} {cnt:>3}  {'█' * cnt}")
        print("\n   Sample experience (embedding omitted):")
        sample = {k: v for k, v in experiences[0].items() if k != "embedding_vector"}
        print(json.dumps(sample, indent=4))
        return

    out = "carelink_seed_data.json"
    with open(out, "w") as f:
        json.dump(payload, f, indent=2, default=str)

    print(f"\n✅  Written → {out}")
    print(f"   • {len(doctors)} doctors | {len(experiences)} experiences | {len(circle_posts)} circle posts")
    print(f"   • Each embedding: 768-dim, L2-normalised (cosine-ready)")
    print(f"\n   Next step:  python 03_insert.py")


if __name__ == "__main__":
    main()
