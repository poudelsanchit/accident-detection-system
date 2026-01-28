from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
from typing import Optional
import os

app = FastAPI(
    title="Accident Detection API",
    description="API for predicting accidents using XGBoost model with accelerometer and gyroscope data",
    version="1.0.0"
)

XGBOOST_MODEL_PATH = "xgboost_accident_model.pkl"

xgb_model = None
FEATURES = ['accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ']


def load_model():
    """Load XGBoost model"""
    global xgb_model
    
    if os.path.exists(XGBOOST_MODEL_PATH):
        try:
            xgb_model = joblib.load(XGBOOST_MODEL_PATH)
            print(f"✅ Loaded XGBoost model from {XGBOOST_MODEL_PATH}")
            print(f"   Model type: {type(xgb_model)}")
        except Exception as e:
            print(f"❌ Error loading XGBoost model: {e}")
            raise
    else:
        raise FileNotFoundError(f"XGBoost model not found at {XGBOOST_MODEL_PATH}. Please ensure xgboost_accident_model.pkl exists.")


class SensorData(BaseModel):
    """Input model for sensor data"""
    accelX: float = Field(..., description="Acceleration in X-axis")
    accelY: float = Field(..., description="Acceleration in Y-axis")
    accelZ: float = Field(..., description="Acceleration in Z-axis")
    gyroX: float = Field(..., description="Gyroscope reading in X-axis")
    gyroY: float = Field(..., description="Gyroscope reading in Y-axis")
    gyroZ: float = Field(..., description="Gyroscope reading in Z-axis")
    
    class Config:
        json_schema_extra = {
            "example": {
                "accelX": -1.16,
                "accelY": -3.26,
                "accelZ": 7.0,
                "gyroX": 1.45,
                "gyroY": 2.45,
                "gyroZ": 0.95
            }
        }


class PredictionResponse(BaseModel):
    """Response model for predictions"""
    prediction: int = Field(..., description="Predicted class (0 = No Accident, 1 = Accident)")
    probability: float = Field(..., description="Probability of accident (class 1)")
    confidence: str = Field(..., description="Confidence level")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prediction": 0,
                "probability": 0.15,
                "confidence": "Low"
            }
        }


@app.on_event("startup")
async def startup_event():
    """Load model when the application starts"""
    load_model()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API (XGBoost)",
        "status": "running",
        "model_loaded": xgb_model is not None,
        "model_path": XGBOOST_MODEL_PATH
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": xgb_model is not None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(sensor_data: SensorData):
    """
    Predict accident probability from accelerometer and gyroscope data using XGBoost model.
    
    - **accelX, accelY, accelZ**: Acceleration values in 3 axes
    - **gyroX, gyroY, gyroZ**: Gyroscope values in 3 axes
    
    Returns:
    - **prediction**: 0 (No Accident) or 1 (Accident)
    - **probability**: Probability of accident (0.0 to 1.0)
    - **confidence**: Confidence level (Low/Medium/High)
    """
    if xgb_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please check server logs.")
    
    try:
        input_data = np.array([[
            sensor_data.accelX,
            sensor_data.accelY,
            sensor_data.accelZ,
            sensor_data.gyroX,
            sensor_data.gyroY,
            sensor_data.gyroZ
        ]])

        probabilities = xgb_model.predict_proba(input_data)
        
        accident_probability = float(probabilities[0][1])
        
        prediction = int(xgb_model.predict(input_data)[0])
        
        if accident_probability < 0.3:
            confidence = "Low"
        elif accident_probability < 0.7:
            confidence = "Medium"
        else:
            confidence = "High"
        
        return PredictionResponse(
            prediction=prediction,
            probability=round(accident_probability, 4),
            confidence=confidence
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/predict/batch")
async def predict_batch(sensor_data_list: list[SensorData]):
    """
    Predict accident probability for multiple sensor readings at once.
    
    Accepts a list of sensor data objects and returns predictions for all.
    """
    if xgb_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please check server logs.")
    
    try:
        input_data = np.array([[
            data.accelX,
            data.accelY,
            data.accelZ,
            data.gyroX,
            data.gyroY,
            data.gyroZ
        ] for data in sensor_data_list])
        
        predictions = xgb_model.predict(input_data)
        probabilities = xgb_model.predict_proba(input_data)
        
        results = []
        for i in range(len(sensor_data_list)):
            accident_prob = float(probabilities[i][1])
            pred = int(predictions[i])
            
            if accident_prob < 0.3:
                confidence = "Low"
            elif accident_prob < 0.7:
                confidence = "Medium"
            else:
                confidence = "High"
            
            results.append({
                "prediction": pred,
                "probability": round(accident_prob, 4),
                "confidence": confidence
            })
        
        return {"predictions": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")
