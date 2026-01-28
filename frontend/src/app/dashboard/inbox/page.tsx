"use client"
import { Button } from "@/core/components/ui/button"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Inbox as InboxIcon, Building2, CheckCircle2, MapPin, Phone } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"

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

export default function InboxPage() {
    const { data: session } = useSession()
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)

    const fetchInvitations = async () => {
        if (!session?.user?.accessToken) return

        try {
            setLoading(true)
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
            } else {
                const errorData = await response.json()
                toast.error(errorData.message || "Failed to fetch invitations")
            }
        } catch (error) {
            console.error("Error fetching invitations:", error)
            toast.error("An error occurred while fetching invitations")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (session?.user?.accessToken) {
            fetchInvitations()
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
                // Remove accepted invitation from list
                setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
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

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-3">
                <InboxIcon className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Inbox</h1>
                    <p className="text-muted-foreground">
                        Manage your organization invitations
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading invitations...</div>
                </div>
            ) : invitations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <InboxIcon className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No invitations</h3>
                        <p className="text-muted-foreground text-sm text-center">
                            You don't have any pending invitations at the moment.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {invitations.map((invitation) => (
                        <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg mb-1">
                                                {invitation.organization.name}
                                            </CardTitle>
                                            <CardDescription className="flex flex-col gap-1">
                                                <span className="flex items-center gap-2">
                                                    <MapPin className="h-3 w-3" />
                                                    {invitation.organization.address}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3" />
                                                    {invitation.organization.phoneNumber}
                                                </span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge
                                        className={getRoleBadgeColor(invitation.inviteRole)}
                                    >
                                        {invitation.inviteRole}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Invited on {formatDate(invitation.createdAt)}
                                    </div>
                                    <Button
                                        onClick={() => handleAcceptInvitation(invitation.id)}
                                        disabled={acceptingId === invitation.id}
                                        className="gap-2"
                                    >
                                        {acceptingId === invitation.id ? (
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
                    ))}
                </div>
            )}
        </div>
    )
}
