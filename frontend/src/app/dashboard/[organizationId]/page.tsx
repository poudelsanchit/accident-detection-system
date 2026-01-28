"use client"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/core/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/core/components/ui/dialog"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/core/components/ui/card"
import { 
    Plus, 
    Car, 
    ArrowLeft, 
    User, 
    AlertTriangle,
    Phone,
    MapPin,
    Settings,
    UserPlus,
    X,
    Shield,
    Eye,
    UserCog,
    LayoutDashboard,
    Users,
    CheckCircle,
    FileWarning,
    RefreshCw,
    Square,
    Wifi,
    WifiOff,
    Loader2
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    BarChart,
    Bar,
} from "recharts"
import { OverviewMap } from "./OverviewMap"
import { AccidentAlert } from "@/core/components/accident-alert"
import { DriverSafetyDialog } from "@/core/components/driver-safety-dialog"

interface Accident {
    id: string
    title: string
    description: string | null
    latitude: number
    longitude: number
    occurredAt: string
    status: string
    vehicle?: { vehicleNumber: string; vehicleType: string }
}

interface Vehicle {
    id: string
    vehicleNumber: string
    vehicleType: string
    ipAddress?: string | null
    port?: number | null
    driver: {
        id: string
        phoneNumber: string
        fullName: string | null
    }
    accidents: Array<{
        id: string
        title: string
        status: string
        occurredAt: string
    }>
    createdAt: string
}

interface Organization {
    id: string
    name: string
    address: string
    phoneNumber: string
    organizationType: string
    myRole: string
    members?: Array<{
        role: string
        user: {
            id: string
            phoneNumber: string
            fullName: string | null
        }
    }>
}

export default function OrganizationDetailPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const params = useParams()
    const organizationId = params.organizationId as string

    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingVehicles, setLoadingVehicles] = useState(true)
    const [orgVehicles, setOrgVehicles] = useState<Vehicle[]>([])
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [formData, setFormData] = useState({
        vehicleNumber: "",
        vehicleType: "",
        driverId: "",
        ipAddress: "",
        port: 81,
    })
    const [drivers, setDrivers] = useState<Array<{ id: string; phoneNumber: string; fullName: string | null }>>([])
    const [activeTab, setActiveTab] = useState<"overview" | "vehicles" | "settings" | "reports">("overview")
    const [accidents, setAccidents] = useState<Accident[]>([])
    const [accidentsLast24h, setAccidentsLast24h] = useState<Accident[]>([])
    const [loadingAccidents, setLoadingAccidents] = useState(true)
    const [invitations, setInvitations] = useState<Array<{
        id: string
        inviteRole: string
        user: {
            id: string
            phoneNumber: string
            fullName: string | null
        }
        createdAt: string
    }>>([])
    const [loadingInvitations, setLoadingInvitations] = useState(false)
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [inviteFormData, setInviteFormData] = useState({
        phoneNumber: "",
        inviteRole: "",
    })
    const [isInviting, setIsInviting] = useState(false)
    const [selectedVehicleForSend, setSelectedVehicleForSend] = useState<string>("")
    
    // Real-time accident markers from WebSocket
    const [realtimeAccidentMarkers, setRealtimeAccidentMarkers] = useState<Map<string, {
        id: string
        title: string
        description: string | null
        latitude: number
        longitude: number
        occurredAt: string
        status: string
    }>>(new Map())
    
    // Accident alert state for popover
    const [accidentAlertVisible, setAccidentAlertVisible] = useState(false)
    const [accidentAlertData, setAccidentAlertData] = useState<{
        vehicleId: string
        vehicleName: string
        location: string
        timestamp: Date
        latitude: number
        longitude: number
    } | null>(null)
    
    // Driver safety dialog state (only for drivers)
    const [driverSafetyDialogVisible, setDriverSafetyDialogVisible] = useState(false)
    const [currentAccidentId, setCurrentAccidentId] = useState<string | null>(null)
    
    // Reports state
    const [reportFilter, setReportFilter] = useState<"week" | "month" | "custom">("week")
    const [reportStartDate, setReportStartDate] = useState("")
    const [reportEndDate, setReportEndDate] = useState("")
    const [isGeneratingReport, setIsGeneratingReport] = useState(false)
    
    // Vehicle tracking state for map
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
    const [vehicles, setVehicles] = useState<Map<string, VehicleData>>(new Map())
    
    // Map instance ref for programmatic control
    const overviewMapRef = useRef<any>(null)
    
    // Track vehicle activity timeouts
    const vehicleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
    const VEHICLE_TIMEOUT_MS = 10000 // 10 seconds without data = consider disconnected
    
    // WebSocket and data sending state
    const [isSendingData, setIsSendingData] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "stopped">("disconnected")
    const [isConnecting, setIsConnecting] = useState(false)
    const [hasReceivedData, setHasReceivedData] = useState(false)
    const hasReceivedDataRef = useRef(false) // Use ref to track in closure
    
    // WebSocket refs
    const wsRef = useRef<WebSocket | null>(null) // Backend WebSocket
    const hardwareWsRef = useRef<WebSocket | null>(null) // Hardware device WebSocket
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const maxReconnectAttempts = 5
    const reconnectDelay = 3000 // 3 seconds
    const locationWatchIdRef = useRef<number | null>(null)
    const dataIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const currentLocationRef = useRef<{ lat: number; lon: number } | null>(null)
    const driverVehicleRef = useRef<{ id: string; vehicleNumber: string; vehicleType: string; ipAddress?: string | null; port?: number | null } | null>(null)
    const isSendingDataRef = useRef(false)
    
    // Speed calculation refs (for hardware data)
    const lastLatRef = useRef<number | null>(null)
    const lastLonRef = useRef<number | null>(null)
    const lastTimeRef = useRef<number | null>(null)
    
    // Timeout detection for when data stops coming
    const lastDataReceivedRef = useRef<number | null>(null)
    const dataTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const DATA_TIMEOUT_MS = 10000 // 10 seconds without data = consider stopped

    // Fetch organization details and drivers
    const fetchOrganization = async () => {
        if (!session?.user?.accessToken) return

        try {
            // Try fetching from my-organizations first
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
                let org = data.organizations.find((o: Organization) => o.id === organizationId)
                
                // If not found in my-organizations, try public-organizations
                if (!org) {
                    const publicResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organization/public-organizations`,
                        {
                            headers: {
                                Authorization: session.user.accessToken,
                            },
                        }
                    )
                    
                    if (publicResponse.ok) {
                        const publicData = await publicResponse.json()
                        org = publicData.organizations.find((o: Organization) => o.id === organizationId)
                    }
                }
                
                if (org) {
                    setOrganization(org)
                    // Extract drivers from members
                    const driverMembers = org.members?.filter(
                        (m: any) => m.role === "DRIVER"
                    ) || []
                    const driverUsers = driverMembers.map((m: any) => m.user)
                    setDrivers(driverUsers)
                } else {
                    toast.error("Organization not found")
                    router.push("/dashboard")
                }
            }
        } catch (error) {
            console.error("Error fetching organization:", error)
        }
    }

    // Fetch vehicles
    const fetchVehicles = async () => {
        if (!session?.user?.accessToken || !organizationId) return

        try {
            setLoadingVehicles(true)
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
                setOrgVehicles(data.vehicles || [])
            } else {
                const errorData = await response.json()
                toast.error(errorData.message || "Failed to fetch vehicles")
            }
        } catch (error) {
            console.error("Error fetching vehicles:", error)
            toast.error("An error occurred while fetching vehicles")
        } finally {
            setLoadingVehicles(false)
        }
    }

    // Fetch accidents (all and last 24h)
    const fetchAccidents = async () => {
        if (!session?.user?.accessToken || !organizationId) return
        try {
            setLoadingAccidents(true)
            const [allRes, last24Res] = await Promise.all([
                fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accident?organizationId=${organizationId}`,
                    { headers: { Authorization: session.user.accessToken } }
                ),
                fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accident?organizationId=${organizationId}&occurredAfter=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`,
                    { headers: { Authorization: session.user.accessToken } }
                ),
            ])
            if (allRes.ok) {
                const d = await allRes.json()
                setAccidents(d.accidents || [])
            }
            if (last24Res.ok) {
                const d = await last24Res.json()
                setAccidentsLast24h(d.accidents || [])
            }
        } catch (e) {
            console.error("Error fetching accidents:", e)
        } finally {
            setLoadingAccidents(false)
        }
    }

    // Fetch invitations
    const fetchInvitations = async () => {
        if (!session?.user?.accessToken || !organizationId) return

        try {
            setLoadingInvitations(true)
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invitation/organization/${organizationId}`,
                {
                    headers: {
                        Authorization: session.user.accessToken,
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setInvitations(data.invitations || [])
            } else {
                const errorData = await response.json()
                toast.error(errorData.message || "Failed to fetch invitations")
            }
        } catch (error) {
            console.error("Error fetching invitations:", error)
            toast.error("An error occurred while fetching invitations")
        } finally {
            setLoadingInvitations(false)
        }
    }

    // Handle driver confirming they are safe (resolve accident)
    const handleDriverConfirmSafe = async (accidentId: string) => {
        if (!session?.user?.accessToken) return

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accident/${accidentId}/resolve`,
                {
                    method: "POST",
                    headers: {
                        Authorization: session.user.accessToken,
                        "Content-Type": "application/json",
                    },
                }
            )

            if (response.ok) {
                toast.success("Accident marked as resolved. Notifications sent to your organization.")
                setDriverSafetyDialogVisible(false)
                setCurrentAccidentId(null)
                // Refresh accidents list
                fetchAccidents()
            } else {
                const errorData = await response.json()
                toast.error(errorData.message || "Failed to resolve accident")
            }
        } catch (error) {
            console.error("Error resolving accident:", error)
            toast.error("An error occurred while resolving the accident")
        }
    }

    // Generate accident report PDF
    const handleGenerateReport = async () => {
        if (!session?.user?.accessToken || !organizationId) return

        try {
            setIsGeneratingReport(true)

            let startDate: Date
            let endDate: Date = new Date()

            if (reportFilter === "week") {
                startDate = new Date()
                startDate.setDate(startDate.getDate() - 7)
            } else if (reportFilter === "month") {
                startDate = new Date()
                startDate.setMonth(startDate.getMonth() - 1)
            } else {
                if (!reportStartDate || !reportEndDate) {
                    toast.error("Please select both start and end dates")
                    setIsGeneratingReport(false)
                    return
                }
                startDate = new Date(reportStartDate)
                endDate = new Date(reportEndDate)
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/report/accident/${organizationId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                {
                    headers: {
                        Authorization: session.user.accessToken,
                    },
                }
            )

            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `accident-report-${organizationId}-${Date.now()}.pdf`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                toast.success("Report generated successfully")
            } else {
                const errorData = await response.json()
                toast.error(errorData.message || "Failed to generate report")
            }
        } catch (error) {
            console.error("Error generating report:", error)
            toast.error("An error occurred while generating the report")
        } finally {
            setIsGeneratingReport(false)
        }
    }

    useEffect(() => {
        if (session?.user?.accessToken && organizationId) {
            fetchOrganization()
            fetchVehicles()
            fetchInvitations()
            fetchAccidents()
        }
    }, [session?.user?.accessToken, organizationId])

    // When driver has exactly one assigned vehicle, pre-select it for "Start Sending Data"
    useEffect(() => {
        if (organization?.myRole === "DRIVER" && orgVehicles.length > 0 && !selectedVehicleForSend) {
            const myVehicles = orgVehicles.filter((v) => v.driver?.id === session?.user?.id)
            if (myVehicles.length === 1) {
                setSelectedVehicleForSend(myVehicles[0].id)
            }
        }
    }, [organization?.myRole, orgVehicles, session?.user?.id, selectedVehicleForSend])

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
                setIsConnecting(false)
                setConnectionStatus("connected")
                reconnectAttemptsRef.current = 0
                
                // Join as viewer if user is admin or viewer
                if (organization && (organization.myRole === "ADMIN" || organization.myRole === "VIEWER")) {
                    const joinMessage = {
                        type: "join:viewer",
                        organizationId: organizationId,
                        name: session?.user?.name || "Viewer",
                    }
                    console.log("📤 Sending join:viewer message:", joinMessage)
                    ws.send(JSON.stringify(joinMessage))
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
                }
            }

            ws.onmessage = (event) => {
                try {
                    const message = event.data
                    if (typeof message === "string" && message === "WebSocket connected") {
                        return
                    }

                    const data = JSON.parse(message)
                    
                    if (data.type === "driver:data" && data.data) {
                        const vehicleId = data.data.vehicleId
                        console.log(`📍 Received vehicle data for ${vehicleId}:`, {
                            vehicleNumber: data.data.vehicleNumber,
                            driverName: data.data.driverName,
                            location: [data.data.latitude, data.data.longitude],
                            speed: data.data.speed
                        })
                        
                        // Clear existing timeout for this vehicle
                        if (vehicleTimeoutsRef.current.has(vehicleId)) {
                            clearTimeout(vehicleTimeoutsRef.current.get(vehicleId)!)
                        }
                        
                        // Set new timeout to remove vehicle if no data received
                        const timeout = setTimeout(() => {
                            console.log(`Vehicle ${vehicleId} timed out - removing from active vehicles`)
                            setVehicles((prev) => {
                                const newMap = new Map(prev)
                                newMap.delete(vehicleId)
                                return newMap
                            })
                            vehicleTimeoutsRef.current.delete(vehicleId)
                        }, VEHICLE_TIMEOUT_MS)
                        
                        vehicleTimeoutsRef.current.set(vehicleId, timeout)
                        
                        // Update vehicle position on map
                        setVehicles((prev) => {
                            const newMap = new Map(prev)
                            const existingVehicle = prev.get(vehicleId)
                            
                            // Get existing position history or create new array
                            const positionHistory = existingVehicle?.positionHistory || []
                            
                            // Add new position to history
                            const newPosition: [number, number] = [data.data.latitude, data.data.longitude]
                            const updatedHistory = [...positionHistory, newPosition]
                            
                            // Keep only last 10 positions
                            const trimmedHistory = updatedHistory.slice(-10)
                            
                            const vehicleData: VehicleData = {
                                vehicleId: vehicleId,
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

                            newMap.set(vehicleId, vehicleData)
                            return newMap
                        })
                        
                        // Reset timeout when data is received
                        lastDataReceivedRef.current = Date.now()
                        if (dataTimeoutRef.current) {
                            clearTimeout(dataTimeoutRef.current)
                            dataTimeoutRef.current = null
                        }
                    }
                    
                    // Handle accident detection messages
                    if (data.type === "accident:detected" && data.data) {
                        console.log("🚨 Accident detected via WebSocket:", data.data)
                        
                        // Add accident marker to map
                        const accidentMarker = {
                            id: `realtime-${data.data.vehicleId}-${Date.now()}`,
                            title: `Accident: ${data.data.driverName}`,
                            description: `Vehicle: ${data.data.vehicleType}`,
                            latitude: data.data.location.latitude,
                            longitude: data.data.location.longitude,
                            occurredAt: data.data.timestamp,
                            status: "REPORTED",
                        }
                        
                        setRealtimeAccidentMarkers((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(accidentMarker.id, accidentMarker)
                            return newMap
                        })
                        
                        // Check if this accident is for the current driver
                        const isMyAccident = organization?.myRole === "DRIVER" && 
                                            data.data.vehicleId === driverVehicleRef.current?.id
                        
                        console.log("🔍 Accident check:", {
                            myRole: organization?.myRole,
                            accidentVehicleId: data.data.vehicleId,
                            myVehicleId: driverVehicleRef.current?.id,
                            isMyAccident,
                            hasAccidentId: !!data.data.accidentId
                        })
                        
                        if (isMyAccident && data.data.accidentId) {
                            console.log("✅ Showing driver safety dialog for accident:", data.data.accidentId)
                            // Show driver safety dialog for the driver involved (ONLY this, not the alert)
                            setCurrentAccidentId(data.data.accidentId)
                            setDriverSafetyDialogVisible(true)
                            
                            // Auto-dismiss after 10 seconds
                            setTimeout(() => {
                                setDriverSafetyDialogVisible(false)
                                setCurrentAccidentId(null)
                            }, 10000)
                        } else {
                            // Show accident alert only for viewers/admins or other drivers
                            setAccidentAlertData({
                                vehicleId: data.data.vehicleId,
                                vehicleName: `${data.data.driverName} - ${data.data.vehicleType}`,
                                location: `${data.data.location.latitude.toFixed(6)}, ${data.data.location.longitude.toFixed(6)}`,
                                timestamp: new Date(data.data.timestamp),
                                latitude: data.data.location.latitude,
                                longitude: data.data.location.longitude,
                            })
                            setAccidentAlertVisible(true)
                        }
                    }
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error)
                }
            }

            ws.onerror = (error) => {
                console.error("WebSocket error:", error)
                setIsConnecting(false)
                setConnectionStatus("disconnected")
            }

            ws.onclose = () => {
                console.log("WebSocket disconnected")
                setIsConnecting(false)
                setConnectionStatus("disconnected")
                wsRef.current = null

                // Clear all vehicle timeouts and remove all vehicles from map
                vehicleTimeoutsRef.current.forEach((timeout) => {
                    clearTimeout(timeout)
                })
                vehicleTimeoutsRef.current.clear()
                setVehicles(new Map()) // Clear all vehicles when disconnected

                // If we were sending data, stop it
                if (isSendingDataRef.current) {
                    stopSendingData()
                }

                // Retry connection only if not manually stopped
                if (!isSendingDataRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket()
                    }, reconnectDelay)
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

    // Initialize WebSocket connection for viewers and admins
    useEffect(() => {
        if (organization && session?.user?.accessToken) {
            // For viewers and admins, connect immediately
            if (organization.myRole === "ADMIN" || organization.myRole === "VIEWER") {
                console.log(`🔌 Initializing WebSocket for ${organization.myRole}`)
                connectWebSocket()
            }
            // For drivers, WebSocket is connected when they start sending data
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            // Clear all vehicle timeouts
            vehicleTimeoutsRef.current.forEach((timeout) => {
                clearTimeout(timeout)
            })
            vehicleTimeoutsRef.current.clear()
        }
    }, [organization, session?.user?.accessToken, connectWebSocket])

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
        
        // Clear timeout detection
        if (dataTimeoutRef.current) {
            clearTimeout(dataTimeoutRef.current)
            dataTimeoutRef.current = null
        }
        
        // Stop location tracking
        if (locationWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(locationWatchIdRef.current)
            locationWatchIdRef.current = null
        }
        
        // Reset speed calculation refs
        lastLatRef.current = null
        lastLonRef.current = null
        lastTimeRef.current = null
        lastDataReceivedRef.current = null
        
        // Reset state
        isSendingDataRef.current = false
        hasReceivedDataRef.current = false
        setIsSendingData(false)
        setIsConnecting(false)
        setHasReceivedData(false)
        currentLocationRef.current = null
        setConnectionStatus("stopped")
        
        toast.info("Stopped sending vehicle data")
    }, [])

    // Start sending data
    const startSendingData = useCallback(async () => {
        console.log("clicked")
        if (!selectedVehicleForSend) {
            toast.error("Please select a vehicle first")
            return
        }

        const selectedVehicle = orgVehicles.find((v) => v.id === selectedVehicleForSend && v.driver?.id === session?.user?.id)
        if (!selectedVehicle) {
            toast.error("Selected vehicle not found")
            return
        }

        if (!selectedVehicle.ipAddress || selectedVehicle.ipAddress.trim() === "") {
            toast.error("Vehicle IP address not configured. Please add IP address in vehicle settings.")
            return
        }

        setHasReceivedData(false) // Reset data received flag for new connection attempt
        hasReceivedDataRef.current = false // Reset ref as well
        setIsConnecting(true) // Set connecting state early
        setConnectionStatus("connecting")

        // Update driverVehicleRef with selected vehicle
        const vehicle = {
            id: selectedVehicle.id,
            vehicleNumber: selectedVehicle.vehicleNumber,
            vehicleType: selectedVehicle.vehicleType,
            ipAddress: selectedVehicle.ipAddress,
            port: selectedVehicle.port || 81,
        }
        driverVehicleRef.current = vehicle

        // Ensure backend WebSocket is connected
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket()
            
            // Wait for connection
            const checkConnection = setInterval(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    clearInterval(checkConnection)
                    // Continue with starting data after connection
                    setTimeout(() => {
                        startSendingData()
                    }, 500)
                }
            }, 100)
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkConnection)
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    toast.error("Failed to connect to backend. Please try again.")
                    setIsConnecting(false)
                    setConnectionStatus("stopped")
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

        // Connect to hardware device WebSocket
        const vehiclePort = selectedVehicle.port || 81
        const hardwareWsUrl = `ws://${selectedVehicle.ipAddress}:${vehiclePort}`
        console.log(`Connecting to hardware device at ${hardwareWsUrl}`)
        
        // Connecting state is already set at the beginning of the function
        
        try {
            const hardwareWs = new WebSocket(hardwareWsUrl)
            hardwareWsRef.current = hardwareWs

            hardwareWs.onopen = () => {
                console.log("Hardware WebSocket opened, waiting for data...")
                // Keep connecting state - don't change it here
                
                // Set a timeout to check if we receive data within 10 seconds
                const connectionTimeout = setTimeout(() => {
                    if (!hasReceivedDataRef.current && hardwareWsRef.current) {
                        console.error("No data received from hardware device within 10 seconds")
                        toast.error(`No data received from ${selectedVehicle.ipAddress}:${vehiclePort}. Check if device is sending data.`)
                        
                        // Close the WebSocket and reset states
                        if (hardwareWsRef.current) {
                            hardwareWsRef.current.close()
                            hardwareWsRef.current = null
                        }
                        setIsConnecting(false)
                        setConnectionStatus("stopped")
                        setHasReceivedData(false)
                        hasReceivedDataRef.current = false
                    }
                }, 10000) // 10 second timeout
                
                // Store timeout reference to clear it when data is received
                hardwareWs.addEventListener('message', () => {
                    clearTimeout(connectionTimeout)
                }, { once: true })
            }

            hardwareWs.onmessage = (event) => {
                try {
                    const d = JSON.parse(event.data)
                    
                    // Extract data fields
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

                    // Validate GPS coordinates
                    if (isNaN(lat) || isNaN(lon)) {
                        console.warn("Invalid GPS coordinates received:", d)
                        return
                    }

                    // First data received - mark as connected
                    if (!hasReceivedDataRef.current) {
                        hasReceivedDataRef.current = true
                        setHasReceivedData(true)
                        setIsConnecting(false)
                        setIsSendingData(true)
                        isSendingDataRef.current = true
                        setConnectionStatus("connected")
                        toast.success(`Connected to vehicle device at ${selectedVehicle.ipAddress}:${vehiclePort}`)
                        console.log("✅ First data received from hardware device - connection established")
                    }

                    // Calculate speed from GPS coordinates
                    const speed = calculateSpeed(lat, lon)

                    // Update current location
                    currentLocationRef.current = { lat, lon }

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
                        
                        // Update vehicle position on map immediately
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
                        
                        // Reset timeout when data is received
                        lastDataReceivedRef.current = Date.now()
                        if (dataTimeoutRef.current) {
                            clearTimeout(dataTimeoutRef.current)
                            dataTimeoutRef.current = null
                        }
                        
                        // Set up timeout check for next data (only if not already set)
                        if (!dataTimeoutRef.current) {
                            dataTimeoutRef.current = setTimeout(() => {
                                const timeSinceLastData = lastDataReceivedRef.current 
                                    ? Date.now() - lastDataReceivedRef.current 
                                    : Infinity
                                
                                if (timeSinceLastData >= DATA_TIMEOUT_MS && isSendingDataRef.current) {
                                    console.warn("No data received for", DATA_TIMEOUT_MS, "ms. Stopping data sending.")
                                    toast.warning("Data stream stopped. Connection may be lost.")
                                    stopSendingData()
                                }
                                dataTimeoutRef.current = null
                            }, DATA_TIMEOUT_MS)
                        }
                    }
                } catch (error) {
                    console.error("Error parsing hardware data:", error)
                }
            }

            hardwareWs.onerror = (error) => {
                console.error(`WebSocket error occurred for ${hardwareWsUrl}`, error)
                if (!hasReceivedDataRef.current) {
                    toast.error(`Failed to connect to ${selectedVehicle.ipAddress}:${vehiclePort}`)
                    setIsConnecting(false)
                    setConnectionStatus("stopped")
                }
            }

            hardwareWs.onclose = (event) => {
                console.log("Hardware WebSocket closed", {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                    url: hardwareWsUrl
                })
                
                hardwareWsRef.current = null
                
                // Only show error messages if we were trying to connect or were connected
                if (isSendingDataRef.current || isConnecting) {
                    if (event.code === 1006) {
                        toast.error(`Connection to ${selectedVehicle.ipAddress}:${vehiclePort} failed. Check network connectivity and device status.`)
                    } else if (event.code === 1000) {
                        toast.info("Connection to vehicle device closed")
                    } else if (!hasReceivedDataRef.current) {
                        toast.warning("Failed to connect to vehicle device")
                    } else {
                        toast.warning("Connection to vehicle device lost")
                    }
                }
                
                // Reset all states
                setIsConnecting(false)
                setIsSendingData(false)
                isSendingDataRef.current = false
                hasReceivedDataRef.current = false
                setConnectionStatus("stopped")
                
                // Clear timeout when connection closes
                if (dataTimeoutRef.current) {
                    clearTimeout(dataTimeoutRef.current)
                    dataTimeoutRef.current = null
                }
            }
        } catch (error) {
            console.error("Error connecting to hardware device:", error)
            toast.error(`Failed to connect to vehicle device: ${error}`)
            // Reset states on error
            setIsConnecting(false)
            setConnectionStatus("stopped")
            setHasReceivedData(false)
            hasReceivedDataRef.current = false
        }
    }, [selectedVehicleForSend, orgVehicles, session?.user?.id, session?.user?.name, organizationId, connectWebSocket, stopSendingData, calculateSpeed])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            // Clear all vehicle timeouts
            vehicleTimeoutsRef.current.forEach((timeout) => {
                clearTimeout(timeout)
            })
            vehicleTimeoutsRef.current.clear()
            stopSendingData()
        }
    }, [stopSendingData])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleTypeChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            vehicleType: value,
        }))
    }

    const handleDriverChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            driverId: value,
        }))
    }

    const handleCreateVehicle = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validate required fields
        if (!formData.vehicleNumber || !formData.vehicleType || !formData.driverId) {
            toast.error("Please fill in all required fields")
            return
        }

        if (drivers.length === 0) {
            toast.error("No drivers available. Please add drivers with DRIVER role first.")
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vehicle`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: session?.user?.accessToken || "",
                    },
                    body: JSON.stringify({
                        ...formData,
                        organizationId,
                    }),
                }
            )

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || "Vehicle created successfully")
                setOpen(false)
                setFormData({
                    vehicleNumber: "",
                    vehicleType: "",
                    driverId: "",
                    ipAddress: "",
                    port: 81,
                })
                fetchVehicles()
            } else {
                toast.error(data.message || "Failed to create vehicle")
            }
        } catch (error) {
            toast.error("An unexpected error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const getVehicleTypeIcon = (type: string) => {
        switch (type) {
            case "CAR":
                return "🚗"
            case "MOTORCYCLE":
                return "🏍️"
            case "TRUCK":
                return "🚚"
            case "BUS":
                return "🚌"
            default:
                return "🚙"
        }
    }

    const handleInviteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setInviteFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleInviteRoleChange = (value: string) => {
        setInviteFormData((prev) => ({
            ...prev,
            inviteRole: value,
        }))
    }

    const handleCreateInvitation = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsInviting(true)

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invitation/create`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: session?.user?.accessToken || "",
                    },
                    body: JSON.stringify({
                        ...inviteFormData,
                        organizationId,
                    }),
                }
            )

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || "Invitation sent successfully")
                setInviteDialogOpen(false)
                setInviteFormData({
                    phoneNumber: "",
                    inviteRole: "",
                })
                fetchInvitations()
            } else {
                toast.error(data.message || "Failed to send invitation")
            }
        } catch (error) {
            toast.error("An unexpected error occurred. Please try again.")
        } finally {
            setIsInviting(false)
        }
    }

    const handleDeleteInvitation = async (invitationId: string) => {
        if (!confirm("Are you sure you want to delete this invitation?")) return

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invitation/${invitationId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: session?.user?.accessToken || "",
                    },
                }
            )

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || "Invitation deleted successfully")
                fetchInvitations()
            } else {
                toast.error(data.message || "Failed to delete invitation")
            }
        } catch (error) {
            toast.error("An unexpected error occurred. Please try again.")
        }
    }

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "ADMIN":
                return <Shield className="h-4 w-4" />
            case "DRIVER":
                return <UserCog className="h-4 w-4" />
            case "VIEWER":
                return <Eye className="h-4 w-4" />
            default:
                return <User className="h-4 w-4" />
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "ADMIN":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            case "DRIVER":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            case "VIEWER":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
        }
    }

    if (!organization) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-3">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Loading organization...</p>
            </div>
        )
    }

    return (
        <div className="flex p-4 flex-col gap-6">
            {/* Accident Alert Popover (for viewers/admins) */}
            <AccidentAlert
                isVisible={accidentAlertVisible}
                vehicleId={accidentAlertData?.vehicleId}
                vehicleName={accidentAlertData?.vehicleName}
                location={accidentAlertData?.location}
                timestamp={accidentAlertData?.timestamp}
                onViewLocation={() => {
                    if (accidentAlertData && overviewMapRef.current) {
                        // Center map on accident location
                        overviewMapRef.current.setView(
                            [accidentAlertData.latitude, accidentAlertData.longitude],
                            17,
                            {
                                animate: true,
                                duration: 1,
                            }
                        )
                        // Close the alert
                        setAccidentAlertVisible(false)
                    }
                }}
                onAcknowledge={() => {
                    setAccidentAlertVisible(false)
                }}
            />

            {/* Driver Safety Dialog (only for drivers) */}
            <DriverSafetyDialog
                isVisible={driverSafetyDialogVisible && organization?.myRole === "DRIVER"}
                accidentId={currentAccidentId || ""}
                onConfirmSafe={handleDriverConfirmSafe}
                onClose={() => {
                    setDriverSafetyDialogVisible(false)
                    setCurrentAccidentId(null)
                }}
            />
            
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold truncate">{organization.name}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{organization.address}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <span>{organization.phoneNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {organization.myRole === "DRIVER" && (
                        <>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="dashboard-vehicle-select" className="text-sm whitespace-nowrap">
                                    Select vehicle:
                                </Label>
                                <Select
                                    value={selectedVehicleForSend}
                                    onValueChange={setSelectedVehicleForSend}
                                    disabled={isSendingData && hasReceivedData}
                                >
                                    <SelectTrigger id="dashboard-vehicle-select" className="w-[200px]">
                                        <SelectValue placeholder="Choose a vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orgVehicles
                                            .filter((v) => v.driver?.id === session?.user?.id)
                                            .map((v) => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.vehicleNumber} ({v.vehicleType})
                                                </SelectItem>
                                            ))}
                                        {orgVehicles.filter((v) => v.driver?.id === session?.user?.id).length === 0 && (
                                            <SelectItem value="none" disabled>
                                                No vehicles assigned
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Connection and data sending controls */}
                            {!isSendingData || !hasReceivedData ? (
                                // Show Connect/Retry button when not sending or connection failed
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={startSendingData}
                                    disabled={!selectedVehicleForSend || selectedVehicleForSend === "none" || (isConnecting && connectionStatus === "connecting")}
                                >
                                    {isConnecting && connectionStatus === "connecting" ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : connectionStatus === "stopped" ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Retry
                                        </>
                                    ) : (
                                        <>
                                            <Wifi className="h-4 w-4 mr-2" />
                                            Connect
                                        </>
                                    )}
                                </Button>
                            ) : (
                                // Show sending status and stop button when actively sending with data
                                <>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-md">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                            Sending data...
                                        </span>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={stopSendingData}
                                    >
                                        <Square className="h-4 w-4 mr-2" />
                                        Stop
                                    </Button>
                                </>
                            )}
                            {/* Connection status indicator */}
                            {(isConnecting || isSendingData || connectionStatus === "stopped") && (
                                <div className="flex items-center gap-2">
                                    {isSendingData && hasReceivedData ? (
                                        <>
                                            <Wifi className="h-4 w-4 text-green-500" />
                                            <span className="text-xs text-green-500">Connected</span>
                                        </>
                                    ) : isConnecting && connectionStatus === "connecting" ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
                                            <span className="text-xs text-yellow-500">Waiting for data...</span>
                                        </>
                                    ) : connectionStatus === "stopped" ? (
                                        <>
                                            <WifiOff className="h-4 w-4 text-red-500" />
                                            <span className="text-xs text-red-500">Connection Failed</span>
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </>
                    )}
                    {activeTab === "vehicles" && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-fit">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Vehicle
                            </Button>
                        </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription>
                                Add a new vehicle to this organization.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateVehicle} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                <Input
                                    id="vehicleNumber"
                                    name="vehicleNumber"
                                    placeholder="Enter vehicle number"
                                    value={formData.vehicleNumber}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicleType">Vehicle Type</Label>
                                <Select
                                    value={formData.vehicleType}
                                    onValueChange={handleTypeChange}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CAR">Car</SelectItem>
                                        <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                                        <SelectItem value="TRUCK">Truck</SelectItem>
                                        <SelectItem value="BUS">Bus</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ipAddress">IP Address (Optional)</Label>
                                <Input
                                    id="ipAddress"
                                    name="ipAddress"
                                    type="text"
                                    placeholder="e.g., 192.168.1.100"
                                    value={formData.ipAddress}
                                    onChange={handleInputChange}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter the IP address of the vehicle's tracking device
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port (Optional)</Label>
                                <Input
                                    id="port"
                                    name="port"
                                    type="number"
                                    placeholder="e.g., 81"
                                    value={formData.port}
                                    onChange={(e) => {
                                        const value = e.target.value === "" ? 81 : parseInt(e.target.value, 10)
                                        setFormData({ ...formData, port: isNaN(value) ? 81 : value })
                                    }}
                                    min="1"
                                    max="65535"
                                />
                                <p className="text-xs text-muted-foreground">
                                    WebSocket port for the hardware device (default: 81)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="driverId">Driver</Label>
                                {drivers.length === 0 ? (
                                    <div className="p-3 border rounded-md bg-muted text-sm text-muted-foreground">
                                        No drivers available in this organization. Please add drivers with DRIVER role first.
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.driverId}
                                        onValueChange={handleDriverChange}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drivers.map((driver) => (
                                                <SelectItem key={driver.id} value={driver.id}>
                                                    {driver.fullName || driver.phoneNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isLoading || !formData.vehicleNumber || !formData.vehicleType || !formData.driverId || drivers.length === 0}
                                >
                                    {isLoading ? "Adding..." : "Add Vehicle"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                    </Dialog>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "overview"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Overview
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("vehicles")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "vehicles"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Vehicles
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "settings"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("reports")}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === "reports"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <FileWarning className="h-4 w-4" />
                        Reports
                    </div>
                </button>
            </div>

            {/* Overview tab: map left, metrics + accident + charts + vehicles right */}
            {activeTab === "overview" && (
                <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] min-h-[500px]">
                    {/* Map - left */}
                    <div className="flex-1 min-w-0 rounded-lg border overflow-hidden bg-muted/30 relative">
                        {loadingAccidents ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">Loading map...</div>
                        ) : (
                            <OverviewMap
                                accidents={[...accidents, ...Array.from(realtimeAccidentMarkers.values())]}
                                vehicles={vehicles}
                                center={
                                    vehicles.size > 0
                                        ? (() => {
                                            const firstVehicle = Array.from(vehicles.values())[0]
                                            return [firstVehicle.latitude, firstVehicle.longitude] as [number, number]
                                          })()
                                        : accidents.length > 0
                                        ? [accidents[0].latitude, accidents[0].longitude]
                                        : [27.7172, 85.324]
                                }
                                className="h-full w-full"
                                onMapReady={(map) => {
                                    overviewMapRef.current = map
                                }}
                            />
                        )}
                        <div className="absolute top-2 left-2 z-[1000] text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded shadow-sm">
                            Incident locations · {organization?.address || "—"}
                        </div>
                    </div>

                    {/* Right column: metrics, accident card, charts, vehicle list */}
                    <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 overflow-y-auto space-y-4 pr-2">
                        {/* Summary cards – org, drivers, vehicles, accidents only */}
                        <div>
                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Organization summary</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Accidents (24h)</p>
                                            <p className="text-lg font-semibold">{accidentsLast24h.length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Car className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Vehicles</p>
                                            <p className="text-lg font-semibold">{orgVehicles.length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <UserCog className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Drivers</p>
                                            <p className="text-lg font-semibold">{drivers.length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Team</p>
                                            <p className="text-lg font-semibold">{organization?.members?.length ?? 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <FileWarning className="h-4 w-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Open incidents</p>
                                            <p className="text-lg font-semibold">{accidents.filter((a) => a.status !== "RESOLVED").length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="py-3 px-4">
                                    <CardContent className="p-0 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Resolved</p>
                                            <p className="text-lg font-semibold">{accidents.filter((a) => a.status === "RESOLVED").length}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Latest accident (last 24h) – from accident logs */}
                        {accidentsLast24h.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                        Latest incident (24h)
                                    </CardTitle>
                                    <CardDescription>From accident logs</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex gap-2" title="Severity indicator">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded ${
                                                    i <= 3 ? "bg-orange-500" : "bg-muted"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm">
                                        {accidentsLast24h[0].description ||
                                            `${accidentsLast24h[0].title}. Occurred at ${new Date(accidentsLast24h[0].occurredAt).toLocaleString()}.`}
                                    </p>
                                    <ul className="text-xs space-y-1 text-muted-foreground">
                                        <li>Vehicle: {accidentsLast24h[0].vehicle?.vehicleNumber || "—"} ({accidentsLast24h[0].vehicle?.vehicleType || "—"})</li>
                                        <li>Status: {accidentsLast24h[0].status}</li>
                                        <li>Time: {new Date(accidentsLast24h[0].occurredAt).toLocaleString()}</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        )}

                        {/* Number of vehicles in this org */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Vehicles</CardTitle>
                                <CardDescription>Number of vehicles in this organization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[140px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={[
                                                ...Array.from({ length: 8 }, (_, i) => ({
                                                    time: `${i * 3}:00`,
                                                    vehicles: Math.min(orgVehicles.length, Math.round(orgVehicles.length * (0.6 + 0.4 * Math.sin(i * 0.8)))),
                                                    avg: Math.round(orgVehicles.length * 0.85),
                                                })),
                                            ]}
                                        >
                                            <defs>
                                                <linearGradient id="vehicleGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                            <Tooltip contentStyle={{ fontSize: 12 }} />
                                            <Area
                                                type="monotone"
                                                dataKey="vehicles"
                                                stroke="hsl(var(--primary))"
                                                fill="url(#vehicleGradient)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-center text-2xl font-semibold mt-2">{orgVehicles.length} vehicles</p>
                            </CardContent>
                        </Card>

                        {/* Incident status – Reported / Confirmed / Resolved */}
                        {accidents.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Incident status</CardTitle>
                                    <CardDescription>All accidents in this organization</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[100px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { status: "Reported", count: accidents.filter((a) => a.status === "REPORTED").length },
                                                    { status: "Confirmed", count: accidents.filter((a) => a.status === "CONFIRMED").length },
                                                    { status: "Resolved", count: accidents.filter((a) => a.status === "RESOLVED").length },
                                                ]}
                                                layout="vertical"
                                                margin={{ top: 0, right: 8, left: 50, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                                                <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={52} />
                                                <Tooltip contentStyle={{ fontSize: 12 }} />
                                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Accident events – from accident logs */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Accidents (24h)</CardTitle>
                                <CardDescription>Incidents by 3‑hour window (from accident logs)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[120px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={(() => {
                                                const now = Date.now()
                                                return Array.from({ length: 8 }, (_, i) => {
                                                    const start = now - (8 - i) * 3 * 60 * 60 * 1000
                                                    const end = start + 3 * 60 * 60 * 1000
                                                    const count = accidentsLast24h.filter(
                                                        (a) =>
                                                            new Date(a.occurredAt).getTime() >= start &&
                                                            new Date(a.occurredAt).getTime() < end
                                                    ).length
                                                    return { hour: `${i * 3}h`, accidents: count }
                                                })
                                            })()}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                            <Tooltip contentStyle={{ fontSize: 12 }} />
                                            <Line
                                                type="monotone"
                                                dataKey="accidents"
                                                stroke="hsl(var(--destructive))"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Active vehicles */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Active vehicles</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveTab("vehicles")}
                                    >
                                        View all
                                    </Button>
                                </CardTitle>
                                <CardDescription>Currently active vehicles sending data</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {vehicles.size === 0 ? (
                                    <p className="text-sm text-muted-foreground">No active vehicles</p>
                                ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                        {Array.from(vehicles.values()).map((v) => {
                                            const vehicleInfo = orgVehicles.find(ov => ov.id === v.vehicleId)
                                            return (
                                                <div
                                                    key={v.vehicleId}
                                                    className="flex items-center justify-between py-2 px-3 rounded-lg border bg-muted/30 text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        // Center map on this vehicle
                                                        if (overviewMapRef.current) {
                                                            overviewMapRef.current.setView([v.latitude, v.longitude], 16, {
                                                                animate: true,
                                                                duration: 1,
                                                            })
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <span className="text-lg">
                                                                {v.vehicleType === "CAR" ? "🚗" : v.vehicleType === "MOTORCYCLE" ? "🏍️" : v.vehicleType === "TRUCK" ? "🚚" : "🚌"}
                                                            </span>
                                                            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{v.vehicleNumber || vehicleInfo?.vehicleNumber || v.vehicleId}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {v.driverName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs text-muted-foreground">{v.vehicleType}</span>
                                                        {v.speed !== undefined && (
                                                            <span className="text-xs font-medium text-green-600">{v.speed.toFixed(0)} km/h</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Content based on active tab */}
            {activeTab === "vehicles" && (
                <>
            {/* Vehicles Grid */}
            {loadingVehicles ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading vehicles...</div>
                </div>
            ) : orgVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                    <Car className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2">No vehicles found</p>
                    <p className="text-muted-foreground text-sm mb-4">
                        This organization doesn't have any vehicles yet.
                    </p>
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Vehicle
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orgVehicles.map((vehicle) => (
                        <div
                            key={vehicle.id}
                            className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getVehicleTypeIcon(vehicle.vehicleType)}</span>
                                    <div>
                                        <h3 className="text-lg font-semibold">{vehicle.vehicleNumber}</h3>
                                        <p className="text-sm text-muted-foreground">{vehicle.vehicleType}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Driver: </span>
                                    <span className="font-medium">
                                        {vehicle.driver.fullName || vehicle.driver.phoneNumber}
                                    </span>
                                </div>
                                {vehicle.ipAddress && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">IP Address: </span>
                                        <span className="font-mono font-medium text-xs">
                                            {vehicle.ipAddress}:{vehicle.port || 81}
                                        </span>
                                    </div>
                                )}

                                {vehicle.accidents && vehicle.accidents.length > 0 && (
                                    <div className="pt-3 border-t">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span>Recent Accidents ({vehicle.accidents.length})</span>
                                        </div>
                                        <div className="space-y-1">
                                            {vehicle.accidents.slice(0, 3).map((accident) => (
                                                <div
                                                    key={accident.id}
                                                    className="text-xs p-2 bg-muted rounded"
                                                >
                                                    <div className="font-medium">{accident.title}</div>
                                                    <div className="text-muted-foreground">
                                                        {new Date(accident.occurredAt).toLocaleDateString()} - {accident.status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            )}

            {activeTab === "settings" && (
                <div className="space-y-6">
                    {/* Invite Users Section */}
                    <div className="border rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Invite Users
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Invite users to join this organization as ADMIN, DRIVER, or VIEWER
                                </p>
                            </div>
                            {organization.myRole === "ADMIN" && (
                                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Invite User
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Invite User to Organization</DialogTitle>
                                            <DialogDescription>
                                                Enter the user's phone number and select their role.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateInvitation} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                                <Input
                                                    id="phoneNumber"
                                                    name="phoneNumber"
                                                    type="tel"
                                                    placeholder="Enter phone number"
                                                    value={inviteFormData.phoneNumber}
                                                    onChange={handleInviteInputChange}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="inviteRole">Role</Label>
                                                <Select
                                                    value={inviteFormData.inviteRole}
                                                    onValueChange={handleInviteRoleChange}
                                                    required
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ADMIN">
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="h-4 w-4" />
                                                                Admin - Full access
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="DRIVER">
                                                            <div className="flex items-center gap-2">
                                                                <UserCog className="h-4 w-4" />
                                                                Driver - Can manage vehicles
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="VIEWER">
                                                            <div className="flex items-center gap-2">
                                                                <Eye className="h-4 w-4" />
                                                                Viewer - Read-only access
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setInviteDialogOpen(false)}
                                                    disabled={isInviting}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={isInviting}>
                                                    {isInviting ? "Sending..." : "Send Invitation"}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        {organization.myRole !== "ADMIN" && (
                            <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
                                Only admins can invite users to this organization.
                            </div>
                        )}
                    </div>

                    {/* Pending Invitations */}
                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
                        {loadingInvitations ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="text-muted-foreground">Loading invitations...</div>
                            </div>
                        ) : invitations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
                                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No pending invitations</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {invitations.map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(invitation.inviteRole)}
                                                <div>
                                                    <p className="font-medium">
                                                        {invitation.user.fullName || invitation.user.phoneNumber}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {invitation.user.phoneNumber}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.inviteRole)}`}
                                            >
                                                {invitation.inviteRole}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Invited {new Date(invitation.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {organization.myRole === "ADMIN" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteInvitation(invitation.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Members */}
                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Organization Members</h2>
                        {organization.members && organization.members.length > 0 ? (
                            <div className="space-y-3">
                                {organization.members.map((member: any) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <div>
                                                    <p className="font-medium">
                                                        {member.user?.fullName || member.user?.phoneNumber || "Unknown"}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {member.user?.phoneNumber}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}
                                            >
                                                {member.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-sm py-4">
                                No members found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileWarning className="h-5 w-5" />
                                Accident Reports
                            </CardTitle>
                            <CardDescription>
                                Generate and download PDF reports of accidents for this organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Filter Selection */}
                            <div className="space-y-4">
                                <Label>Report Period</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={reportFilter === "week" ? "default" : "outline"}
                                        onClick={() => setReportFilter("week")}
                                        className="flex-1"
                                    >
                                        Last Week
                                    </Button>
                                    <Button
                                        variant={reportFilter === "month" ? "default" : "outline"}
                                        onClick={() => setReportFilter("month")}
                                        className="flex-1"
                                    >
                                        Last Month
                                    </Button>
                                    <Button
                                        variant={reportFilter === "custom" ? "default" : "outline"}
                                        onClick={() => setReportFilter("custom")}
                                        className="flex-1"
                                    >
                                        Custom Range
                                    </Button>
                                </div>
                            </div>

                            {/* Custom Date Range */}
                            {reportFilter === "custom" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={reportStartDate}
                                            onChange={(e) => setReportStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={reportEndDate}
                                            onChange={(e) => setReportEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                                className="w-full"
                                size="lg"
                            >
                                {isGeneratingReport ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Report...
                                    </>
                                ) : (
                                    <>
                                        <FileWarning className="mr-2 h-4 w-4" />
                                        Generate PDF Report
                                    </>
                                )}
                            </Button>

                            {/* Info */}
                            <div className="p-4 bg-muted rounded-lg text-sm">
                                <p className="font-medium mb-2">Report includes:</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>Organization details and summary</li>
                                    <li>Accident statistics (total, reported, confirmed, resolved)</li>
                                    <li>Detailed accident table with date, time, vehicle, driver, location</li>
                                    <li>Accident status and descriptions</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
