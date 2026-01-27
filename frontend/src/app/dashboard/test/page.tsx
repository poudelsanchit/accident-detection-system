"use client"

import { useEffect, useRef, useState } from "react"

interface HardwareData {
  lat: number
  lon: number
  accelX: number
  accelY: number
  accelZ: number
  gyroX: number
  gyroY: number
  gyroZ: number
  accelMagnitude: number
}

export default function HardwareTestPage() {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState("DISCONNECTED")
  const [data, setData] = useState<HardwareData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const WS_URL = "ws://192.168.1.195:81"

  useEffect(() => {
    console.log("🔌 Connecting to", WS_URL)
    setStatus("CONNECTING")
    setError(null)

    // Create WebSocket connection
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("✅ WebSocket connected")
      setStatus("CONNECTED")
      setError(null)
    }

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        console.log("📨 Received data:", d)
        setData({
          lat: +d.lat || 0,
          lon: +d.lon || 0,
          accelX: +d.accelX || 0,
          accelY: +d.accelY || 0,
          accelZ: +d.accelZ || 0,
          gyroX: +d.gyroX || 0,
          gyroY: +d.gyroY || 0,
          gyroZ: +d.gyroZ || 0,
          accelMagnitude: +d.accelMagnitude || 0,
        })
      } catch (err) {
        console.error("❌ JSON parse error", err, "Raw data:", e.data)
        setError(`JSON parse error: ${err}. Raw data: ${e.data}`)
      }
    }

    ws.onerror = (err) => {
      console.error("❌ WebSocket error", err)
      setError("WebSocket error occurred. Check console for details.")
      setStatus("ERROR")
    }

    ws.onclose = (e) => {
      console.log("🔌 WebSocket closed", {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean
      })
      
      if (e.code === 1006) {
        setError(`Connection failed (code ${e.code}). Possible causes: Device not reachable, WebSocket server not running, or firewall blocking connection.`)
      } else if (e.code !== 1000) {
        setError(`Connection closed unexpectedly (code ${e.code}): ${e.reason || 'No reason provided'}`)
      }
      
      setStatus("DISCONNECTED")
      wsRef.current = null
    }

    // Cleanup function - only close if still connected
    return () => {
      console.log("🧹 Cleaning up WebSocket")
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounting")
      }
      wsRef.current = null
    }
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h1>🚗 Hardware WebSocket Test</h1>
      
      <div style={{ marginBottom: 20 }}>
        <p><strong>WebSocket URL:</strong> {WS_URL}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span style={{
            color: status === "CONNECTED" ? "green" : status === "CONNECTING" ? "orange" : "red",
            fontWeight: "bold"
          }}>
            {status}
          </span>
        </p>
        {error && (
          <div style={{ 
            background: "#fee", 
            color: "#c00", 
            padding: 10, 
            marginTop: 10,
            borderRadius: 4,
            border: "1px solid #c00"
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {data ? (
        <div>
          <h2>📊 Latest Data:</h2>
          <pre style={{ 
            background: "#111", 
            color: "#0f0", 
            padding: 12,
            borderRadius: 4,
            overflow: "auto"
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          
          <div style={{ marginTop: 20 }}>
            <h3>Details:</h3>
            <ul>
              <li><strong>GPS:</strong> Lat {data.lat.toFixed(6)}, Lon {data.lon.toFixed(6)}</li>
              <li><strong>Acceleration:</strong> X={data.accelX.toFixed(2)} Y={data.accelY.toFixed(2)} Z={data.accelZ.toFixed(2)}</li>
              <li><strong>Gyroscope:</strong> X={data.gyroX.toFixed(2)} Y={data.gyroY.toFixed(2)} Z={data.gyroZ.toFixed(2)}</li>
              <li><strong>Accel Magnitude:</strong> {data.accelMagnitude.toFixed(2)}</li>
            </ul>
          </div>

          {data.accelMagnitude > 15 && (
            <h2 style={{ color: "red", marginTop: 20 }}>
              🚨 ACCIDENT DETECTED!
            </h2>
          )}
        </div>
      ) : (
        <p>No data yet… Waiting for messages from hardware device.</p>
      )}
    </div>
  )
}
