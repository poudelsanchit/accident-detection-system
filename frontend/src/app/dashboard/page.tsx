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
import { Plus, Building2, MapPin, Phone, Users, Car, AlertTriangle, Map } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/core/components/ui/dialog"
import { toast } from "sonner"

interface Organization {
    id: string
    name: string
    address: string
    phoneNumber: string
    organizationType: string
    myRole: string
    members?: Array<{ role: string; user: { fullName: string | null } }>
    vehicles?: Array<{ id: string }>
    accidents?: Array<{ id: string }>
}

export default function Dashboard() {
    const { data: session } = useSession()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loadingOrgs, setLoadingOrgs] = useState(true)
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phoneNumber: "",
        type: "",
    })

    // Fetch user's organizations
    const fetchOrganizations = async () => {
        if (!session?.user?.accessToken) return
        
        try {
            setLoadingOrgs(true)
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
                setOrganizations(data.organizations || [])
            } else {
                toast.error("Failed to fetch organizations")
            }
        } catch (error) {
            console.error("Error fetching organizations:", error)
            toast.error("An error occurred while fetching organizations")
        } finally {
            setLoadingOrgs(false)
        }
    }

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchOrganizations()
        }
    }, [session?.user?.accessToken])

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
            type: value,
        }))
    }

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            console.log(session?.accessToken)
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organization`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session?.user.accessToken || "", 
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || "Organization created successfully")
                setOpen(false)
                setFormData({
                    name: "",
                    address: "",
                    phoneNumber: "",
                    type: "",
                })
                // Refresh organizations list
                fetchOrganizations()
            } else {
                toast.error("Failed to create organization")
            }
        } catch (error) {
            toast("An unexpected error occurred. Please try again.",
            )
        } finally {
            setIsLoading(false)
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

    return (
        <div className="flex p-4 flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">My Organizations</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-fit">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Organization
                        </Button>
                    </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Organization</DialogTitle>
                        <DialogDescription>
                            Fill in the details below to create a new organization.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrganization} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Organization Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Enter organization name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                name="address"
                                placeholder="Enter address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                placeholder="Enter phone number"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Organization Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={handleTypeChange}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select organization type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SCHOOL">SCHOOL</SelectItem>
                                    <SelectItem value="HOSPITAL">HOSPITAL</SelectItem>
                                    <SelectItem value="MUNICIPALITY">MUNICIPALITY</SelectItem>
                                    <SelectItem value="POLICE_STATION">POLICE_STATION</SelectItem>
                                    <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                                </SelectContent>
                            </Select>
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
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create Organization"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
                </Dialog>
            </div>

            {/* Organizations Grid */}
            {loadingOrgs ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading organizations...</div>
                </div>
            ) : organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2">No organizations found</p>
                    <p className="text-muted-foreground text-sm mb-4">
                        You are not a member of any organization yet.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations.map((org) => (
                        <div
                            key={org.id}
                            onClick={() => router.push(`/dashboard/${org.id}`)}
                            className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <h3 className="text-xl font-semibold">{org.name}</h3>
                                </div>
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(org.myRole)}`}
                                >
                                    {org.myRole}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span className="line-clamp-1">{org.address}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{org.phoneNumber}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-1 bg-muted rounded text-xs">
                                        {org.organizationType}
                                    </span>
                                </div>

                                <div className="flex gap-4 pt-3 border-t">
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span>{org.members?.length || 0} Members</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Car className="h-4 w-4" />
                                        <span>{org.vehicles?.length || 0} Vehicles</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>{org.accidents?.length || 0} Accidents</span>
                                    </div>
                                </div>
                                <div className="pt-3">
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/dashboard/${org.id}`)
                                        }}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Map className="mr-2 h-4 w-4" />
                                        View Map
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}