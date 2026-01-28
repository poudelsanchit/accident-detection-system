"use client"
import { Button } from "@/core/components/ui/button"
import { 
    Building2, 
    MapPin, 
    Phone, 
    Users, 
    Car, 
    AlertTriangle, 
    Map
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function PublicPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loadingOrgs, setLoadingOrgs] = useState(true)

    // Fetch user's organizations
    const fetchOrganizations = async () => {
        if (!session?.user?.accessToken) return
        
        try {
            setLoadingOrgs(true)
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organization/public-organizations`,
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
                <h1 className="text-3xl font-bold">Public Organizations</h1>
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