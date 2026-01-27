"use client"
import { useEffect } from "react"
import { useMap } from "react-leaflet"

interface MapInstanceProps {
  setMapInstance: (map: any) => void
}

export function MapInstance({ setMapInstance }: MapInstanceProps) {
  const map = useMap()
  
  useEffect(() => {
    if (map) {
      setMapInstance(map)
    }
    
    return () => {
      setMapInstance(null)
    }
  }, [map, setMapInstance])
  
  return null
}
