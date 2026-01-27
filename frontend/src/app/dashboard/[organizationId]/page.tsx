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
    Plus, 
    Car, 
    ArrowLeft, 
    User, 
    AlertTriangle,
    Building2,
    Phone,
    MapPin,
    Settings,
    UserPlus,
    X,
    Shield,
    Eye,
    UserCog
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"

interface Vehicle {
    id: string
    vehicleNumber: string
    vehicleType: string
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
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [formData, setFormData] = useState({
        vehicleNumber: "",
        vehicleType: "",
        driverId: "",
    })
    const [drivers, setDrivers] = useState<Array<{ id: string; phoneNumber: string; fullName: string | null }>>([])
    const [activeTab, setActiveTab] = useState<"vehicles" | "settings">("vehicles")
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

    // Fetch organization details and drivers
    const fetchOrganization = async () => {
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
                setVehicles(data.vehicles || [])
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

    useEffect(() => {
        if (session?.user?.accessToken && organizationId) {
            fetchOrganization()
            fetchVehicles()
            fetchInvitations()
        }
    }, [session?.user?.accessToken, organizationId])

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
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-muted-foreground">Loading organization...</div>
            </div>
        )
    }

    return (
        <div className="flex p-4 flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{organization.name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{organization.address}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{organization.phoneNumber}</span>
                        </div>
                    </div>
                </div>
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

            {/* Tabs */}
            <div className="flex gap-2 border-b">
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
            </div>

            {/* Content based on active tab */}
            {activeTab === "vehicles" && (
                <>
            {/* Vehicles Grid */}
            {loadingVehicles ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading vehicles...</div>
                </div>
            ) : vehicles.length === 0 ? (
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
                    {vehicles.map((vehicle) => (
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
        </div>
    )
}
