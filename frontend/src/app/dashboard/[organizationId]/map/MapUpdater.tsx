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
  const trackedVehicleIds = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    if (vehicles.size === 0 || !L || !map) return
    
    // Wait for map to be fully initialized
    const container = map.getContainer() as (HTMLElement & { _leaflet_id?: number }) | null
    if (!container || !container._leaflet_id) {
      return
    }
    
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
            console.log(`Map centered on newly connected vehicle: ${newVehicle.vehicleId}`)
          } catch (error) {
            console.error("Error centering map on new vehicle:", error)
          }
        }
        
        // Add new vehicles to tracked set
        newVehicles.forEach((v) => trackedVehicleIds.current.add(v.vehicleId))
      }
    }
    
    // Only fit bounds on initial load (when vehicles first appear)
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
  
  // Clean up tracked vehicles when they disconnect
  useEffect(() => {
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
