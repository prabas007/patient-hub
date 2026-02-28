"""
CareLink — Python REST Bridge for Actian VectorAI DB
======================================================
Wraps the actiancortex gRPC client in a lightweight FastAPI service so that
Node.js (or any HTTP client) can call Actian VectorAI without needing the
Python SDK directly.

Endpoints
─────────
  GET   /health                  — health check + vector DB ping
  POST  /upsert                  — insert or update a single vector
  POST  /batch_upsert            — insert multiple vectors
  POST  /search                  — unfiltered top-K ANN search
  POST  /search_filtered         — filtered top-K ANN search (condition / stage / etc.)
  GET   /count/{collection}      — vector count in a collection
  DELETE /delete/{collection}/{id} — delete a single vector

Usage
─────
  pip install fastapi uvicorn actiancortex-0.1.0b1-py3-none-any.whl
  python 06_rest_bridge.py

  # or in production:
  uvicorn 06_rest_bridge:app --host 0.0.0.0 --port 8080 --workers 2

Environment variables
─────────────────────
  VECTORAI_HOST   gRPC address  (default: localhost:50051)
  BRIDGE_PORT     HTTP port     (default: 8080)
"""

import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from cortex import AsyncCortexClient, DistanceMetric
from cortex.filters import Filter, Field as CField

VECTORAI_HOST = os.getenv("VECTORAI_HOST", "localhost:50051")
BRIDGE_PORT   = int(os.getenv("BRIDGE_PORT", "8080"))

# ── Shared client ─────────────────────────────────────────────────────────────

_client: Optional[AsyncCortexClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _client
    _client = AsyncCortexClient(VECTORAI_HOST)
    await _client.__aenter__()
    print(f"✅  Connected to Actian VectorAI DB at {VECTORAI_HOST}")
    yield
    await _client.__aexit__(None, None, None)
    print("🔌  Disconnected from VectorAI DB")


app = FastAPI(
    title       = "CareLink VectorAI Bridge",
    description = "REST proxy over Actian VectorAI DB gRPC for Node.js consumers",
    version     = "1.0.0",
    lifespan    = lifespan,
)


# ── Request / response models ─────────────────────────────────────────────────

class UpsertRequest(BaseModel):
    collection: str
    id:         int
    vector:     List[float]
    payload:    Dict[str, Any] = {}


class BatchUpsertRequest(BaseModel):
    collection: str
    ids:        List[int]
    vectors:    List[List[float]]
    payloads:   List[Dict[str, Any]] = []


class FilterClause(BaseModel):
    field: str
    op:    str                         # "eq" | "gte" | "lte" | "range"
    value: Any


class SearchRequest(BaseModel):
    collection: str
    query:      List[float]
    top_k:      int = 5


class FilteredSearchRequest(BaseModel):
    collection: str
    query:      List[float]
    top_k:      int = 5
    filters:    List[FilterClause] = []


class HitResponse(BaseModel):
    id:      int
    score:   float
    payload: Dict[str, Any]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_filter(clauses: List[FilterClause]) -> Filter:
    f = Filter()
    for clause in clauses:
        field = CField(clause.field)
        op    = clause.op.lower()
        if op == "eq":
            f = f.must(field.eq(clause.value))
        elif op == "gte":
            f = f.must(field.range(gte=clause.value))
        elif op == "lte":
            f = f.must(field.range(lte=clause.value))
        elif op == "range" and isinstance(clause.value, dict):
            f = f.must(field.range(**clause.value))
        else:
            raise ValueError(f"Unsupported filter op: {clause.op}")
    return f


def _hits_to_json(results) -> List[dict]:
    return [
        {"id": r.id, "score": float(r.score), "payload": dict(r.payload or {})}
        for r in results
    ]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    try:
        version, uptime = await _client.health_check()
        return {"status": "ok", "vectorai_version": version, "uptime_seconds": uptime}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/upsert")
async def upsert(req: UpsertRequest):
    try:
        await _client.upsert(
            req.collection, id=req.id, vector=req.vector, payload=req.payload
        )
        return {"status": "ok", "id": req.id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/batch_upsert")
async def batch_upsert(req: BatchUpsertRequest):
    try:
        await _client.batch_upsert(
            req.collection,
            ids      = req.ids,
            vectors  = req.vectors,
            payloads = req.payloads or [{}] * len(req.ids),
        )
        return {"status": "ok", "inserted": len(req.ids)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/search", response_model=Dict[str, Any])
async def search(req: SearchRequest):
    try:
        results = await _client.search(req.collection, req.query, top_k=req.top_k)
        hits = []
        for r in results:
            payload = {}
            try:
                vector, payload_data = await _client.get(req.collection, r.id)
                payload = dict(payload_data) if payload_data else {}
            except Exception:
                pass
            hits.append({"id": r.id, "score": float(r.score), "payload": payload})
        return {"hits": hits}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/search_filtered", response_model=Dict[str, Any])
async def search_filtered(req: FilteredSearchRequest):
    try:
        f = _build_filter(req.filters)
        results = await _client.search_filtered(
            req.collection, req.query, f, top_k=req.top_k
        )
        hits = []
        for r in results:
            payload = {}
            try:
                vector, payload_data = await _client.get(req.collection, r.id)
                payload = dict(payload_data) if payload_data else {}
            except Exception:
                pass
            hits.append({"id": r.id, "score": float(r.score), "payload": payload})
        return {"hits": hits}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/count/{collection}")
async def count(collection: str):
    try:
        n = await _client.count(collection)
        return {"collection": collection, "count": n}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/delete/{collection}/{id}")
async def delete(collection: str, id: int):
    try:
        await _client.delete(collection, id)
        return {"status": "deleted", "id": id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "06_rest_bridge:app",
        host    = "0.0.0.0",
        port    = BRIDGE_PORT,
        reload  = False,
        workers = 1,
    )
