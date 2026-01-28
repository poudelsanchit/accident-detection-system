"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/core/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { Label } from "@/core/components/ui/label"
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
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
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
  vehicleNumber?: string
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
  positionHistory?: Array<[number, number]> // [latitude, longitude] pairs
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
  ipAddress?: string | null
  port?: number | null
}

interface AvailableVehicle {
  id: string
  vehicleNumber: string
  vehicleType: string
  ipAddress?: string | null
  port?: number | null
}

import { MapUpdater } from "./MapUpdater"
import { MapInstance } from "./MapInstance"

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
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [isSendingData, setIsSendingData] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null) // Backend WebSocket
  const hardwareWsRef = useRef<WebSocket | null>(null) // Hardware device WebSocket
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000 // 3 seconds
  const locationWatchIdRef = useRef<number | null>(null)
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const driverVehicleRef = useRef<DriverVehicle | null>(null)
  const isSendingDataRef = useRef(false)
  const mapInstanceRef = useRef<any>(null)
  const vehicleDirectionRef = useRef<Map<string, { angle: number; baseLat: number; baseLon: number }>>(new Map())
  
  // Speed calculation refs (for hardware data)
  const lastLatRef = useRef<number | null>(null)
  const lastLonRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

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

  // Fetch all vehicles for the organization (for driver to select)
  const fetchAvailableVehicles = useCallback(async () => {
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
        const vehicles = data.vehicles?.map((v: any) => ({
          id: v.id,
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType,
          ipAddress: v.ipAddress,
          port: v.port || 81, // Default to port 81 if not set
        })) || []
        setAvailableVehicles(vehicles)
        
        // If user is a driver, find their assigned vehicle and set it as default
        if (organization?.myRole === "DRIVER") {
          const myVehicle = data.vehicles?.find(
            (v: any) => v.driver?.id === session?.user?.id
          )
          if (myVehicle) {
            const vehicle = {
              id: myVehicle.id,
              vehicleNumber: myVehicle.vehicleNumber,
              vehicleType: myVehicle.vehicleType,
              ipAddress: myVehicle.ipAddress,
              port: myVehicle.port || 81, // Include port, default to 81
            }
            driverVehicleRef.current = vehicle
            setDriverVehicle(vehicle)
            setSelectedVehicleId(myVehicle.id)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    }
  }, [session?.user?.accessToken, session?.user?.id, organizationId, organization?.myRole])

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
        // Join as driver if user is a driver and has a selected vehicle
        else if (organization && organization.myRole === "DRIVER" && driverVehicleRef.current) {
          ws.send(JSON.stringify({
            type: "join:driver",
            organizationId: organizationId,
            name: session?.user?.name || "Driver",
            vechicleId: driverVehicleRef.current.id,
            vehicleType: driverVehicleRef.current.vehicleType,
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
            setVehicles((prev) => {
              const newMap = new Map(prev)
              const existingVehicle = prev.get(data.data.vehicleId)
              
              // Get existing position history or create new array
              const positionHistory = existingVehicle?.positionHistory || []
              
              // Add new position to history
              const newPosition: [number, number] = [data.data.latitude, data.data.longitude]
              const updatedHistory = [...positionHistory, newPosition]
              
              // Keep only last 10 positions
              const trimmedHistory = updatedHistory.slice(-10)
              
              const vehicleData: VehicleData = {
                vehicleId: data.data.vehicleId,
                vehicleNumber: data.data.vehicleNumber,
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
                positionHistory: trimmedHistory,
              }

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
  }, [organization, organizationId, session?.user?.name])

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

  // Calculate speed from GPS coordinates (Haversine formula)
  const calculateSpeed = useCallback((lat: number, lon: number): number => {
    const R = 6371000 // Earth radius in meters
    const toRad = (d: number) => d * Math.PI / 180

    if (lastLatRef.current === null || lastLonRef.current === null || lastTimeRef.current === null) {
      lastLatRef.current = lat
      lastLonRef.current = lon
      lastTimeRef.current = Date.now()
      return 0
    }

    const dLat = toRad(lat - lastLatRef.current)
    const dLon = toRad(lon - lastLonRef.current)
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lastLatRef.current)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const dist = R * c // Distance in meters
    const now = Date.now()
    const timeDiff = (now - lastTimeRef.current) / 1000 // Time difference in seconds
    const speed = timeDiff > 0 ? (dist / timeDiff) * 3.6 : 0 // Convert to km/h

    lastLatRef.current = lat
    lastLonRef.current = lon
    lastTimeRef.current = now

    return speed
  }, [])

  // Stop sending data
  const stopSendingData = useCallback(() => {
    // Close hardware WebSocket connection
    if (hardwareWsRef.current) {
      hardwareWsRef.current.close()
      hardwareWsRef.current = null
    }
    
    // Clear the data sending interval
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current)
      dataIntervalRef.current = null
    }
    
    // Stop location tracking
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current)
      locationWatchIdRef.current = null
    }
    
    // Clear vehicle direction tracking and remove vehicle from map
    if (driverVehicleRef.current) {
      const vehicleId = driverVehicleRef.current.id
      vehicleDirectionRef.current.delete(vehicleId)
      
      // Remove vehicle from map display
      setVehicles((prev) => {
        const newMap = new Map(prev)
        newMap.delete(vehicleId)
        return newMap
      })
    }
    
    // Reset speed calculation refs
    lastLatRef.current = null
    lastLonRef.current = null
    lastTimeRef.current = null
    
    // Reset state
    isSendingDataRef.current = false
    setIsSendingData(false)
    currentLocationRef.current = null
    setCurrentLocation(null)
    
    toast.info("Stopped sending vehicle data")
  }, [])

  // Send driver data periodically with mock data
  const startSendingData = useCallback(() => {
    // If already sending data for a different vehicle, stop it first
    if (isSendingDataRef.current && driverVehicleRef.current) {
      const currentVehicleId = driverVehicleRef.current.id
      if (currentVehicleId !== selectedVehicleId) {
        // Different vehicle selected, stop current one first
        stopSendingData()
        // Wait a bit before starting new vehicle
        setTimeout(() => {
          startSendingData()
        }, 500)
        return
      } else {
        // Same vehicle, already sending
        return
      }
    }

    if (!selectedVehicleId) {
      toast.error("Please select a vehicle first")
      return
    }

    // Find selected vehicle from available vehicles
    const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId)
    if (!selectedVehicle) {
      toast.error("Selected vehicle not found")
      return
    }

    // Clean up previous vehicle if switching (safety check)
    if (driverVehicleRef.current && driverVehicleRef.current.id !== selectedVehicle.id) {
      // Remove previous vehicle from map
      setVehicles((prev) => {
        const newMap = new Map(prev)
        newMap.delete(driverVehicleRef.current!.id)
        return newMap
      })
      // Clear previous vehicle direction
      vehicleDirectionRef.current.delete(driverVehicleRef.current.id)
    }

    // Update driverVehicleRef with selected vehicle (including IP address and port)
    const vehicle = {
      id: selectedVehicle.id,
      vehicleNumber: selectedVehicle.vehicleNumber,
      vehicleType: selectedVehicle.vehicleType,
      ipAddress: selectedVehicle.ipAddress,
      port: selectedVehicle.port || 81, // Use port from database or default to 81
    }
    driverVehicleRef.current = vehicle
    setDriverVehicle(vehicle)

    // Check if vehicle has IP address
    if (!selectedVehicle.ipAddress || selectedVehicle.ipAddress.trim() === "") {
      toast.error("Vehicle IP address not configured. Please add IP address in vehicle settings.")
      return
    }

    // Ensure backend WebSocket is connected before starting
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.info("Connecting to server...")
      connectWebSocket()
      
      // Wait for connection, then start sending
      const checkConnection = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection)
          // Retry starting after connection is established
          setTimeout(() => startSendingData(), 500)
        }
      }, 100)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkConnection)
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          toast.error("Failed to connect to backend. Please try again.")
        }
      }, 5000)
      
      return
    }
    
    // Join as driver with selected vehicle on backend WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join:driver",
        organizationId: organizationId,
        name: session?.user?.name || "Driver",
        vechicleId: vehicle.id,
        vehicleType: vehicle.vehicleType,
      }))
    }

    // Connect to hardware device WebSocket using IP and port from database
    // Simple pattern like HTML - just create WebSocket directly
    const vehiclePort = selectedVehicle.port || 81 // Use port from database or default to 81
    const hardwareWsUrl = `ws://${selectedVehicle.ipAddress}:${vehiclePort}`
    console.log(`Connecting to hardware device at ${hardwareWsUrl}`)
    
    try {
      // Simple WebSocket creation like in HTML
      const hardwareWs = new WebSocket(hardwareWsUrl)
      hardwareWsRef.current = hardwareWs

      hardwareWs.onopen = () => {
        console.log("Hardware WebSocket connected successfully")
        toast.success(`Connected to vehicle device at ${selectedVehicle.ipAddress}:${vehiclePort}`)
        isSendingDataRef.current = true
        setIsSendingData(true)
      }

      // Simple message handler like in HTML - parse JSON and use data directly
      hardwareWs.onmessage = (event) => {
        try {
          // Parse incoming data from hardware device (matching HTML pattern)
          const d = JSON.parse(event.data)
          
          // Extract data fields (matching HTML file format exactly)
          // Hardware may send either { lat, lon } or { lat, lng } (or { latitude, longitude })
          const latRaw = d.lat ?? d.latitude
          const lonRaw = d.lon ?? d.lng ?? d.longitude
          const lat = typeof latRaw === "number" ? latRaw : parseFloat(latRaw)
          const lon = typeof lonRaw === "number" ? lonRaw : parseFloat(lonRaw)
          const accelX = parseFloat(d.accelX) || 0
          const accelY = parseFloat(d.accelY) || 0
          const accelZ = parseFloat(d.accelZ) || 0
          const gyroX = parseFloat(d.gyroX) || 0
          const gyroY = parseFloat(d.gyroY) || 0
          const gyroZ = parseFloat(d.gyroZ) || 0
          const accelMagnitude = parseFloat(d.accelMagnitude) || 0

          // Validate GPS coordinates
          if (isNaN(lat) || isNaN(lon)) {
            console.warn("Invalid GPS coordinates received:", d)
            return
          }

          // Calculate speed from GPS coordinates
          const speed = calculateSpeed(lat, lon)

          // Update current location
          currentLocationRef.current = { lat, lon }
          setCurrentLocation({ lat, lon })

          // Forward data to backend WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && driverVehicleRef.current) {
            const dataToSend = {
              type: "driver:data",
              organizationId: organizationId,
              data: {
                vehicleId: driverVehicleRef.current.id,
                vehicleNumber: driverVehicleRef.current.vehicleNumber,
                driverName: session?.user?.name || "Driver",
                vehicleType: driverVehicleRef.current.vehicleType,
                latitude: lat,
                longitude: lon,
                accelX: accelX,
                accelY: accelY,
                accelZ: accelZ,
                gyroX: gyroX,
                gyroY: gyroY,
                gyroZ: gyroZ,
                speed: speed,
              },
            }

            wsRef.current.send(JSON.stringify(dataToSend))
            console.log("📤 Forwarding hardware data to backend:", dataToSend.data)

            // Update driver's own vehicle marker on their map immediately
            setVehicles((prev) => {
              const newMap = new Map(prev)
              const existingVehicle = prev.get(driverVehicleRef.current!.id)
              
              // Get existing position history or create new array
              const positionHistory = existingVehicle?.positionHistory || []
              
              // Add new position to history
              const newPosition: [number, number] = [lat, lon]
              const updatedHistory = [...positionHistory, newPosition]
              
              // Keep only last 10 positions
              const trimmedHistory = updatedHistory.slice(-10)
              
              const vehicleData: VehicleData = {
                vehicleId: driverVehicleRef.current!.id,
                vehicleNumber: driverVehicleRef.current!.vehicleNumber,
                driverName: session?.user?.name || "Driver",
                vehicleType: driverVehicleRef.current!.vehicleType,
                latitude: lat,
                longitude: lon,
                accelX: accelX,
                accelY: accelY,
                accelZ: accelZ,
                gyroX: gyroX,
                gyroY: gyroY,
                gyroZ: gyroZ,
                speed: speed,
                timestamp: Date.now(),
                positionHistory: trimmedHistory,
              }

              newMap.set(vehicleData.vehicleId, vehicleData)
              return newMap
            })
          }
        } catch (error) {
          console.error("Error parsing hardware data:", error)
        }
      }

      // WebSocket error handler - errors are usually handled by onclose
      hardwareWs.onerror = () => {
        console.error(`WebSocket error occurred for ${hardwareWsUrl}`)
        console.error("Note: WebSocket errors are usually handled by onclose event")
        // Don't update state here - let onclose handle it
      }

      hardwareWs.onclose = (event) => {
        console.log("Hardware WebSocket closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: hardwareWsUrl
        })
        
        hardwareWsRef.current = null
        
        if (isSendingDataRef.current) {
          if (event.code === 1006) {
            // Abnormal closure - connection failed
            console.error("Connection failed: Abnormal closure (1006)")
            console.error("Possible causes:")
            console.error("1. Device is not reachable on the network")
            console.error("2. WebSocket server is not running on the device")
            console.error("3. Firewall is blocking the connection")
            console.error("4. Device IP address is incorrect")
            toast.error(`Connection to ${selectedVehicle.ipAddress}:${vehiclePort} failed. Check network connectivity and device status.`)
          } else if (event.code === 1000) {
            // Normal closure
            console.log("Connection closed normally")
            toast.info("Connection to vehicle device closed")
          } else {
            console.error(`Connection closed with code: ${event.code}, reason: ${event.reason || 'none'}`)
            toast.warning("Connection to vehicle device lost")
          }
          stopSendingData()
        }
      }
    } catch (error) {
      console.error("Error connecting to hardware device:", error)
      toast.error(`Failed to connect to vehicle device: ${error}`)
      stopSendingData()
    }
  }, [organizationId, session?.user?.name, connectWebSocket, selectedVehicleId, availableVehicles, stopSendingData, calculateSpeed])

  useEffect(() => {
    if (session?.user?.accessToken) {
      fetchOrganization()
    }
  }, [session?.user?.accessToken, fetchOrganization])

  // Fetch available vehicles for driver to select
  useEffect(() => {
    if (organization && organization.myRole === "DRIVER" && session?.user?.accessToken) {
      fetchAvailableVehicles()
    }
  }, [organization, session?.user?.accessToken, fetchAvailableVehicles])

  // Reconnect WebSocket when driver selects a vehicle
  useEffect(() => {
    if (organization?.myRole === "DRIVER" && selectedVehicleId && driverVehicleRef.current) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send join:driver message if already connected
        wsRef.current.send(JSON.stringify({
          type: "join:driver",
          organizationId: organizationId,
          name: session?.user?.name || "Driver",
          vechicleId: driverVehicleRef.current.id,
          vehicleType: driverVehicleRef.current.vehicleType,
        }))
      } else if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Connect if not connected (will join when connected)
        connectWebSocket()
      }
    }
  }, [selectedVehicleId, organization, organizationId, session?.user?.name, connectWebSocket])

  useEffect(() => {
    if (organization) {
      // Connect WebSocket for all roles
      // For drivers, wait a bit for vehicle to be fetched
      if (organization.myRole === "DRIVER") {
        // Wait a bit for vehicle to be fetched before connecting
        const timeoutId = setTimeout(() => {
          connectWebSocket()
        }, 500)
        return () => {
          clearTimeout(timeoutId)
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
      } else {
        connectWebSocket()
      }
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
          {organization.myRole === "DRIVER" && (
            <div className="flex items-center gap-3 relative z-50">
              {!isSendingData ? (
                <>
                  <div className="flex items-center gap-2 relative z-50">
                    <Label htmlFor="vehicle-select" className="text-sm whitespace-nowrap">
                      Select Vehicle:
                    </Label>
                    <Select
                      value={selectedVehicleId}
                      onValueChange={(newVehicleId) => {
                        // If currently sending data, stop it first before switching
                        if (isSendingData && driverVehicleRef.current) {
                          stopSendingData()
                          // Wait for cleanup before switching
                          setTimeout(() => {
                            setSelectedVehicleId(newVehicleId)
                          }, 300)
                        } else {
                          // Clean up previous vehicle from map if switching
                          if (driverVehicleRef.current && driverVehicleRef.current.id !== newVehicleId) {
                            setVehicles((prev) => {
                              const newMap = new Map(prev)
                              newMap.delete(driverVehicleRef.current!.id)
                              return newMap
                            })
                            vehicleDirectionRef.current.delete(driverVehicleRef.current.id)
                          }
                          setSelectedVehicleId(newVehicleId)
                        }
                      }}
                      disabled={isSendingData}
                    >
                      <SelectTrigger id="vehicle-select" className="w-[200px]">
                        <SelectValue placeholder="Choose a vehicle" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {availableVehicles.length === 0 ? (
                          <SelectItem value="no-vehicles" disabled>
                            No vehicles available
                          </SelectItem>
                        ) : (
                          availableVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicleNumber} ({vehicle.vehicleType})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={startSendingData} 
                    variant="default" 
                    size="sm"
                    disabled={!isConnected || !selectedVehicleId}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Sending Data
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-md">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Sending data for {driverVehicle?.vehicleNumber || "vehicle"}...
                    </span>
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        {typeof window !== "undefined" && (
          <MapContainer
            key={`map-${organizationId}`}
            center={[27.7172, 85.3240]} // Default to Kathmandu, Nepal
            zoom={13}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            whenReady={() => {
              console.log("Map is ready")
              setMapReady(true)
            }}
          >
            {/* Mapbox Tile Layer */}
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <TileLayer
                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                tileSize={512}
                zoomOffset={-1}
              />
            ) : (
              /* Fallback to OpenStreetMap if Mapbox token is not available */
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}

            {/* Vehicle Trails - Draw path lines */}
            {mapReady && Array.from(vehicles.values())
              .filter((vehicle) => 
                vehicle.positionHistory && 
                vehicle.positionHistory.length >= 2
              )
              .map((vehicle) => {
                if (!vehicle.positionHistory) return null
                
                return (
                  <Polyline
                    key={`trail-${vehicle.vehicleId}`}
                    positions={vehicle.positionHistory}
                    color="#2563eb" // Blue color for all trails
                    weight={5} // Thicker line for better visibility
                    opacity={0.9} // More opaque for better visibility
                    dashArray="8, 4" // Longer dashes for better visibility
                  />
                )
              })
              .filter(Boolean)}

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
                        <h3 className="font-semibold text-lg mb-2">{vehicle.vehicleNumber || vehicle.vehicleId}</h3>
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
            <MapInstance setMapInstance={(map) => { mapInstanceRef.current = map }} />
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
                  // Focus on vehicle on map with smooth pan and zoom
                  const map = mapInstanceRef.current
                  if (map && vehicle.latitude && vehicle.longitude && L) {
                    try {
                      // Check if vehicle is currently visible in viewport
                      const bounds = map.getBounds()
                      const vehicleLatLng = L.latLng(vehicle.latitude, vehicle.longitude)
                      
                      if (!bounds.contains(vehicleLatLng)) {
                        // Vehicle is not visible, pan and zoom to it
                        map.setView(
                          [vehicle.latitude, vehicle.longitude], 
                          15, 
                          { animate: true, duration: 0.5 }
                        )
                      } else {
                        // Vehicle is visible, just center on it with a slight zoom
                        map.setView(
                          [vehicle.latitude, vehicle.longitude], 
                          Math.max(map.getZoom(), 15),
                          { animate: true, duration: 0.5 }
                        )
                      }
                    } catch (error) {
                      console.error("Error focusing on vehicle:", error)
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vehicle.vehicleNumber || vehicle.vehicleId}</p>
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
