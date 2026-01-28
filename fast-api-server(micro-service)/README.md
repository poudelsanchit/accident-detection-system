# Accident Detection FastAPI Server

FastAPI server for predicting accidents using accelerometer and gyroscope data.

## Installation

```bash
pip install -r requirements.txt
```

Or using Python launcher on Windows:
```bash
py -m pip install -r requirements.txt
```

## Running the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python launcher:
```bash
py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### 1. Root Endpoint
- **GET** `/` - Server status and information

### 2. Health Check
- **GET** `/health` - Health check endpoint

### 3. Single Prediction
- **POST** `/predict` - Predict accident from single sensor reading

**Request Body:**
```json
{
  "accelX": -1.16,
  "accelY": -3.26,
  "accelZ": 7.0,
  "gyroX": 1.45,
  "gyroY": 2.45,
  "gyroZ": 0.95
}
```

**Response:**
```json
{
  "prediction": 0,
  "probability": 0.15,
  "confidence": "Low"
}
```

### 4. Batch Prediction
- **POST** `/predict/batch` - Predict accidents from multiple sensor readings

**Request Body:**
```json
[
  {
    "accelX": -1.16,
    "accelY": -3.26,
    "accelZ": 7.0,
    "gyroX": 1.45,
    "gyroY": 2.45,
    "gyroZ": 0.95
  },
  {
    "accelX": 5.2,
    "accelY": -8.1,
    "accelZ": 12.3,
    "gyroX": 3.5,
    "gyroY": -2.1,
    "gyroZ": 4.8
  }
]
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Model Files

The server expects:
- `xgb.pkl` - XGBoost model (required)
- `scaler.pkl` - StandardScaler (optional, XGBoost doesn't require scaling)

## Example Usage

### Using curl:
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "accelX": -1.16,
    "accelY": -3.26,
    "accelZ": 7.0,
    "gyroX": 1.45,
    "gyroY": 2.45,
    "gyroZ": 0.95
  }'
```

### Using Python:
```python
import requests

data = {
    "accelX": -1.16,
    "accelY": -3.26,
    "accelZ": 7.0,
    "gyroX": 1.45,
    "gyroY": 2.45,
    "gyroZ": 0.95
}

response = requests.post("http://localhost:8000/predict", json=data)
print(response.json())
```
cd fast-api-server
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000