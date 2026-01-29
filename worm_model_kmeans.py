#!/usr/bin/env python3
import json
import sys
import traceback
import numpy as np
from sklearn.cluster import KMeans

def generate_worm_kmeans(user_scores,
                         num_synth=100,
                         n_clusters=10,
                         max_score=60,
                         random_state=42):
    # 1) Generate synthetic peer scores
    rng = np.random.default_rng(random_state)
    synth = rng.integers(
        low=0,
        high=max_score + 1,
        size=(num_synth, len(user_scores))
    )

    # 2) Cluster the synthetic pool
    kmeans = KMeans(n_clusters=n_clusters, random_state=random_state)
    labels = kmeans.fit_predict(synth)
    centers = kmeans.cluster_centers_  # shape: (n_clusters, num_tests)

    # 3) Compute a single peer-average line by weighting centroids by cluster size
    sizes = np.bincount(labels, minlength=n_clusters)  # how many synth points per cluster
    weighted_sum = np.zeros(len(user_scores))
    for j in range(n_clusters):
        weighted_sum += centers[j] * sizes[j]
    peer_avg = np.round(weighted_sum / num_synth).astype(int).tolist()

    # 4) Prepare Chart.js payload: exactly two datasets
    labels = [f"Test {i}" for i in range(1, len(user_scores) + 1)]
    datasets = [
        {
            "label": "Peers Average",
            "data": peer_avg,
            "borderColor": "#36A2EB",
            "fill": False,
            "tension": 0.3
        },
        {
            "label": "You",
            "data": user_scores,
            "borderColor": "#f44336",
            "borderWidth": 2,
            "fill": False,
            "tension": 0.3
        }
    ]

    return {"labels": labels, "datasets": datasets}

if __name__ == "__main__":
    try:
        raw = sys.argv[1] if len(sys.argv) > 1 else '[]'
        user_scores = json.loads(raw)
        result = generate_worm_kmeans(user_scores)
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
