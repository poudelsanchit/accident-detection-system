# Accident Detection System

A comprehensive vehicle accident detection and management system with real-time monitoring, alert notifications, and organizational management capabilities.

## Project Overview

This system consists of three main components:
- **Backend**: Express.js API with Prisma ORM and PostgreSQL
- **Frontend**: Next.js application with real-time dashboard
- **FastAPI Microservice**: ML-based accident detection service

## Tech Stack

### Backend
- Bun runtime
- Express.js
- Prisma ORM
- PostgreSQL
- WebSocket for real-time communication
- Twilio for SMS notifications
- JWT authentication

### Frontend
- Next.js 16
- React 19
- NextAuth.js for authentication
- Tailwind CSS
- Leaflet/Mapbox for maps
- Recharts for data visualization

### FastAPI Microservice
- FastAPI
- XGBoost for accident prediction
- LSTM model for time-series analysis
- NumPy & scikit-learn

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Bun** (latest version) - [Install Bun](https://bun.sh)
- **PostgreSQL** (v14 or higher)
- **Python** (v3.9 or higher)
- **pip** (Python package manager)
- **Git**

## Project Structure

```
.
├── backend/                 # Express.js backend API
├── frontend/               # Next.js frontend application
├── fast-api-server(micro-service)/  # Python FastAPI ML service
└── README.md
```

---

## Setup Instructions

### 1. Backend Setup

#### Step 1: Navigate to backend directory
```bash
cd backend
```

#### Step 2: Install dependencies
```bash
bun install
```

#### Step 3: Configure environment variables
Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/accident_detection_system"

# JWT Secret
JWT_SECRET="your-secret-key-change-this"

# Twilio Configuration (for SMS alerts)
ACCOUNT_SID="your-twilio-account-sid"
AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# FastAPI Microservice URL
FASTAPI_URL="http://localhost:8000"
```

#### Step 4: Setup PostgreSQL database
Create a new PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE accident_detection_system;

# Exit PostgreSQL
\q
```

#### Step 5: Run Prisma migrations
```bash
# Generate Prisma Client
bunx prisma generate

# Run migrations to create database tables
bunx prisma migrate deploy

# (Optional) Open Prisma Studio to view database
bunx prisma studio
```

#### Step 6: Start the backend server
```bash
bun run index.ts
```

The backend server will start on `http://localhost:3000`

---

### 2. FastAPI Microservice Setup

#### Step 1: Navigate to FastAPI directory
```bash
cd fast-api-server(micro-service)
```

#### Step 2: Create Python virtual environment (recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### Step 3: Install Python dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Verify ML models
Ensure the following model files exist in the directory:
- `xgboost_accident_model.pkl`
- `accident_lstm.pt`

#### Step 5: Start the FastAPI server
```bash
# Development mode with auto-reload
uvicorn main:app --reload --port 8000

# Or production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

The FastAPI service will start on `http://localhost:8000`

You can access the API documentation at `http://localhost:8000/docs`

---

### 3. Frontend Setup

#### Step 1: Navigate to frontend directory
```bash
cd frontend
```

#### Step 2: Install dependencies
```bash
npm install
```

#### Step 3: Configure environment variables
Create a `.env` file in the `frontend` directory:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET="your-nextauth-secret-change-this"
```

#### Step 4: Start the development server
```bash
npm run dev
```

The frontend application will start on `http://localhost:3001`

#### Step 5: Build for production (optional)
```bash
# Create production build
npm run build

# Start production server
npm start
```

---

## Running the Complete System

To run the entire system, you need to start all three services:

### Terminal 1 - Backend
```bash
cd backend
bun run index.ts
```

### Terminal 2 - FastAPI Microservice
```bash
cd fast-api-server(micro-service)
uvicorn main:app --reload --port 8000
```

### Terminal 3 - Frontend
```bash
cd frontend
npm run dev
```

### Access Points
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **FastAPI Service**: http://localhost:8000
- **FastAPI Docs**: http://localhost:8000/docs

---

## Database Schema

The system uses the following main entities:

- **User**: User accounts with phone-based authentication
- **Organization**: Schools, hospitals, municipalities, police stations, or private entities
- **OrganizationMember**: User roles within organizations (Admin, Driver, Viewer)
- **Vehicle**: Vehicles tracked by the system
- **Accident**: Accident records with location and status
- **Alert**: Notification alerts (SMS, Push, Email)
- **Invitation**: Organization membership invitations

---

## Features

### User Management
- Phone number-based authentication
- OTP verification
- Multi-organization membership
- Role-based access control (Admin, Driver, Viewer)

### Organization Management
- Multiple organization types (School, Hospital, Municipality, Police Station, Private)
- Member management with role assignments
- Vehicle fleet management
- Invitation system

### Vehicle Tracking
- Real-time vehicle monitoring
- Vehicle registration and management
- Driver assignment
- IP-based vehicle communication

### Accident Detection
- ML-based accident prediction
- Real-time accident reporting
- GPS location tracking
- Status management (Reported, Confirmed, Resolved)

### Alert System
- SMS notifications via Twilio
- Multi-channel alerts (SMS, Push, Email)
- Automated emergency notifications

### Dashboard
- Real-time map visualization
- Organization overview
- Vehicle tracking
- Accident history and reports

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - OTP verification

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `PUT /api/organizations/:id` - Update organization

### Vehicles
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Register vehicle
- `GET /api/vehicles/:id` - Get vehicle details
- `PUT /api/vehicles/:id` - Update vehicle

### Accidents
- `GET /api/accidents` - List accidents
- `POST /api/accidents` - Report accident
- `GET /api/accidents/:id` - Get accident details
- `PUT /api/accidents/:id` - Update accident status

---

## Troubleshooting

### Backend Issues

**Database connection error**
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists

**Prisma errors**
```bash
# Regenerate Prisma Client
bunx prisma generate

# Reset database (WARNING: deletes all data)
bunx prisma migrate reset
```

### Frontend Issues

**Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### FastAPI Issues

**Module import errors**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Model file not found**
- Ensure `xgboost_accident_model.pkl` and `accident_lstm.pt` exist
- Check file paths in `main.py`

---

## Development Tips

### Database Management
```bash
# View database in Prisma Studio
cd backend
bunx prisma studio

# Create new migration
bunx prisma migrate dev --name migration_name
```

### Code Generation
```bash
# Regenerate Prisma types after schema changes
cd backend
bunx prisma generate
```

### Testing API Endpoints
- Use the FastAPI docs at `http://localhost:8000/docs`
- Use tools like Postman or Thunder Client
- Check browser console for frontend API calls

---

## Environment Variables Reference

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret key for JWT tokens | Yes |
| ACCOUNT_SID | Twilio Account SID | Yes |
| AUTH_TOKEN | Twilio Auth Token | Yes |
| TWILIO_PHONE_NUMBER | Twilio phone number | Yes |
| FASTAPI_URL | FastAPI service URL | Yes |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_BACKEND_URL | Backend API URL | Yes |
| NEXTAUTH_URL | NextAuth callback URL | Yes |
| NEXTAUTH_SECRET | NextAuth secret key | Yes |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is private and proprietary.

---

## Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation at `http://localhost:8000/docs`
- Check application logs in terminal outputs

---

## Quick Start Checklist

- [ ] PostgreSQL installed and running
- [ ] Node.js and Bun installed
- [ ] Python 3.9+ installed
- [ ] Database created
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Backend dependencies installed (`bun install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] FastAPI dependencies installed (`pip install -r requirements.txt`)
- [ ] Prisma migrations run (`bunx prisma migrate deploy`)
- [ ] All three services running
- [ ] Can access frontend at http://localhost:3001


