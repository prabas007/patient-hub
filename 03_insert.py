"""
CareLink — Vector Insertion Script
=====================================
Inserts all generated seed data into Actian VectorAI DB via the native
actiancortex Python client (gRPC, port 50051).

Collections targeted (must exist — run 01_schema.py first):
  • patient_experiences
  • doctor_profiles
  • circle_posts

Usage
─────
  python 03_insert.py                      # insert from carelink_seed_data.json
  python 03_insert.py --file custom.json   # use a different seed file
  python 03_insert.py --batch-size 25      # tune batch size

Prerequisites
─────────────
  1. docker compose up -d            (VectorAI DB running on localhost:50051)
  2. python 01_schema.py             (collections created)
  3. python 02_generate_data.py      (carelink_seed_data.json exists)
  4. pip install actiancortex-0.1.0b1-py3-none-any.whl

Environment variables (optional)
─────────────────────────────────
  VECTORAI_HOST   default: localhost:50051
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

from cortex import CortexClient

VECTORAI_HOST = os.getenv("VECTORAI_HOST", "localhost:50051")
SEED_FILE     = Path("carelink_seed_data.json")
DEFAULT_BATCH = 50


# ── Helpers ───────────────────────────────────────────────────────────────────

def _chunks(lst: list, size: int):
    """Yield successive chunks of `size` from `lst`."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def _strip_embedding(record: dict) -> dict:
    """Return payload dict without the embedding_vector key."""
    return {k: v for k, v in record.items() if k != "embedding_vector"}


def _sequential_id(records: list, start: int = 0) -> list[int]:
    """VectorAI uses integer IDs; map each record index to a stable int."""
    return list(range(start, start + len(records)))


# ── Insertion functions ───────────────────────────────────────────────────────

def insert_doctors(client: CortexClient, doctors: list, batch_size: int) -> int:
    """
    Insert doctor profiles.

    VectorAI payload for each doctor:
      id (original UUID), name, specialty, hospital, location_region,
      years_experience, bio, created_at
    """
    total = 0
    for chunk in _chunks(list(enumerate(doctors)), batch_size):
        indices, recs = zip(*chunk)
        ids      = [i for i in indices]
        vectors  = [r["embedding_vector"] for r in recs]
        payloads = [_strip_embedding(r) for r in recs]

        client.batch_upsert(
            collection_name = "doctor_profiles",
            ids        = ids,
            vectors    = vectors,
            payloads   = payloads,
        )
        total += len(recs)
        print(f"   ↑  doctor_profiles  {total:>4}/{len(doctors)}")

    return total


def insert_experiences(client: CortexClient, experiences: list, batch_size: int) -> int:
    """
    Insert patient experiences.

    We assign integer IDs starting at 10_000 to avoid collision with doctors.
    """
    total   = 0
    id_base = 10_000

    for chunk in _chunks(list(enumerate(experiences)), batch_size):
        indices, recs = zip(*chunk)
        ids      = [id_base + i for i in indices]
        vectors  = [r["embedding_vector"] for r in recs]
        payloads = [_strip_embedding(r) for r in recs]

        client.batch_upsert(
            collection_name = "patient_experiences",
            ids        = ids,
            vectors    = vectors,
            payloads   = payloads,
        )
        total += len(recs)
        print(f"   ↑  patient_experiences  {total:>4}/{len(experiences)}")

    return total


def insert_circle_posts(client: CortexClient, posts: list, batch_size: int) -> int:
    """
    Insert circle posts.
    Integer IDs start at 100_000.
    """
    total   = 0
    id_base = 100_000

    for chunk in _chunks(list(enumerate(posts)), batch_size):
        indices, recs = zip(*chunk)
        ids      = [id_base + i for i in indices]
        vectors  = [r["embedding_vector"] for r in recs]
        payloads = [_strip_embedding(r) for r in recs]

        client.batch_upsert(
            collection_name = "circle_posts",
            ids        = ids,
            vectors    = vectors,
            payloads   = payloads,
        )
        total += len(recs)
        print(f"   ↑  circle_posts  {total:>4}/{len(posts)}")

    return total


# ── Verification ─────────────────────────────────────────────────────────────

def verify(client: CortexClient) -> None:
    for name in ("doctor_profiles", "patient_experiences", "circle_posts"):
        count = client.count(name)
        print(f"   {name:<30}  {count:>5} vectors")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareLink — Insert seed vectors into Actian VectorAI DB"
    )
    parser.add_argument("--file",       default=str(SEED_FILE),
                        help=f"Path to seed JSON (default: {SEED_FILE})")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH,
                        help=f"Vectors per batch_upsert call (default: {DEFAULT_BATCH})")
    parser.add_argument("--host",       default=VECTORAI_HOST,
                        help=f"VectorAI DB address (default: {VECTORAI_HOST})")
    args = parser.parse_args()

    # 1. Load seed data
    seed_path = Path(args.file)
    if not seed_path.exists():
        print(f"❌  Seed file not found: {seed_path}")
        print("   Run  python 02_generate_data.py  first.")
        sys.exit(1)

    with open(seed_path) as f:
        data = json.load(f)

    doctors      = data["doctors"]
    experiences  = data["experiences"]
    circle_posts = data["circle_posts"]

    print(f"📦  Loaded {len(doctors)} doctors, "
          f"{len(experiences)} experiences, "
          f"{len(circle_posts)} circle posts")
    print(f"    Embedding dim: {data.get('embedding_dim', 768)}")

    # 2. Connect
    print(f"\n🔌  Connecting to Actian VectorAI DB at {args.host} …")
    try:
        with CortexClient(args.host) as client:
            version, uptime = client.health_check()
            print(f"✅  Connected — server {version}, uptime {uptime}s\n")

            t_start = time.perf_counter()

            # 3. Insert
            print("⬆️   Inserting doctor profiles …")
            n_docs = insert_doctors(client, doctors, args.batch_size)

            print("\n⬆️   Inserting patient experiences …")
            n_exp  = insert_experiences(client, experiences, args.batch_size)

            print("\n⬆️   Inserting circle posts …")
            n_posts = insert_circle_posts(client, circle_posts, args.batch_size)

            # 4. Flush to disk
            print("\n💾  Flushing collections to persistent storage …")
            for name in ("doctor_profiles", "patient_experiences", "circle_posts"):
                client.flush(name)
                print(f"   ✓  {name}")

            elapsed = time.perf_counter() - t_start

            # 5. Verify
            print("\n🔍  Verifying final counts:")
            verify(client)

            print(f"\n⏱   Total time: {elapsed:.2f}s")
            print(f"\n🎉  Insertion complete!")
            print(f"   • {n_docs} doctors  |  {n_exp} experiences  |  {n_posts} circle posts")
            print(f"\n   Next step:  python 04_query.py")

    except Exception as exc:
        print(f"\n❌  Error: {exc}")
        print(
            "\nTroubleshooting:\n"
            "  1. Is Docker running?         →  docker compose up -d\n"
            "  2. Did you create collections? →  python 01_schema.py\n"
            "  3. Is the SDK installed?       →  pip install actiancortex-0.1.0b1-py3-none-any.whl\n"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
