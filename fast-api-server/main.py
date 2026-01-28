from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
from typing import Optional
import os

app = FastAPI(
    title="Accident Detection API",
    description="API for predicting accidents using accelerometer and gyroscope data",
    version="1.0.0"
)

# Model and scaler paths
XGB_MODEL_PATH = "xgb.pkl"
SCALER_PATH = "scaler.pkl"

# Global variables for loaded models
xgb_model = None
scaler = None

# Feature order expected by the model
FEATURES = ['accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ']


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


def load_models():
    """Load XGBoost model and scaler (if available)"""
    global xgb_model, scaler
    
    # Load XGBoost model
    if os.path.exists(XGB_MODEL_PATH):
        try:
            xgb_model = joblib.load(XGB_MODEL_PATH)
            print(f"✅ Loaded XGBoost model from {XGB_MODEL_PATH}")
        except Exception as e:
            print(f"❌ Error loading XGBoost model: {e}")
            raise
    else:
        raise FileNotFoundError(f"XGBoost model not found at {XGB_MODEL_PATH}")
    
    # Load scaler if available (optional)
    if os.path.exists(SCALER_PATH):
        try:
            scaler = joblib.load(SCALER_PATH)
            print(f"✅ Loaded scaler from {SCALER_PATH}")
        except Exception as e:
            print(f"⚠️  Warning: Could not load scaler: {e}")
            scaler = None
    else:
        print("ℹ️  No scaler found, using raw features (XGBoost doesn't require scaling)")


@app.on_event("startup")
async def startup_event():
    """Load models when the application starts"""
    load_models()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API",
        "status": "running",
        "model_loaded": xgb_model is not None
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
    Predict accident probability from accelerometer and gyroscope data.
    
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
        # Prepare input data in the correct feature order
        input_data = np.array([[
            sensor_data.accelX,
            sensor_data.accelY,
            sensor_data.accelZ,
            sensor_data.gyroX,
            sensor_data.gyroY,
            sensor_data.gyroZ
        ]])
        
        # Scale if scaler is available (though XGBoost doesn't require it)
        if scaler is not None:
            input_data = scaler.transform(input_data)
        
        # Get prediction probabilities
        probabilities = xgb_model.predict_proba(input_data)[0]
        
        # Get predicted class (0 or 1)
        prediction = xgb_model.predict(input_data)[0]
        
        # Probability of accident (class 1)
        accident_probability = float(probabilities[1])
        
        # Determine confidence level
        if accident_probability < 0.3:
            confidence = "Low"
        elif accident_probability < 0.7:
            confidence = "Medium"
        else:
            confidence = "High"
        
        return PredictionResponse(
            prediction=int(prediction),
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
        # Prepare batch input data
        input_data = np.array([[
            data.accelX,
            data.accelY,
            data.accelZ,
            data.gyroX,
            data.gyroY,
            data.gyroZ
        ] for data in sensor_data_list])
        
        # Scale if scaler is available
        if scaler is not None:
            input_data = scaler.transform(input_data)
        
        # Get predictions
        predictions = xgb_model.predict(input_data)
        probabilities = xgb_model.predict_proba(input_data)
        
        # Format results
        results = []
        for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
            accident_prob = float(prob[1])
            
            if accident_prob < 0.3:
                confidence = "Low"
            elif accident_prob < 0.7:
                confidence = "Medium"
            else:
                confidence = "High"
            
            results.append({
                "prediction": int(pred),
                "probability": round(accident_prob, 4),
                "confidence": confidence
            })
        
        return {"predictions": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")
