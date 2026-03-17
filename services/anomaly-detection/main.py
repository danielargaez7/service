from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
from sklearn.ensemble import IsolationForest


class DetectRequest(BaseModel):
    features: List[float]


class DetectResponse(BaseModel):
    anomaly_score: float
    is_anomaly: bool


app = FastAPI(title="ServiceCore Anomaly Detection")

# Lightweight baseline model for local dev scaffolding.
MODEL = IsolationForest(
    n_estimators=100,
    contamination=0.1,
    random_state=42,
)

# Fit on synthetic baseline so the endpoint is immediately usable in dev.
baseline = np.random.normal(loc=0.0, scale=1.0, size=(500, 6))
MODEL.fit(baseline)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect", response_model=DetectResponse)
def detect(payload: DetectRequest):
    sample = np.array(payload.features, dtype=float).reshape(1, -1)
    raw_score = MODEL.decision_function(sample)[0]
    is_anomaly = MODEL.predict(sample)[0] == -1

    # Normalize to a 0-1 "risk-like" score where 1 is most anomalous.
    anomaly_score = float(1.0 / (1.0 + np.exp(raw_score)))
    return DetectResponse(anomaly_score=anomaly_score, is_anomaly=is_anomaly)
