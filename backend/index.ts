import "dotenv/config"
import express from "express"
import cors from "cors"
import authRouter from "./routes/auth"
import organizationRouter from "./routes/organization"
import vehicleRouter from "./routes/vehicle"
import { authMiddleware } from "./middleware/authMiddleware"
import invitationRouter from "./routes/invitation"
import { WebSocket, WebSocketServer } from "ws"
import { prisma } from "./config/prismaClient"

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/auth", authRouter)
app.use("/api/organization", authMiddleware, organizationRouter)
app.use("/api/vehicle", authMiddleware, vehicleRouter)
app.use("/api/invitation", authMiddleware, invitationRouter)

const httpServer = app.listen(3000, () => {
  console.log("Server is running on port 3000")
})

const wss = new WebSocketServer({ server: httpServer })

/* ===================== ENUMS ===================== */

enum UserRole {
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
  VIEWER = "VIEWER",
}

enum VehicleType {
  CAR = "CAR",
  MOTORCYCLE = "MOTORCYCLE",
  TRUCK = "TRUCK",
  BUS = "BUS",
  OTHER = "OTHER",
}

/* ===================== INTERFACES ===================== */

interface Viewer {
  organizationId: string
  ws: WebSocket
  name: string
}

interface Driver {
  organizationId: string
  ws: WebSocket
  vechicleId: string
  vehicleType: VehicleType
  name: string
}

/* ===================== STATE ===================== */

let viewers: Viewer[] = []
let drivers: Driver[] = []

const gpsHistory: Record<
  string,
  { lat: number; lon: number; time: number; speed: number }
> = {}

const lastAccidentTime: Record<string, number> = {}
const ACCIDENT_COOLDOWN = 10_000

/* ===================== ACCIDENT CONFIG ===================== */

/* ===================== THRESHOLDS ===================== */

const THRESHOLDS: Record<
  VehicleType,
  { g: number; gyro: number; deltaV: number }
> = {
  MOTORCYCLE: { g: 3.0, gyro: 200, deltaV: 30 },
  CAR: { g: 0.1, gyro: 250, deltaV: 45 },
  TRUCK: { g: 6.5, gyro: 350, deltaV: 60 },
  BUS: { g: 6.5, gyro: 350, deltaV: 60 },
  OTHER: { g: 4.5, gyro: 275, deltaV: 45 },
}

/* ===================== HELPERS ===================== */

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // meters
  const toRad = (v: number) => (v * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

function isValidVehicleType(value: any): value is VehicleType {
  return Object.values(VehicleType).includes(value)
}

/* ===================== ACCIDENT CREATION ===================== */

/**
 * Create accident record in database
 */
async function createAccidentRecord(
  organizationId: string,
  vehicleId: string,
  driverName: string,
  vehicleType: string,
  latitude: number,
  longitude: number,
  speed: number,
  deltaV: number,
  gValue: number,
  gyroValue: number,
  timestamp: number
) {
  try {
    const accident = await prisma.accident.create({
      data: {
        title: `Accident Detected - ${vehicleType}`,
        description: `Accident detected for vehicle. Speed: ${speed.toFixed(2)} km/h, G-Force: ${gValue.toFixed(2)}g, Gyro: ${gyroValue.toFixed(2)} deg/s`,
        latitude,
        longitude,
        occurredAt: new Date(timestamp),
        status: "REPORTED",
        vehicleId,
        organizationId,
      },
      include: {
        vehicle: true,
        organization: true,
      },
    })
    return accident
  } catch (error) {
    console.error("Error creating accident record:", error)
    throw error
  }
}

/* ===================== WEBSOCKET ===================== */

wss.on("connection", (ws) => {
  ws.on("error", console.error)

  ws.on("message", async (raw) => {
    const parsedData = JSON.parse(raw.toString())

    /* -------- JOIN VIEWER -------- */
    if (parsedData.type === "join:viewer") {
      viewers.push({
        organizationId: parsedData.organizationId,
        ws,
        name: parsedData.name,
      })
      return
    }

    /* -------- JOIN DRIVER -------- */
    if (parsedData.type === "join:driver") {
      drivers.push({
        organizationId: parsedData.organizationId,
        ws,
        name: parsedData.name,
        vechicleId: parsedData.vechicleId,
        vehicleType: parsedData.vehicleType,
      })
      return
    }

    /* -------- DRIVER DATA -------- */
    if (parsedData.type === "driver:data" && parsedData.data) {
      const {
        accelX,
        accelY,
        accelZ,
        gyroX,
        gyroY,
        gyroZ,
        latitude,
        longitude,
        vehicleId,
        vehicleType,
        driverName,
      } = parsedData.data
      // // Log received driver data
      // console.log("📥 Received driver data:", {
      //   vehicleId,
      //   driverName,
      //   vehicleType,
      //   location: { latitude, longitude },
      //   sensors: {
      //     acceleration: { x: accelX, y: accelY, z: accelZ },
      //     gyroscope: { x: gyroX, y: gyroY, z: gyroZ },
      //   },
      //   timestamp: new Date().toISOString(),
      // })

      /* ---- forward live data to viewers ---- */
      viewers.forEach((viewer) => {
        if (viewer.organizationId === parsedData.organizationId) {
          viewer.ws.send(JSON.stringify({
            type: "driver:data",
            data: parsedData.data,
          }))
        }
      })

      const now = Date.now()

      /* ================= GPS → SPEED ================= */

      let speedKmh = 0
      let deltaV = 0

      if (gpsHistory[vehicleId]) {
        const prev = gpsHistory[vehicleId]
        const dt = (now - prev.time) / 1000

        if (dt > 0 && dt <= 2) {
          const distance = haversineDistance(
            prev.lat,
            prev.lon,
            latitude,
            longitude
          )
          speedKmh = (distance / dt) * 3.6
          deltaV = prev.speed - speedKmh
        }
      }

      gpsHistory[vehicleId] = {
        lat: latitude,
        lon: longitude,
        time: now,
        speed: speedKmh,
      }

      /* ================= MPU ================= */

      const accelMagnitude = Math.sqrt(
        accelX ** 2 + accelY ** 2 + accelZ ** 2
      )
      const gValue = accelMagnitude / 9.8

      const gyroValue = Math.sqrt(
        gyroX ** 2 + gyroY ** 2 + gyroZ ** 2
      )

      // Type guard to ensure vehicleType is a valid VehicleType
      const validVehicleType: VehicleType = isValidVehicleType(vehicleType) 
        ? vehicleType 
        : VehicleType.OTHER
      const t = THRESHOLDS[validVehicleType]

      /* ================= COOLDOWN ================= */

      // lastAccidentTime[vehicleId] ??= 0
      // if (now - lastAccidentTime[vehicleId] < ACCIDENT_COOLDOWN) return

      /* ================= ACCIDENT LOGIC ================= */
      
      // Check if threshold-based detection triggers
      const thresholdExceeded = 
        gValue >= t.g ||
        (gyroValue >= t.gyro || deltaV >= t.deltaV)
      
      if (!thresholdExceeded) {
        console.log(`✅ NO ACCIDENT,latitude: ${latitude} and longitude : ${longitude}`)
        return
      }
      
      // Check cooldown to prevent spam
      lastAccidentTime[vehicleId] ??= 0
      if (now - lastAccidentTime[vehicleId] < ACCIDENT_COOLDOWN) {
        return // Still in cooldown period
      }
      
      if (thresholdExceeded) {

        // Determine which threshold(s) were exceeded (cause of accident)
        const causes = []
        if (gValue >= t.g) causes.push(`G-Force: ${gValue.toFixed(2)}g (threshold: ${t.g}g)`)
        if (gyroValue >= t.gyro) causes.push(`Gyroscope: ${gyroValue.toFixed(2)} deg/s (threshold: ${t.gyro})`)
        if (deltaV >= t.deltaV) causes.push(`Delta-V: ${deltaV.toFixed(2)} km/h (threshold: ${t.deltaV} km/h)`)

        console.log("🚨 ACCIDENT - Cause:", causes.join(", "))
        console.log("gValue"+gValue.toFixed(2))
        // Update last accident time
        lastAccidentTime[vehicleId] = now

        // Create accident record in database
        try {
          const accident = await createAccidentRecord(
            parsedData.organizationId,
            vehicleId,
            driverName,
            vehicleType,
            latitude,
            longitude,
            speedKmh,
            deltaV,
            gValue,
            gyroValue,
            now
          )

          const payload = {
            type: "accident:detected",
            data: {
              organizationId: parsedData.organizationId,
              vehicleId,
              driverName,
              vehicleType,
              location: { latitude, longitude },
              speed: Number(speedKmh.toFixed(2)),
              deltaV: Number(deltaV.toFixed(2)),
              gValue: Number(gValue.toFixed(2)),
              gyroValue: Number(gyroValue.toFixed(2)),
              accidentId: accident.id,
              timestamp: now,
            },
          }

          // Send accident alert to all viewers in the organization
          viewers.forEach((viewer) => {
            if (viewer.organizationId === parsedData.organizationId) {
              viewer.ws.send(JSON.stringify(payload))
            }
          })
        } catch (error) {
          console.error("❌ ACCIDENT - Failed to create record:", error)
          
          // Still send alert even if database write fails
          const payload = {
            type: "accident:detected",
            data: {
              organizationId: parsedData.organizationId,
              vehicleId,
              driverName,
              vehicleType,
              location: { latitude, longitude },
              speed: Number(speedKmh.toFixed(2)),
              deltaV: Number(deltaV.toFixed(2)),
              gValue: Number(gValue.toFixed(2)),
              gyroValue: Number(gyroValue.toFixed(2)),
              timestamp: now,
            },
          }

          viewers.forEach((viewer) => {
            if (viewer.organizationId === parsedData.organizationId) {
              viewer.ws.send(JSON.stringify(payload))
            }
          })
        }

      }
    }
  })

  ws.on("close", () => {
    viewers = viewers.filter(v => v.ws !== ws)
    drivers = drivers.filter(d => d.ws !== ws)
  })

  ws.send("WebSocket connected")
})
