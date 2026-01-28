"use client"

import { useState } from "react"
import { AccidentAlert } from "./accident-alert"
import { Button } from "./ui/button"

/**
 * Example usage component for AccidentAlert
 * 
 * Integration guide:
 * 1. Import AccidentAlert into your map/dashboard page
 * 2. Manage alert state (isVisible, accident data)
 * 3. Connect to your real-time accident detection system
 * 4. Handle onViewLocation to focus map on accident coordinates
 * 5. Handle onAcknowledge to dismiss alert and update backend
 */
export function AccidentAlertExample() {
  const [showAlert, setShowAlert] = useState(false)

  // Simulate accident detection
  const triggerAccident = () => {
    setShowAlert(true)
  }

  const handleViewLocation = () => {
    console.log("Focusing map on accident location...")
    // Example: map.flyTo([latitude, longitude], zoom)
    // Example: setMapCenter({ lat: 40.7128, lng: -74.0060 })
  }

  const handleAcknowledge = () => {
    console.log("Accident acknowledged, dismissing alert...")
    setShowAlert(false)
    // Example: Update backend that accident was acknowledged
    // Example: await fetch('/api/accidents/123/acknowledge', { method: 'POST' })
  }

  return (
    <div className="p-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Accident Alert Demo</h2>
        <p className="text-muted-foreground">
          Click the button below to simulate an accident detection
        </p>
        
        <Button onClick={triggerAccident}>
          Trigger Accident Alert
        </Button>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Integration Example:</h3>
          <pre className="text-xs overflow-x-auto">
{`// In your dashboard/map component:
import { AccidentAlert } from "@/core/components/accident-alert"

const [activeAccident, setActiveAccident] = useState(null)

// Listen to real-time accident events
useEffect(() => {
  const socket = io(BACKEND_URL)
  
  socket.on('accident-detected', (data) => {
    setActiveAccident(data)
  })
  
  return () => socket.disconnect()
}, [])

// Render the alert
<AccidentAlert
  isVisible={!!activeAccident}
  vehicleId={activeAccident?.vehicleId}
  vehicleName={activeAccident?.vehicleName}
  location={activeAccident?.location}
  timestamp={activeAccident?.timestamp}
  onViewLocation={() => {
    // Focus map on accident coordinates
    mapRef.current?.flyTo([
      activeAccident.latitude,
      activeAccident.longitude
    ], 16)
  }}
  onAcknowledge={async () => {
    // Acknowledge and dismiss
    await acknowledgeAccident(activeAccident.id)
    setActiveAccident(null)
  }}
/>`}
          </pre>
        </div>
      </div>

      {/* The actual alert component */}
      <AccidentAlert
        isVisible={showAlert}
        vehicleId="VH-2024-001"
        vehicleName="Tesla Model 3"
        location="123 Main St, San Francisco, CA"
        timestamp={new Date()}
        onViewLocation={handleViewLocation}
        onAcknowledge={handleAcknowledge}
      />
    </div>
  )
}
