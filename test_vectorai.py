from cortex import CortexClient, DistanceMetric

# Connect to the local VectorAI DB
with CortexClient("localhost:50051") as client:

    # Health check
    version, uptime = client.health_check()
    print(f"Connected to VectorAI DB: version={version}, uptime={uptime}")

    # Create a temporary collection
    client.create_collection(
        name="test_collection",
        dimension=128,
        distance_metric=DistanceMetric.COSINE,
    )
    print("Collection created.")

    # Insert one vector
    client.upsert("test_collection", id=0, vector=[0.1]*128, payload={"name": "Test Item"})
    print("Vector inserted.")

    # Search for it
    results = client.search("test_collection", query=[0.1]*128, top_k=1)
    for r in results:
        print(f"Found ID: {r.id}, Score: {r.score}, Payload: {r.payload}")

    # Cleanup
    client.delete_collection("test_collection")
    print("Collection deleted.")