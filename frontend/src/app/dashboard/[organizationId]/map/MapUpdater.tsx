"use client"
import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"

// Dynamically import leaflet only on client side
let L: any = null
if (typeof window !== "undefined") {
  L = require("leaflet")
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

export function MapUpdater({ vehicles }: { vehicles: Map<string, VehicleData> }) {
  const map = useMap()
  const hasInitialFit = useRef(false)
  const lastVehicleCount = useRef(0)
  
  useEffect(() => {
    if (vehicles.size === 0 || !L || !map) return
    
    // Wait for map to be fully initialized
    if (!map.getContainer() || !map.getContainer()._leaflet_id) {
      return
    }
    
    // Only fit bounds on initial load (when vehicles first appear)
    // Don't refit if vehicles are just updating (count stays the same)
    const currentVehicleCount = vehicles.size
    const isNewVehicle = currentVehicleCount > lastVehicleCount.current
    
    if (!hasInitialFit.current && vehicles.size > 0) {
      try {
        const vehicleLocations = Array.from(vehicles.values())
          .map((v) => [v.latitude, v.longitude] as [number, number])
          .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0)
        
        if (vehicleLocations.length === 0) return
        
        const bounds = L.latLngBounds(vehicleLocations)
        
        // Check if bounds are valid before fitting
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
          hasInitialFit.current = true
        }
      } catch (error) {
        console.error("Error updating map bounds:", error)
      }
    }
    
    // Update the vehicle count reference
    lastVehicleCount.current = currentVehicleCount
  }, [vehicles, map])
  
  return null
}
