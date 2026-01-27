"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/core/components/ui/button"
import { ArrowLeft, Wifi, WifiOff, RefreshCw, Play, Square } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// Dynamically import MapContainer to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Dynamically import leaflet only on client side
let L: any = null
if (typeof window !== "undefined") {
  L = require("leaflet")
  // Fix for default marker icons in Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}

interface VehicleData {
  vehicleId: string
  driverName: string
  vehicleType: string
  latitude: number
  longitude: number
  accelX: number
  accelY: number
  accelZ: number
  gyroX: number
  gyroY: number
  gyroZ: number
  speed?: number
  timestamp: number
}

interface Organization {
  id: string
  name: string
  myRole: string
}

interface DriverVehicle {
  id: string
  vehicleNumber: string
  vehicleType: string
}

import { MapUpdater } from "./MapUpdater"

export default function MapPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const organizationId = params.organizationId as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [vehicles, setVehicles] = useState<Map<string, VehicleData>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [driverVehicle, setDriverVehicle] = useState<DriverVehicle | null>(null)
  const [isSendingData, setIsSendingData] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000 // 3 seconds
  const locationWatchIdRef = useRef<number | null>(null)
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const driverVehicleRef = useRef<DriverVehicle | null>(null)
  const isSendingDataRef = useRef(false)

  // Fetch organization details
  const fetchOrganization = useCallback(async () => {
    if (!session?.user?.accessToken) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organization/my-organizations`,
        {
          headers: {
            Authorization: session.user.accessToken,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const org = data.organizations.find((o: Organization) => o.id === organizationId)
        if (org) {
          setOrganization(org)
        } else {
          toast.error("Organization not found")
          router.push("/dashboard")
        }
      }
    } catch (error) {
      console.error("Error fetching organization:", error)
    }
  }, [session?.user?.accessToken, organizationId, router])

  // Fetch driver's vehicle if user is a driver
  const fetchDriverVehicle = useCallback(async () => {
    if (!session?.user?.accessToken || !organizationId) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vehicle/organization/${organizationId}`,
        {
          headers: {
            Authorization: session.user.accessToken,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Find vehicle where current user is the driver
        const myVehicle = data.vehicles?.find(
          (v: any) => v.driver?.id === session?.user?.id
        )
        if (myVehicle) {
          const vehicle = {
            id: myVehicle.id,
            vehicleNumber: myVehicle.vehicleNumber,
            vehicleType: myVehicle.vehicleType,
          }
          driverVehicleRef.current = vehicle
          setDriverVehicle(vehicle)
        }
      }
    } catch (error) {
      console.error("Error fetching driver vehicle:", error)
    }
  }, [session?.user?.accessToken, session?.user?.id, organizationId])

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    if (isConnecting) return // Already attempting to connect

    setIsConnecting(true)
    setConnectionStatus("connecting")

    // Get WebSocket URL from backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"
    let wsUrl = backendUrl
    // Convert HTTP/HTTPS to WS/WSS
    if (wsUrl.startsWith("http://")) {
      wsUrl = wsUrl.replace("http://", "ws://")
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = wsUrl.replace("https://", "wss://")
    } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
      // If no protocol, assume ws://
      wsUrl = `ws://${wsUrl}`
    }
    
    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("WebSocket connected")
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionStatus("connected")
        reconnectAttemptsRef.current = 0
        
        // Join as viewer if user is admin or viewer
        if (organization && (organization.myRole === "ADMIN" || organization.myRole === "VIEWER")) {
          ws.send(JSON.stringify({
            type: "join:viewer",
            organizationId: organizationId,
            name: session?.user?.name || "Viewer",
          }))
          toast.success("Connected to live tracking")
        }
        // Join as driver if user is a driver and has a vehicle
        else if (organization && organization.myRole === "DRIVER" && driverVehicle) {
          ws.send(JSON.stringify({
            type: "join:driver",
            organizationId: organizationId,
            name: session?.user?.name || "Driver",
            vechicleId: driverVehicle.id,
            vehicleType: driverVehicle.vehicleType,
          }))
          toast.success("Connected as driver")
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = event.data
          
          // Handle initial connection message
          if (typeof message === "string" && message === "WebSocket connected") {
            return
          }

          const data = JSON.parse(message)
          
          if (data.type === "driver:data" && data.data) {
            const vehicleData: VehicleData = {
              vehicleId: data.data.vehicleId,
              driverName: data.data.driverName,
              vehicleType: data.data.vehicleType,
              latitude: data.data.latitude,
              longitude: data.data.longitude,
              accelX: data.data.accelX,
              accelY: data.data.accelY,
              accelZ: data.data.accelZ,
              gyroX: data.data.gyroX,
              gyroY: data.data.gyroY,
              gyroZ: data.data.gyroZ,
              speed: data.data.speed,
              timestamp: Date.now(),
            }

            setVehicles((prev) => {
              const newMap = new Map(prev)
              newMap.set(vehicleData.vehicleId, vehicleData)
              return newMap
            })
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setIsConnecting(false)
        setConnectionStatus("disconnected")
        // Don't show error toast for connection errors, they're handled by onclose
      }

      ws.onclose = () => {
        console.log("WebSocket disconnected")
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionStatus("disconnected")
        wsRef.current = null

        // Retry connection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1
          toast.warning(`Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, reconnectDelay)
        } else {
          toast.error("Failed to connect after multiple attempts. Please refresh the page.")
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error("Error creating WebSocket:", error)
      setIsConnecting(false)
      setConnectionStatus("disconnected")
      toast.error("Failed to connect to WebSocket server")
    }
  }, [organization, organizationId, session?.user?.name, driverVehicle])

  // Manual reconnect function
  const handleReconnect = () => {
    reconnectAttemptsRef.current = 0
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    connectWebSocket()
  }

  // Start geolocation tracking for drivers
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }
        currentLocationRef.current = newLocation
        setCurrentLocation(newLocation)
      },
      (error) => {
        console.error("Geolocation error:", error)
        toast.error("Failed to get location. Please enable location permissions.")
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  }, [])

  // Stop geolocation tracking
  const stopLocationTracking = useCallback(() => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }
  }, [])

  // Generate random location (simulating vehicle movement)
  const generateRandomLocation = useCallback(() => {
    // Start from Kathmandu, Nepal (27.7172, 85.3240) and move randomly
    const baseLat = 27.7172
    const baseLon = 85.3240
    const radius = 0.01 // ~1km radius
    
    // Generate random offset
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.random() * radius
    
    return {
      lat: baseLat + distance * Math.cos(angle),
      lon: baseLon + distance * Math.sin(angle),
    }
  }, [])

  // Send driver data periodically with mock data
  const startSendingData = useCallback(() => {
    if (isSendingDataRef.current) {
      return // Already sending data
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("WebSocket not connected")
      return
    }

    if (!driverVehicleRef.current) {
      toast.error("No vehicle assigned")
      return
    }

    // Initialize with random starting location
    let mockLocation = generateRandomLocation()
    currentLocationRef.current = mockLocation
    setCurrentLocation(mockLocation)

    // Generate mock sensor data
    const generateMockSensorData = () => {
      return {
        accelX: (Math.random() - 0.5) * 2, // -1 to 1 m/s²
        accelY: (Math.random() - 0.5) * 2,
        accelZ: (Math.random() - 0.5) * 2 + 9.8, // Gravity + noise
        gyroX: (Math.random() - 0.5) * 50, // -25 to 25 deg/s
        gyroY: (Math.random() - 0.5) * 50,
        gyroZ: (Math.random() - 0.5) * 50,
      }
    }

    const sendData = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return
      }

      const vehicle = driverVehicleRef.current
      if (!vehicle) {
        return
      }

      // Update location slightly to simulate movement
      const currentLoc = currentLocationRef.current || generateRandomLocation()
      const newLocation = {
        lat: currentLoc.lat + (Math.random() - 0.5) * 0.0001, // Small movement
        lon: currentLoc.lon + (Math.random() - 0.5) * 0.0001,
      }
      currentLocationRef.current = newLocation
      setCurrentLocation(newLocation)

      const sensorData = generateMockSensorData()
      
      const dataToSend = {
        type: "driver:data",
        organizationId: organizationId,
        data: {
          vehicleId: vehicle.id,
          driverName: session?.user?.name || "Driver",
          vehicleType: vehicle.vehicleType,
          latitude: newLocation.lat,
          longitude: newLocation.lon,
          ...sensorData,
        },
      }

      // Update driver's own vehicle marker on their map immediately
      // Only update if location is valid
      if (!isNaN(newLocation.lat) && !isNaN(newLocation.lon)) {
        const vehicleData: VehicleData = {
          vehicleId: vehicle.id,
          driverName: session?.user?.name || "Driver",
          vehicleType: vehicle.vehicleType,
          latitude: newLocation.lat,
          longitude: newLocation.lon,
          accelX: sensorData.accelX,
          accelY: sensorData.accelY,
          accelZ: sensorData.accelZ,
          gyroX: sensorData.gyroX,
          gyroY: sensorData.gyroY,
          gyroZ: sensorData.gyroZ,
          timestamp: Date.now(),
        }

        // Update the vehicles map state to show driver's own position
        setVehicles((prev) => {
          const newMap = new Map(prev)
          newMap.set(vehicleData.vehicleId, vehicleData)
          return newMap
        })
      }

      wsRef.current.send(JSON.stringify(dataToSend))
      console.log("📤 Sending driver data:", dataToSend.data)
    }

    // Send data every second
    dataIntervalRef.current = setInterval(sendData, 1000)
    isSendingDataRef.current = true
    setIsSendingData(true)
    toast.success("Started sending vehicle data")
  }, [organizationId, session?.user?.name, generateRandomLocation])

  // Stop sending data
  const stopSendingData = useCallback(() => {
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current)
      dataIntervalRef.current = null
    }
    isSendingDataRef.current = false
    setIsSendingData(false)
    toast.info("Stopped sending vehicle data")
  }, [])

  useEffect(() => {
    if (session?.user?.accessToken) {
      fetchOrganization()
    }
  }, [session?.user?.accessToken, fetchOrganization])

  // Fetch driver vehicle if user is a driver
  useEffect(() => {
    if (organization && organization.myRole === "DRIVER" && session?.user?.accessToken) {
      fetchDriverVehicle()
    }
  }, [organization, session?.user?.accessToken, fetchDriverVehicle])

  // Reconnect WebSocket when driver vehicle is fetched
  useEffect(() => {
    if (organization?.myRole === "DRIVER" && driverVehicle && wsRef.current?.readyState === WebSocket.OPEN) {
      // Send join:driver message if already connected
      wsRef.current.send(JSON.stringify({
        type: "join:driver",
        organizationId: organizationId,
        name: session?.user?.name || "Driver",
        vechicleId: driverVehicle.id,
        vehicleType: driverVehicle.vehicleType,
      }))
      toast.success("Connected as driver")
    } else if (organization?.myRole === "DRIVER" && driverVehicle && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      // Connect if not connected
      connectWebSocket()
    }
  }, [driverVehicle, organization, organizationId, session?.user?.name, connectWebSocket])

  useEffect(() => {
    if (organization) {
      // Connect WebSocket for all roles
      connectWebSocket()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      stopLocationTracking()
      stopSendingData()
    }
  }, [organization, connectWebSocket, stopLocationTracking, stopSendingData])

  // Note: Data sending is now manual via Start button, not automatic

  const getVehicleIcon = (vehicleType: string) => {
    if (!L) return undefined
    
    const iconConfig = (() => {
      switch (vehicleType) {
        case "CAR":
          return { emoji: "🚗", size: 32, fontSize: 24 }
        case "MOTORCYCLE":
          return { emoji: "🏍️", size: 48, fontSize: 36 } // Larger for visibility
        case "TRUCK":
          return { emoji: "🚚", size: 32, fontSize: 24 }
        case "BUS":
          return { emoji: "🚌", size: 32, fontSize: 24 }
        default:
          return { emoji: "🚙", size: 32, fontSize: 24 }
      }
    })()

    return L.divIcon({
      html: `<div style="font-size: ${iconConfig.fontSize}px; text-align: center; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">${iconConfig.emoji}</div>`,
      className: "custom-marker",
      iconSize: [iconConfig.size, iconConfig.size],
      iconAnchor: [iconConfig.size / 2, iconConfig.size / 2],
    })
  }

  if (!organization) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-muted-foreground">Loading organization...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/${organizationId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{organization.name} - Live Map</h1>
            <p className="text-sm text-muted-foreground">
              {organization.myRole === "DRIVER" 
                ? "Share your location and vehicle data" 
                : "Real-time vehicle tracking"}
            </p>
            {organization.myRole === "DRIVER" && driverVehicle && (
              <p className="text-xs text-muted-foreground mt-1">
                Vehicle: {driverVehicle.vehicleNumber} ({driverVehicle.vehicleType})
              </p>
            )}
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-500">Connected</span>
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                <span className="text-sm text-yellow-500">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-500">Disconnected</span>
              </>
            )}
          </div>
          {connectionStatus === "disconnected" && (
            <Button onClick={handleReconnect} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          )}
          {organization.myRole === "DRIVER" && driverVehicle && (
            <div className="flex items-center gap-2">
              {isSendingData ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-md">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700 dark:text-green-300">Sending data...</span>
                  </div>
                  <Button 
                    onClick={stopSendingData} 
                    variant="destructive" 
                    size="sm"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={startSendingData} 
                  variant="default" 
                  size="sm"
                  disabled={!isConnected}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Sending Data
                </Button>
              )}
            </div>
          )}
          {organization.myRole === "DRIVER" && !driverVehicle && (
            <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-md">
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                No vehicle assigned
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {typeof window !== "undefined" && (
          <MapContainer
            key={`map-${organizationId}`}
            center={[27.7172, 85.3240]} // Default to Kathmandu, Nepal
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            whenReady={() => {
              console.log("Map is ready")
              setMapReady(true)
            }}
          >
            {/* OpenStreetMap Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Mapbox Tile Layer (optional - uncomment to use Mapbox instead of OpenStreetMap) */}
            {/* 
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
              <TileLayer
                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
              />
            )}
            */}

            {/* Vehicle Markers - Only render when map is ready */}
            {mapReady && Array.from(vehicles.values())
              .filter((vehicle) => 
                vehicle.latitude && 
                vehicle.longitude && 
                !isNaN(vehicle.latitude) && 
                !isNaN(vehicle.longitude) &&
                vehicle.latitude !== 0 &&
                vehicle.longitude !== 0
              )
              .map((vehicle) => {
                const icon = getVehicleIcon(vehicle.vehicleType)
                if (!icon) return null
                
                return (
                  <Marker
                    key={vehicle.vehicleId}
                    position={[vehicle.latitude, vehicle.longitude]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-semibold text-lg mb-2">{vehicle.vehicleId}</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Driver:</strong> {vehicle.driverName}</p>
                          <p><strong>Type:</strong> {vehicle.vehicleType}</p>
                          {vehicle.speed !== undefined && (
                            <p><strong>Speed:</strong> {vehicle.speed.toFixed(2)} km/h</p>
                          )}
                          <p><strong>Location:</strong> {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}</p>
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground"><strong>Acceleration:</strong></p>
                            <p className="text-xs">X: {vehicle.accelX.toFixed(2)}, Y: {vehicle.accelY.toFixed(2)}, Z: {vehicle.accelZ.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-1"><strong>Gyroscope:</strong></p>
                            <p className="text-xs">X: {vehicle.gyroX.toFixed(2)}, Y: {vehicle.gyroY.toFixed(2)}, Z: {vehicle.gyroZ.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })
              .filter(Boolean)}

            <MapUpdater vehicles={vehicles} />
          </MapContainer>
        )}
      </div>

      {/* Vehicle List Sidebar */}
      <div className="absolute top-20 right-4 bg-card border rounded-lg shadow-lg p-4 max-h-[calc(100vh-120px)] overflow-y-auto z-[1000] min-w-[300px]">
        <h3 className="font-semibold mb-3">Active Vehicles ({vehicles.size})</h3>
        {vehicles.size === 0 ? (
          <p className="text-sm text-muted-foreground">No vehicles connected</p>
        ) : (
          <div className="space-y-2">
            {Array.from(vehicles.values()).map((vehicle) => (
              <div
                key={vehicle.vehicleId}
                className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => {
                  // Focus on vehicle on map
                  const map = document.querySelector(".leaflet-container") as any
                  if (map && map._leaflet_id) {
                    const leafletMap = (window as any).L?.map?.get(map._leaflet_id)
                    if (leafletMap) {
                      leafletMap.setView([vehicle.latitude, vehicle.longitude], 15)
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vehicle.vehicleId}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.driverName}</p>
                  </div>
                  <span className="text-2xl">
                    {vehicle.vehicleType === "CAR" ? "🚗" : 
                     vehicle.vehicleType === "MOTORCYCLE" ? "🏍️" :
                     vehicle.vehicleType === "TRUCK" ? "🚚" :
                     vehicle.vehicleType === "BUS" ? "🚌" : "🚙"}
                  </span>
                </div>
                {vehicle.speed !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Speed: {vehicle.speed.toFixed(2)} km/h
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
