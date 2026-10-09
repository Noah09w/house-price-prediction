import os
import json
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_db = None
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "house-price-prediction-bfe9b")
API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyAycGJOEEbhgkHodwrLPx3pKy6-HcfepHY")

def get_db():
    global _db
    if _db is not None:
        return _db

    # Method 1: FIREBASE_CREDENTIALS_JSON environment variable (JSON string)
    creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if creds_json:
        try:
            cred_dict = json.loads(creds_json)
            cred = credentials.Certificate(cred_dict)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            print("Firebase initialized via FIREBASE_CREDENTIALS_JSON.")
            return _db
        except Exception as e:
            print(f"Error loading FIREBASE_CREDENTIALS_JSON: {e}")

    # Method 2: Service account file path (FIREBASE_CREDENTIALS_PATH or serviceAccountKey.json)
    creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    if os.path.exists(creds_path):
        try:
            cred = credentials.Certificate(creds_path)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            print(f"Firebase initialized via service account file: {creds_path}")
            return _db
        except Exception as e:
            print(f"Error loading Firebase service account from {creds_path}: {e}")

    # Method 3: Try initializing default application credentials
    try:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(options={"projectId": PROJECT_ID})
        _db = firestore.client()
        print("Firebase initialized via default application credentials.")
        return _db
    except Exception as e:
        print(f"Firebase initialization info: {e}")
        return None

def save_prediction_rest(record: dict) -> bool:
    """Fallback REST API save using Web API Key & Project ID"""
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/predictions?key={API_KEY}"
        fields = {}
        for k, v in record.items():
            if isinstance(v, (int, float)):
                fields[k] = {"doubleValue": float(v)}
            else:
                fields[k] = {"stringValue": str(v)}
        payload = {"fields": fields}
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code in (200, 201):
            return True
        else:
            print(f"Firestore REST error ({res.status_code}): {res.text}")
            return False
    except Exception as e:
        print(f"Firestore REST exception: {e}")
        return False

def get_predictions_rest() -> list:
    """Fallback REST API fetch using Web API Key & Project ID"""
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/predictions?key={API_KEY}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            documents = data.get("documents", [])
            results = []
            for doc in documents:
                fields = doc.get("fields", {})
                item = {}
                for k, v in fields.items():
                    if "doubleValue" in v:
                        item[k] = float(v["doubleValue"])
                    elif "integerValue" in v:
                        item[k] = int(v["integerValue"])
                    elif "stringValue" in v:
                        item[k] = v["stringValue"]
                item["id"] = doc.get("name", "").split("/")[-1]
                results.append(item)
            results.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
            return results
    except Exception as e:
        print(f"Firestore REST get exception: {e}")
    return []