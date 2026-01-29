#!/usr/bin/env python3
import sys
import json
import traceback
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def predict_next(user_scores,
                 num_synth=2000, 
                 random_state=42):
    rng = np.random.default_rng(random_state)

    # 1) Make synthetic training set: features = 5 prev scores, target = mean + noise
    X = rng.integers(0, 61, size=(num_synth, len(user_scores)))
    y = X.mean(axis=1) + rng.normal(0, 5, size=(num_synth,))
    y = np.clip(y, 0, 60)

    # 2) Fit Random Forest
    model = RandomForestRegressor(random_state=random_state)
    model.fit(X, y)

    # 3) Predict for the logged-in student
    pred = model.predict([user_scores])[0]
    return float(np.clip(pred, 0, 60).round(1))

if __name__ == "__main__":
    try:
        raw = sys.argv[1]            # comma-separated scores
        user_scores = [float(x) for x in raw.split(',')]
        result = predict_next(user_scores)
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
