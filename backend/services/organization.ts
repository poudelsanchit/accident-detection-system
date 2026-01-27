import type { Request, Response } from "express";
import { prisma } from "../config/prismaClient";
import { z } from "zod";
const createOrganizationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().min(1, "Address is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    type: z.enum(['SCHOOL', 'HOSPITAL', 'MUNICIPALITY', 'POLICE_STATION', 'PRIVATE']),
})
export const createOrganization = async (req: Request, res: Response) => {
    try{
        const validationResult = createOrganizationSchema.safeParse(req.body)
        const userId = (req as any).user.userId
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }
      
        const {name,address,phoneNumber,type}=validationResult.data
        const organization=await prisma.organization.create({
            data:{
                name,
                address,
                phoneNumber,
                organizationType:type
            }
        })
        await prisma.organizationMember.create({
            data:{
                organizationId:organization.id,
                userId:userId,
                role:"ADMIN"
            }
        })
        return res.status(201).json({ message: "Organization created successfully", organization,userId:userId })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const getOrganizations = async (req: Request, res: Response) => {
    try{
        const organization=await prisma.organization.findMany({
            include:{
                members:true
            }
        })
        return res.status(200).json({
            message:"Organizations fetched successfully",
            organizations:organization
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getMyOrganizations = async (req: Request, res: Response) => {
    try{
        const userId = (req as any).user?.userId
        
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        // Get all organizations where the user is a member
        const memberships = await prisma.organizationMember.findMany({
            where: {
                userId: userId
            },
            include: {
                organization: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        phoneNumber: true,
                                        fullName: true
                                    }
                                }
                            }
                        },
                        vehicles: true,
                        accidents: true
                    }
                }
            }
        })

        // Transform the data to include the user's role in each organization
        const organizations = memberships.map(membership => ({
            ...membership.organization,
            myRole: membership.role
        }))

        return res.status(200).json({
            message: "User organizations fetched successfully",
            organizations: organizations
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const getOrganizationById = async (req: Request, res: Response) => {
    try{
        const organizationId=req.params.id
        const organization=await prisma.organization.findUnique({
            where:{
                id:organizationId as string
            },
            include:{
                members:true
            }
        })
        if(!organization){
            return res.status(404).json({ message: "Organization not found" })
        }
        return res.status(200).json({
            message:"Organization fetched successfully",
            organization:organization
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const updateOrganization = async (req: Request, res: Response) => {}
export const deleteOrganization = async (req: Request, res: Response) => {
    try{
        const organizationId=req.params.userId
        const organization=await prisma.organization.delete({
            where:{
                id:organizationId as string
            }
        })
        if(!organization){
            return res.status(404).json({ message: "Organization not found" })
        }
        return res.status(200).json({
            message:"Organization deleted successfully",
            organization:organization
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}