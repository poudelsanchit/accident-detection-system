"use client"

import dynamic from "next/dynamic"
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

interface OverviewMapProps {
  accidents: AccidentMarker[]
  center: [number, number]
  className?: string
}

export function OverviewMap({ accidents, center, className = "" }: OverviewMapProps) {
  if (typeof window === "undefined") {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <span className="text-muted-foreground">Loading map...</span>
      </div>
    )
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
        {accidents
          .filter((a) => !isNaN(a.latitude) && !isNaN(a.longitude))
          .map((accident) => (
            <Marker key={accident.id} position={[accident.latitude, accident.longitude]}>
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-semibold">{accident.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(accident.occurredAt).toLocaleString()} · {accident.status}
                  </p>
                  {accident.description && (
                    <p className="text-sm mt-2">{accident.description}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
