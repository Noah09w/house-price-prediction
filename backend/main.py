from datetime import datetime, timezone
import os
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from joblib import load

# Firebase Firestore database connection helpers
from database import get_db, save_prediction_rest, get_predictions_rest

# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="GDP Real Estate Price Predictor API",
    description="Machine learning valuation engine based on Boston Real Estate Dataset",
    version="2.0.0"
)


# --------------------------------------------------
# CORS - Allow React frontend & deployment origins
# --------------------------------------------------

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://gdp-real-estate-ai.vercel.app"
] + [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Load trained ML model
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "GDP_pipeline.joblib")
if not os.path.exists(model_path):
    model_path = os.path.join(os.path.dirname(BASE_DIR), "GDP_pipeline.joblib")

try:
    model = load(model_path)
    print(f"Successfully loaded ML model pipeline from {model_path}")
except Exception as e:
    print(f"Error loading model pipeline: {e}")
    model = None

# In-memory storage fallback
in_memory_predictions = []
USD_TO_INR = 95.4


# --------------------------------------------------
# Input Data Schema & Validation
# --------------------------------------------------

class HouseData(BaseModel):
    CRIM: float = Field(default=3.5, ge=0, le=100, description="Per-capita crime rate")
    ZN: float = Field(default=12.0, ge=0, le=100, description="Proportion of residential land zoned for lots over 25k sq.ft.")
    INDUS: float = Field(default=9.0, ge=0, le=50, description="Proportion of non-retail business acres per town")
    CHAS: float = Field(default=0.0, ge=0, le=1, description="Charles River dummy variable (1 if tract bounds river; 0 otherwise)")
    NOX: float = Field(default=0.55, ge=0.3, le=1.0, description="Nitric oxides concentration (parts per 10 million)")
    RM: float = Field(default=6.2, ge=1, le=12, description="Average number of rooms per dwelling")
    AGE: float = Field(default=65.0, ge=0, le=100, description="Proportion of owner-occupied units built prior to 1940")
    DIS: float = Field(default=4.0, ge=0.5, le=15, description="Weighted distances to five Boston employment centres")
    RAD: float = Field(default=5.0, ge=1, le=30, description="Index of accessibility to radial highways")
    TAX: float = Field(default=320.0, ge=100, le=1000, description="Full-value property-tax rate per $10,000")
    PTRATIO: float = Field(default=18.0, ge=10, le=30, description="Pupil-teacher ratio by town")
    B: float = Field(default=380.0, ge=0, le=500, description="Demographic proportion index")
    LSTAT: float = Field(default=12.0, ge=0, le=50, description="Percentage of lower status of the population")


# --------------------------------------------------
# Home & Health Endpoints
# --------------------------------------------------

router = APIRouter()

@router.get("/")
def home():
    return {
        "status": "online",
        "service": "GDP Real Estate Price Predictor API",
        "model_loaded": model is not None,
        "version": "2.0.0"
    }


@router.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "database": "Firebase Firestore / Local Fallback",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# --------------------------------------------------
# Prediction Endpoint
# --------------------------------------------------

@router.post("/predict")
def predict(data: HouseData):
    if model is None:
        raise HTTPException(status_code=500, detail="Machine Learning model is not loaded on server.")

    input_dict = {
        "CRIM": data.CRIM,
        "ZN": data.ZN,
        "INDUS": data.INDUS,
        "CHAS": data.CHAS,
        "NOX": data.NOX,
        "RM": data.RM,
        "AGE": data.AGE,
        "DIS": data.DIS,
        "RAD": data.RAD,
        "TAX": data.TAX,
        "PTRATIO": data.PTRATIO,
        "B": data.B,
        "LSTAT": data.LSTAT
    }

    try:
        input_df = pd.DataFrame([input_dict])
        raw_pred = float(model.predict(input_df)[0])
        predicted_medv = max(0.5, round(raw_pred, 3))
        predicted_lakhs = round((predicted_medv * 1000 * USD_TO_INR) / 100000, 2)
        
        min_lakhs = round(predicted_lakhs * 0.88, 2)
        max_lakhs = round(predicted_lakhs * 1.12, 2)

        record = {
            **input_dict,
            "predicted_MEDV": predicted_medv,
            "predicted_lakhs": predicted_lakhs,
            "min_lakhs": min_lakhs,
            "max_lakhs": max_lakhs,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        db = get_db()
        saved_to_firebase = False

        if db is not None:
            try:
                _, doc_ref = db.collection("predictions").add(record)
                record["id"] = doc_ref.id
                saved_to_firebase = True
            except Exception as err:
                print(f"Error writing to Firebase Firestore: {err}")

        if not saved_to_firebase:
            saved_to_firebase = save_prediction_rest(record)

        if not saved_to_firebase:
            record["id"] = f"mem_{len(in_memory_predictions) + 1}"

        in_memory_predictions.insert(0, record)

        return {
            "success": True,
            "predicted_MEDV": predicted_medv,
            "predicted_lakhs": predicted_lakhs,
            "min_lakhs": min_lakhs,
            "max_lakhs": max_lakhs,
            "id": record.get("id"),
            "storage": "firebase" if saved_to_firebase else "local_memory",
            "message": "Prediction saved to database" if saved_to_firebase else "Prediction calculated and cached locally",
            "created_at": record["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction engine error: {str(e)}")


# --------------------------------------------------
# Get Prediction History
# --------------------------------------------------

@router.get("/predictions")
def get_predictions():
    db = get_db()
    if db is not None:
        try:
            docs = db.collection("predictions").stream()
            results = []
            for doc in docs:
                item = doc.to_dict()
                item["id"] = doc.id
                results.append(item)
            results.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
            return results
        except Exception as e:
            print(f"Error retrieving predictions from Firebase: {e}")

    rest_results = get_predictions_rest()
    combined = list(rest_results)
    existing_ids = {x.get("id") for x in combined if x.get("id")}
    for item in in_memory_predictions:
        if item.get("id") not in existing_ids:
            combined.append(item)

    combined.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return combined


# --------------------------------------------------
# Mount Routes for Vercel Services (/api and root)
# --------------------------------------------------
app.include_router(router, prefix="/api")
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)


