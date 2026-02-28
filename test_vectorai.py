from cortex import CortexClient, DistanceMetric, Filter
import random
import string

# --- Helper functions ---
def random_text(length=20):
    return ''.join(random.choices(string.ascii_letters + ' ', k=length))

def generate_vector(dim=768):
    # Dummy deterministic unit vector
    vec = [random.random() for _ in range(dim)]
    norm = sum(x*x for x in vec)**0.5
    return [x/norm for x in vec]

# --- Collections to create ---
collections = [
    {"name": "experiences", "dimension": 768},
    {"name": "doctors", "dimension": 768},
    {"name": "circle_posts", "dimension": 768},
    {"name": "emotional_states", "dimension": 768}
]

# --- Connect to VectorAI DB ---
with CortexClient("localhost:50051") as client:
    print("Connected to VectorAI DB.")

    # 1️⃣ Create collections
    for col in collections:
        client.create_collection(
            name=col["name"],
            dimension=col["dimension"],
            distance_metric=DistanceMetric.COSINE
        )
        print(f"Created collection: {col['name']}")

    # 2️⃣ Generate fake data
    experiences = [{"id": i, "vector": generate_vector(), "payload": {"condition": f"Condition {i%10}", "stage": f"Stage {i%3}", "text": random_text(50)}} for i in range(60)]
    doctors = [{"id": i, "vector": generate_vector(), "payload": {"name": f"Doctor {i}", "specialty": f"Specialty {i%5}"}} for i in range(15)]
    circle_posts = [{"id": i, "vector": generate_vector(), "payload": {"text": random_text(100)}} for i in range(20)]
    emotional_states = [{"id": i, "vector": generate_vector(), "payload": {"state": random.choice(["happy", "sad", "anxious", "calm"])}} for i in range(20)]

    # 3️⃣ Batch insert
    client.batch_upsert("experiences", [e["id"] for e in experiences], [e["vector"] for e in experiences], [e["payload"] for e in experiences])
    client.batch_upsert("doctors", [d["id"] for d in doctors], [d["vector"] for d in doctors], [d["payload"] for d in doctors])
    client.batch_upsert("circle_posts", [p["id"] for p in circle_posts], [p["vector"] for p in circle_posts], [p["payload"] for p in circle_posts])
    client.batch_upsert("emotional_states", [s["id"] for s in emotional_states], [s["vector"] for s in emotional_states], [s["payload"] for s in emotional_states])
    print("All data inserted successfully.")

    # 4️⃣ Run a filtered query (simulate RAG retrieval)
    f = Filter().must(Filter.Field("condition").eq("Condition 1")).must(Filter.Field("stage").eq("Stage 2"))
    results = client.search_filtered("experiences", query=generate_vector(), top_k=5, filter=f)
    print("\nTop 5 experiences for Condition 1 / Stage 2:")
    for r in results:
        print(f"ID: {r.id}, Score: {r.score}, Text: {r.payload['text'][:50]}...")

    # 5️⃣ Aggregate doctors (simplified scoring)
    print("\nTop doctor recommendations (simulated):")
    doc_results = client.search("doctors", query=generate_vector(), top_k=3)
    for d in doc_results:
        print(f"Doctor ID: {d.id}, Name: {d.payload['name']}, Specialty: {d.payload['specialty']}, Score: {d.score}")

    # 6️⃣ Cleanup (optional)
    for col in collections:
        client.delete_collection(col["name"])
        print(f"Deleted collection: {col['name']}")

print("\nIntegration test completed successfully.")