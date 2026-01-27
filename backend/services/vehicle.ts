import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"
import { createVehicleSchema } from "../schemas/vehicle"

export const createVehicle = async (req: Request, res: Response) => {
    try{
        // Simple validation
        const validationResult = createVehicleSchema.safeParse(req.body)
        
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }

        const {vehicleNumber, vehicleType, driverId, organizationId, ipAddress, port} = validationResult.data
        
        // Verify driver exists
        const driver = await prisma.user.findUnique({
            where: { id: driverId }
        })

        if (!driver) {
            return res.status(404).json({ 
                message: "Driver not found" 
            })
        }

        // Verify organization exists
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId }
        })
        
        if (!organization) {
            return res.status(404).json({ 
                message: "Organization not found" 
            })
        }

        // Check if vehicle number already exists
        const existingVehicle = await prisma.vehicle.findFirst({
            where: {
                vehicleNumber,
                organizationId
            }
        })

        if (existingVehicle) {
            return res.status(400).json({ 
                message: "Vehicle number already exists in this organization" 
            })
        }
        
        // Simple create using Prisma
        const vehicle = await prisma.vehicle.create({
            data: {
                vehicleNumber,
                vehicleType,
                driverId,
                organizationId,
                ipAddress: ipAddress || null,
                port: port || 81 // Default to port 81 if not provided
            },
            include:{
                driver: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        fullName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })
        
        return res.status(201).json({ 
            message: "Vehicle created successfully", 
            vehicle 
        })
    }catch(err:any){
        console.error("Error creating vehicle:", err)
        console.error("Error details:", {
            message: err.message,
            code: err.code,
            meta: err.meta
        })
        
        // Provide more detailed error message
        if (err.code === 'P2002') {
            return res.status(400).json({ 
                message: "Vehicle number already exists in this organization" 
            })
        }
        
        if (err.code === 'P2003') {
            return res.status(400).json({ 
                message: `Invalid reference: ${err.meta?.field_name || 'unknown field'}` 
            })
        }
        
        return res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        })
    }
}

export const getVehicles = async (req: Request, res: Response) => {
    try{
        const { organizationId } = req.query
        
        const where: any = {}
        if (organizationId) {
            where.organizationId = organizationId as string
        }

        const vehicles = await prisma.vehicle.findMany({
            where,
            include: {
                driver: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        fullName: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                accidents: {
                    select: {
                        id: true,
                        status: true,
                        occurredAt: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        
        return res.status(200).json({ 
            message: "Vehicles fetched successfully", 
            vehicles 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getVehiclesByOrganization = async (req: Request, res: Response) => {
    try{
        const { organizationId } = req.params
        const orgId = Array.isArray(organizationId) ? organizationId[0] : organizationId
        const userId = (req as any).user?.userId

        if (!userId || !orgId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        // Verify user is a member of this organization
        const membership = await prisma.organizationMember.findFirst({
            where: {
                userId: userId as string,
                organizationId: orgId as string
            }
        })

        if (!membership) {
            return res.status(403).json({ 
                message: "You are not a member of this organization" 
            })
        }

        const vehicles = await prisma.vehicle.findMany({
            where: {
                organizationId: orgId as string
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        fullName: true
                    }
                },
                accidents: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        occurredAt: true
                    },
                    orderBy: {
                        occurredAt: 'desc'
                    },
                    take: 5 // Get latest 5 accidents
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        
        return res.status(200).json({ 
            message: "Vehicles fetched successfully", 
            vehicles 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const getVehicleById = async (req: Request, res: Response) => {
    try{
        const {id}=req.params
        const vehicle=await prisma.vehicle.findUnique({
            where:{id:id as string}
        })
        if(!vehicle){
            return res.status(404).json({ message: "Vehicle not found" })
        }
        return res.status(200).json({ message: "Vehicle fetched successfully", vehicle })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const updateVehicle = async (req: Request, res: Response) => {}
export const deleteVehicle = async (req: Request, res: Response) => {
    try{
        const {id}=req.params
        await prisma.vehicle.delete({
            where:{id:id as string}
        })
        return res.status(200).json({ message: "Vehicle deleted successfully" })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}