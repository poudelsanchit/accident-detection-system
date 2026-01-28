"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

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

let L: any = null
if (typeof window !== "undefined") {
  L = require("leaflet")
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}

export interface AccidentMarker {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  occurredAt: string
  status: string
}

export interface VehicleData {
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

interface OverviewMapProps {
  accidents: AccidentMarker[]
  center: [number, number]
  className?: string
  vehicles?: Map<string, VehicleData>
  onMapReady?: (map: any) => void
}

// Component to handle map centering on new vehicles
function OverviewMapUpdater({ vehicles, onMapReady }: { vehicles?: Map<string, VehicleData>, onMapReady?: (map: any) => void }) {
  const map = useMap()
  const trackedVehicleIds = useRef<Set<string>>(new Set())
  const lastVehicleCount = useRef(0)
  const hasNotifiedMapReady = useRef(false)
  
  // Notify parent when map is ready
  useEffect(() => {
    if (map && onMapReady && !hasNotifiedMapReady.current) {
      onMapReady(map)
      hasNotifiedMapReady.current = true
    }
  }, [map, onMapReady])
  
  useEffect(() => {
    if (!vehicles || vehicles.size === 0 || !map) return
    
    const currentVehicleCount = vehicles.size
    const isNewVehicle = currentVehicleCount > lastVehicleCount.current
    
    // Check for newly connected vehicles
    if (isNewVehicle) {
      const newVehicles = Array.from(vehicles.values()).filter(
        (v) => !trackedVehicleIds.current.has(v.vehicleId)
      )
      
      if (newVehicles.length > 0) {
        // Center map on the first new vehicle
        const newVehicle = newVehicles[0]
        if (
          !isNaN(newVehicle.latitude) &&
          !isNaN(newVehicle.longitude) &&
          newVehicle.latitude !== 0 &&
          newVehicle.longitude !== 0
        ) {
          try {
            map.setView([newVehicle.latitude, newVehicle.longitude], 15, {
              animate: true,
              duration: 1,
            })
            console.log(`Overview map centered on newly connected vehicle: ${newVehicle.vehicleId}`)
          } catch (error) {
            console.error("Error centering overview map on new vehicle:", error)
          }
        }
        
        // Add new vehicles to tracked set
        newVehicles.forEach((v) => trackedVehicleIds.current.add(v.vehicleId))
      }
    }
    
    // Update the vehicle count reference
    lastVehicleCount.current = currentVehicleCount
  }, [vehicles, map])
  
  // Clean up tracked vehicles when they disconnect
  useEffect(() => {
    if (!vehicles) return
    
    const currentVehicleIds = new Set(vehicles.keys())
    const trackedIds = Array.from(trackedVehicleIds.current)
    
    trackedIds.forEach((id) => {
      if (!currentVehicleIds.has(id)) {
        trackedVehicleIds.current.delete(id)
      }
    })
  }, [vehicles])
  
  return null
}

export function OverviewMap({ accidents, center, className = "", vehicles, onMapReady }: OverviewMapProps) {
  if (typeof window === "undefined") {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <span className="text-muted-foreground">Loading map...</span>
      </div>
    )
  }

  const getVehicleIcon = (vehicleType: string) => {
    if (!L) return undefined
    
    const iconConfig = (() => {
      switch (vehicleType) {
        case "CAR":
          return { emoji: "🚗", size: 32, fontSize: 24 }
        case "MOTORCYCLE":
          return { emoji: "🏍️", size: 48, fontSize: 36 }
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

  const getAccidentIcon = () => {
    if (!L) return undefined
    
    return L.divIcon({
      html: `
        <div style="position: relative; width: 40px; height: 40px;">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50% 50% 50% 0;
            transform: translate(-50%, -50%) rotate(-45deg);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
            border: 3px solid white;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
            z-index: 1;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">⚠️</div>
        </div>
      `,
      className: "accident-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    })
  }

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%", minHeight: 320, borderRadius: 8 }}
        scrollWheelZoom={true}
      >
        {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
          <TileLayer
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> | &copy; OSM'
            url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
            tileSize={512}
            zoomOffset={-1}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        
        {/* Map updater to center on new vehicles */}
        <OverviewMapUpdater vehicles={vehicles} onMapReady={onMapReady} />
        
        {/* Vehicle Trails */}
        {vehicles && Array.from(vehicles.values())
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
                color="#2563eb"
                weight={5}
                opacity={0.9}
                dashArray="8, 4"
              />
            )
          })
          .filter(Boolean)}

        {/* Vehicle Markers */}
        {vehicles && Array.from(vehicles.values())
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

        {/* Accident Markers */}
        {accidents
          .filter((a) => !isNaN(a.latitude) && !isNaN(a.longitude))
          .map((accident) => {
            const icon = getAccidentIcon()
            if (!icon) return null
            
            return (
              <Marker 
                key={accident.id} 
                position={[accident.latitude, accident.longitude]}
                icon={icon}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <span className="text-lg">⚠️</span>
                      </div>
                      <h3 className="font-bold text-red-600">{accident.title}</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <strong>Time:</strong> {new Date(accident.occurredAt).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Status:</strong> <span className={`font-semibold ${
                          accident.status === "RESOLVED" ? "text-green-600" : 
                          accident.status === "CONFIRMED" ? "text-orange-600" : 
                          "text-red-600"
                        }`}>{accident.status}</span>
                      </p>
                      {accident.description && (
                        <p className="text-sm mt-2 pt-2 border-t">{accident.description}</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })
          .filter(Boolean)}
      </MapContainer>
    </div>
  )
}
