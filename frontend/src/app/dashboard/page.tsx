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
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/core/components/ui/dialog"
import { toast } from "sonner"

export default function Dashboard() {
    const { data: session } = useSession()
    console.log(session)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phoneNumber: "",
        type: "",
    })

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
                toast({
                    title: "Success",
                    description: data.message || "Organization created successfully",
                })
                setOpen(false)
                setFormData({
                    name: "",
                    address: "",
                    phoneNumber: "",
                    type: "",
                })
            } else {
                toast("Failed to create organization")
            }
        } catch (error) {
            toast("An unexpected error occurred. Please try again.",
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex p-4 flex-col">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="w-fit">
                        Create Organization
                        <Plus />
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
    )
}