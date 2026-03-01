import os, numpy as np
from google import genai
from cortex import CortexClient

api_key = os.environ["GEMINI_API_KEY"]
client_g = genai.Client(api_key=api_key)
res = client_g.models.embed_content(model="gemini-embedding-001", contents="breast cancer treatment")
vec = np.array(res.embeddings[0].values, dtype=np.float32)
vec /= np.linalg.norm(vec)
query = vec.tolist()
print(f"Embedding dim: {len(query)}")

with CortexClient("localhost:50051") as db:
    print("Count:", db.count("patient_experiences"))
    results = db.search("patient_experiences", query, top_k=2, with_payload=True) or []
    print(f"Unfiltered results: {len(results)}")
    for r in results:
        print(f"  type={type(r)}")
        print(f"  dir={[a for a in dir(r) if not a.startswith('_')]}")
        print(f"  payload={r.payload}")
        print(f"  score={r.score}")
        break
