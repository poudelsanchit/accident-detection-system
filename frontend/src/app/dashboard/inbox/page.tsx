"use client"
import { Button } from "@/core/components/ui/button"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { 
    Inbox as InboxIcon, 
    Building2, 
    CheckCircle2, 
    MapPin, 
    Phone, 
    AlertTriangle,
    Car,
    User,
    Clock,
    MapPinned,
    X
} from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { cn } from "@/core/lib/utils"

interface Invitation {
    id: string
    inviteRole: string
    createdAt: string
    organization: {
        id: string
        name: string
        address: string
        phoneNumber: string
        organizationType: string
    }
    user: {
        id: string
        phoneNumber: string
        fullName: string | null
    }
}

interface AccidentAlert {
    id: string
    type: 'ACCIDENT_ALERT'
    title: string
    message: string
    status: string
    occurredAt: string
    createdAt: string
    accident: {
        id: string
        title: string
        description: string | null
        latitude: number
        longitude: number
        occurredAt: string
        status: string
        vehicle: {
            vehicleNumber: string
            vehicleModel: string
            vehicleType: string
            driver: {
                fullName: string | null
                phoneNumber: string
            }
        }
        organization: {
            name: string
            phoneNumber: string
        }
    }
}

type InboxItem = 
    | { type: 'invitation'; data: Invitation }
    | { type: 'accident'; data: AccidentAlert }

export default function InboxPage() {
    const { data: session } = useSession()
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [accidentAlerts, setAccidentAlerts] = useState<AccidentAlert[]>([])
    const [loading, setLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null)

    const fetchInvitations = async () => {
        if (!session?.user?.accessToken) return

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invitation/my-invitations`,
                {
                    headers: {
                        Authorization: session.user.accessToken,
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setInvitations(data.invitations || [])
            }
        } catch (error) {
            console.error("Error fetching invitations:", error)
        }
    }

    const fetchAccidentAlerts = async () => {
        if (!session?.user?.accessToken) return

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accident/my-alerts`,
                {
                    headers: {
                        Authorization: session.user.accessToken,
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setAccidentAlerts(data.alerts || [])
            }
        } catch (error) {
            console.error("Error fetching accident alerts:", error)
        }
    }

    const fetchAllData = async () => {
        setLoading(true)
        await Promise.all([fetchInvitations(), fetchAccidentAlerts()])
        setLoading(false)
    }

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchAllData()
        }
    }, [session?.user?.accessToken])

    const handleAcceptInvitation = async (invitationId: string) => {
        if (!session?.user?.accessToken) return

        try {
            setAcceptingId(invitationId)
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/invitation/accept/${invitationId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: session.user.accessToken,
                    },
                }
            )

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || "Invitation accepted successfully")
                setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
                if (selectedItem?.type === 'invitation' && selectedItem.data.id === invitationId) {
                    setSelectedItem(null)
                }
            } else {
                toast.error(data.message || "Failed to accept invitation")
            }
        } catch (error) {
            console.error("Error accepting invitation:", error)
            toast.error("An error occurred while accepting invitation")
        } finally {
            setAcceptingId(null)
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

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "REPORTED":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            case "CONFIRMED":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            case "RESOLVED":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    // Combine and sort all inbox items
    const allItems: InboxItem[] = [
        ...invitations.map(inv => ({ type: 'invitation' as const, data: inv })),
        ...accidentAlerts.map(alert => ({ type: 'accident' as const, data: alert }))
    ].sort((a, b) => {
        const dateA = new Date(a.type === 'invitation' ? a.data.createdAt : a.data.occurredAt)
        const dateB = new Date(b.type === 'invitation' ? b.data.createdAt : b.data.occurredAt)
        return dateA.getTime() - dateB.getTime() // Ascending order
    })

    return (
        <div className="flex h-full min-h-screen overflow-hidden">
            {/* Left Sidebar - Message List */}
            <div className="w-96 border-r flex flex-col bg-background">
                <div className="p-4 border-b flex-shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <InboxIcon className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold">Inbox</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {allItems.length} message{allItems.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-muted-foreground">Loading...</div>
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <InboxIcon className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No messages</h3>
                            <p className="text-muted-foreground text-sm text-center">
                                You don't have any messages at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {allItems.map((item, index) => {
                                const isSelected = selectedItem?.type === item.type && 
                                    (item.type === 'invitation' 
                                        ? selectedItem.data.id === item.data.id 
                                        : selectedItem.data.id === item.data.id)
                                
                                if (item.type === 'invitation') {
                                    const inv = item.data
                                    return (
                                        <div
                                            key={`inv-${inv.id}`}
                                            onClick={() => setSelectedItem(item)}
                                            className={cn(
                                                "p-4 cursor-pointer hover:bg-accent transition-colors",
                                                isSelected && "bg-accent"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {inv.organization.name}
                                                        </h3>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatTime(inv.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        Organization Invitation
                                                    </p>
                                                    <Badge className={cn("mt-2 text-xs", getRoleBadgeColor(inv.inviteRole))}>
                                                        {inv.inviteRole}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                } else {
                                    const alert = item.data
                                    return (
                                        <div
                                            key={`alert-${alert.id}`}
                                            onClick={() => setSelectedItem(item)}
                                            className={cn(
                                                "p-4 cursor-pointer hover:bg-accent transition-colors",
                                                isSelected && "bg-accent"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {alert.title}
                                                        </h3>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatTime(alert.occurredAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {alert.accident.vehicle.vehicleNumber} • {alert.accident.organization.name}
                                                    </p>
                                                    <Badge className={cn("mt-2 text-xs", getStatusBadgeColor(alert.status))}>
                                                        {alert.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Message Detail */}
            <div className="flex-1 flex flex-col bg-background min-w-0">
                {!selectedItem ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <InboxIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Select a message</h3>
                            <p className="text-muted-foreground text-sm">
                                Choose a message from the list to view details
                            </p>
                        </div>
                    </div>
                ) : selectedItem.type === 'invitation' ? (
                    // Invitation Detail View
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedItem.data.organization.name}</h2>
                                    <p className="text-sm text-muted-foreground">Organization Invitation</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedItem(null)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Invitation Details</CardTitle>
                                    <CardDescription>
                                        You've been invited to join this organization
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Address</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.organization.address}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Phone Number</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.organization.phoneNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Organization Type</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.organization.organizationType}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Your Role</p>
                                            <Badge className={getRoleBadgeColor(selectedItem.data.inviteRole)}>
                                                {selectedItem.data.inviteRole}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Invited On</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(selectedItem.data.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            onClick={() => handleAcceptInvitation(selectedItem.data.id)}
                                            disabled={acceptingId === selectedItem.data.id}
                                            className="w-full gap-2"
                                        >
                                            {acceptingId === selectedItem.data.id ? (
                                                <>
                                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Accepting...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Accept Invitation
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    // Accident Alert Detail View
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedItem.data.title}</h2>
                                    <p className="text-sm text-muted-foreground">Accident Alert</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedItem(null)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            <Card className="mb-4">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Alert Details</CardTitle>
                                        <Badge className={getStatusBadgeColor(selectedItem.data.status)}>
                                            {selectedItem.data.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        Accident detected and reported
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Car className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Vehicle</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.accident.vehicle.vehicleNumber} • {selectedItem.data.accident.vehicle.vehicleModel}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Driver</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.accident.vehicle.driver.fullName || selectedItem.data.accident.vehicle.driver.phoneNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Organization</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.accident.organization.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Contact</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedItem.data.accident.organization.phoneNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Occurred At</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(selectedItem.data.occurredAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <MapPinned className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium mb-1">Location</p>
                                            <p className="text-sm text-muted-foreground">
                                                Lat: {selectedItem.data.accident.latitude.toFixed(6)}, 
                                                Lng: {selectedItem.data.accident.longitude.toFixed(6)}
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => {
                                                    window.open(
                                                        `https://www.google.com/maps?q=${selectedItem.data.accident.latitude},${selectedItem.data.accident.longitude}`,
                                                        '_blank'
                                                    )
                                                }}
                                            >
                                                View on Map
                                            </Button>
                                        </div>
                                    </div>

                                    {selectedItem.data.accident.description && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-medium mb-2">Description</p>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {selectedItem.data.accident.description}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* SMS Message Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">SMS Alert Message</CardTitle>
                                    <CardDescription>
                                        This is the message sent to organization members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-muted p-4 rounded-lg">
                                        <pre className="text-sm whitespace-pre-wrap font-mono">
                                            {selectedItem.data.message}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
