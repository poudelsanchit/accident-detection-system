import type { Request, Response } from "express";
import { prisma } from "../config/prismaClient";
import { createInvitationSchema } from "../schemas/invitation";

export async function createInvitation(req:Request,res:Response){
try{
    const validationResult = createInvitationSchema.safeParse(req.body)
    
    if (!validationResult.success) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validationResult.error.issues
        })
    }

    const { phoneNumber, organizationId, inviteRole } = validationResult.data
    const currentUserId = (req as any).user?.userId

    if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    // Verify current user is ADMIN of the organization
    const membership = await prisma.organizationMember.findFirst({
        where: {
            userId: currentUserId,
            organizationId,
            role: "ADMIN"
        }
    })

    if (!membership) {
        return res.status(403).json({ 
            message: "Only admins can invite users to the organization" 
        })
    }

    // Find user by phone number
    const user = await prisma.user.findUnique({
        where: { phoneNumber }
    })

    if (!user) {
        return res.status(404).json({ 
            message: "User not found with this phone number" 
        })
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
        where: {
            userId: user.id,
            organizationId
        }
    })

    if (existingMember) {
        return res.status(400).json({ 
            message: "User is already a member of this organization" 
        })
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
        where: {
            userId_organizationId: {
                userId: user.id,
                organizationId
            }
        }
    })

    if (existingInvitation) {
        return res.status(400).json({ 
            message: "Invitation already sent to this user" 
        })
    }

    const invitation = await prisma.invitation.create({
        data:{
            userId: user.id,
            organizationId,
            inviteRole
        },
        include: {
            user: {
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
        message: "Invitation created successfully",
        invitation
    })
}catch(err:any){
    console.error(err.message)
    return res.status(500).json({ message: "Internal server error" })
}
}

export async function getInvitationsByOrganization(req:Request,res:Response){
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

        const invitations = await prisma.invitation.findMany({
            where: {
                organizationId: orgId as string
            },
            include: {
                user: {
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    
        return res.status(200).json({
            message: "Invitations fetched successfully",
            invitations
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export async function getInvitations(req:Request,res:Response){
    try{
        const {userId,organizationId}=req.body
        const invitations=await prisma.invitation.findMany({
            where:{
                userId,
                organizationId
            }
        })
    
    return res.status(200).json({
        message: "Invitations fetched successfully",
        invitations
    })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export async function getMyInvitations(req:Request,res:Response){
    try{
        const userId = (req as any).user?.userId

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const invitations = await prisma.invitation.findMany({
            where: {
                userId: userId as string
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        phoneNumber: true,
                        organizationType: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        fullName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    
        return res.status(200).json({
            message: "Invitations fetched successfully",
            invitations
        })
    }
    catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export async function acceptInvitation(req:Request,res:Response){
    try{
        const { invitationId } = req.params
        const invId = Array.isArray(invitationId) ? invitationId[0] : invitationId
        const userId = (req as any).user?.userId

        if (!userId || !invId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        // Find the invitation
        const invitation = await prisma.invitation.findUnique({
            where: {
                id: invId as string
            }
        })

        if(!invitation){
            return res.status(404).json({ message: "Invitation not found" })
        }

        // Verify the invitation belongs to the current user
        if(invitation.userId !== userId){
            return res.status(403).json({ message: "This invitation is not for you" })
        }

        // Check if user is already a member
        const existingMember = await prisma.organizationMember.findFirst({
            where: {
                userId: userId as string,
                organizationId: invitation.organizationId
            }
        })

        if (existingMember) {
            // Delete the invitation since user is already a member
            await prisma.invitation.delete({
                where: { id: invId as string }
            })
            return res.status(400).json({ 
                message: "You are already a member of this organization" 
            })
        }

        // Create organization member
        const organizationMember = await prisma.organizationMember.create({
            data:{
                userId: userId as string,
                organizationId: invitation.organizationId,
                role: invitation.inviteRole
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        // Delete the invitation after accepting
        await prisma.invitation.delete({
            where: { id: invId as string }
        })

        return res.status(200).json({ 
            message: "Invitation accepted successfully", 
            organizationMember 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export async function declineInvitation(req:Request,res:Response){
    try{
        const {userId,organizationId}=req.body
        const invitation=await prisma.invitation.findUnique({
            where:{
                userId_organizationId: {
                    userId,
                    organizationId
                }
            }
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export async function deleteInvitation(req:Request,res:Response){
    try{
        const { invitationId } = req.params
        const invId = Array.isArray(invitationId) ? invitationId[0] : invitationId
        const userId = (req as any).user?.userId

        if (!userId || !invId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        // Get invitation to verify permissions
        const invitation = await prisma.invitation.findUnique({
            where: { id: invId as string },
            include: {
                organization: {
                    include: {
                        members: true
                    }
                }
            }
        })

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" })
        }

        // Verify user is ADMIN of the organization
        const membership = await prisma.organizationMember.findFirst({
            where: {
                userId: userId as string,
                organizationId: invitation.organizationId,
                role: "ADMIN"
            }
        })

        if (!membership) {
            return res.status(403).json({ 
                message: "Only admins can delete invitations" 
            })
        }

        await prisma.invitation.delete({
            where:{
                id: invId as string
            }
        })
        return res.status(200).json({ message: "Invitation deleted successfully" })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}