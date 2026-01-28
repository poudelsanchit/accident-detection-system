from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import torch
import torch.nn as nn
from typing import Optional
import os

app = FastAPI(
    title="Accident Detection API",
    description="API for predicting accidents using accelerometer and gyroscope data",
    version="1.0.0"
)

# Model and scaler paths
LSTM_MODEL_PATH = "accident_lstm.pt"
SCALER_PATH = "scaler.pkl"

# Global variables for loaded models
lstm_model = None
scaler = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Feature order expected by the model
FEATURES = ['accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ']
INPUT_FEATURES = 6  # 6 sensor features


class AccidentLSTM(nn.Module):
    """LSTM model for accident detection"""
    def __init__(self, input_size=6, hidden_size=64, num_layers=2, num_classes=2):
        super(AccidentLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM layer
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0
        )
        
        # Fully connected layers
        self.fc1 = nn.Linear(hidden_size, 32)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(32, num_classes)
    
    def forward(self, x):
        # x shape: (batch_size, seq_len, input_size)
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # Use the last output from LSTM
        last_output = lstm_out[:, -1, :]
        
        # Pass through fully connected layers
        out = self.fc1(last_output)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        
        return out


def load_models():
    """Load LSTM model and scaler"""
    global lstm_model, scaler
    
    # Load scaler (required)
    if os.path.exists(SCALER_PATH):
        try:
            scaler = joblib.load(SCALER_PATH)
            print(f"✅ Loaded scaler from {SCALER_PATH}")
        except Exception as e:
            print(f"❌ Error loading scaler: {e}")
            raise
    else:
        raise FileNotFoundError(f"Scaler not found at {SCALER_PATH}. Please ensure scaler.pkl exists.")
    
    # Load LSTM model
    if os.path.exists(LSTM_MODEL_PATH):
        try:
            # Try to load the model with different possible architectures
            # First, try to load the state dict to infer architecture
            checkpoint = torch.load(LSTM_MODEL_PATH, map_location=device)
            
            # Check if it's a state dict or a full model
            if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
                # Try to infer architecture from state dict keys
                if 'lstm.weight_ih_l0' in state_dict:
                    hidden_size = state_dict['lstm.weight_ih_l0'].shape[0] // 4
                    num_layers = max([int(k.split('.')[2]) for k in state_dict.keys() if 'lstm.weight_ih_l' in k]) + 1
                else:
                    # Default architecture
                    hidden_size = 64
                    num_layers = 2
            elif isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                state_dict = checkpoint['model_state_dict']
                hidden_size = 64
                num_layers = 2
            else:
                # Assume it's a state dict directly
                state_dict = checkpoint
                hidden_size = 64
                num_layers = 2
            
            # Create model with inferred architecture
            lstm_model = AccidentLSTM(
                input_size=INPUT_FEATURES,
                hidden_size=hidden_size,
                num_layers=num_layers,
                num_classes=2
            )
            
            # Load state dict (handle key mismatches)
            if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                lstm_model.load_state_dict(checkpoint['state_dict'], strict=False)
            elif isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                lstm_model.load_state_dict(checkpoint['model_state_dict'], strict=False)
            else:
                lstm_model.load_state_dict(checkpoint, strict=False)
            
            lstm_model.to(device)
            lstm_model.eval()  # Set to evaluation mode
            print(f"✅ Loaded LSTM model from {LSTM_MODEL_PATH}")
            print(f"   Device: {device}")
            print(f"   Hidden size: {hidden_size}, Layers: {num_layers}")
        except Exception as e:
            print(f"❌ Error loading LSTM model: {e}")
            print("   Attempting to load with default architecture...")
            # Fallback: try with default architecture
            try:
                lstm_model = AccidentLSTM(
                    input_size=INPUT_FEATURES,
                    hidden_size=64,
                    num_layers=2,
                    num_classes=2
                )
                checkpoint = torch.load(LSTM_MODEL_PATH, map_location=device)
                if isinstance(checkpoint, dict):
                    if 'state_dict' in checkpoint:
                        lstm_model.load_state_dict(checkpoint['state_dict'], strict=False)
                    elif 'model_state_dict' in checkpoint:
                        lstm_model.load_state_dict(checkpoint['model_state_dict'], strict=False)
                    else:
                        lstm_model.load_state_dict(checkpoint, strict=False)
                else:
                    lstm_model.load_state_dict(checkpoint, strict=False)
                lstm_model.to(device)
                lstm_model.eval()
                print(f"✅ Loaded LSTM model with default architecture")
            except Exception as e2:
                print(f"❌ Failed to load model: {e2}")
                raise
    else:
        raise FileNotFoundError(f"LSTM model not found at {LSTM_MODEL_PATH}")


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
    """Load models when the application starts"""
    load_models()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API",
        "status": "running",
        "model_loaded": lstm_model is not None,
        "scaler_loaded": scaler is not None,
        "device": str(device)
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": lstm_model is not None,
        "scaler_loaded": scaler is not None,
        "device": str(device)
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
    if lstm_model is None:
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
        
        # Scale input data using the scaler (required for model accuracy)
        input_data_scaled = scaler.transform(input_data)
        
        # Convert to torch tensor and reshape for LSTM (batch_size, seq_len, features)
        # For single prediction, we use seq_len=1
        input_tensor = torch.FloatTensor(input_data_scaled).unsqueeze(1).to(device)
        # Shape: (1, 1, 6) - (batch_size=1, seq_len=1, features=6)
        
        # Get prediction
        with torch.no_grad():
            outputs = lstm_model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
        
        # Probability of accident (class 1)
        accident_probability = float(probabilities[0][1].cpu().numpy())
        
        # Custom threshold: prediction = 1 when probability > 0.1
        PREDICTION_THRESHOLD = 0.1
        prediction = 1 if accident_probability > PREDICTION_THRESHOLD else 0
        
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
    if lstm_model is None:
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
        
        # Scale input data using the scaler (required for model accuracy)
        input_data_scaled = scaler.transform(input_data)
        
        # Convert to torch tensor and reshape for LSTM (batch_size, seq_len, features)
        # For batch prediction, each sample has seq_len=1
        input_tensor = torch.FloatTensor(input_data_scaled).unsqueeze(1).to(device)
        # Shape: (batch_size, 1, 6)
        
        # Get predictions
        with torch.no_grad():
            outputs = lstm_model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
        
        # Custom threshold: prediction = 1 when probability > 0.1
        PREDICTION_THRESHOLD = 0.1
        
        # Format results
        results = []
        for i in range(len(sensor_data_list)):
            accident_prob = float(probabilities[i][1].cpu().numpy())
            # Use custom threshold for prediction
            pred = 1 if accident_prob > PREDICTION_THRESHOLD else 0
            
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
