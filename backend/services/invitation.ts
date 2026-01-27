import type { Request, Response } from "express";
import { prisma } from "../config/prismaClient";

export async function createInvitation(req:Request,res:Response){
try{
    const {userId,organizationId,inviteRole}=req.body
    const invitation=await prisma.invitation.create({
        data:{
            userId,
            organizationId,
            inviteRole
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
export async function acceptInvitation(req:Request,res:Response){
    try{
        const {userId,organizationId,inviteRole}=req.body
        const invitation=await prisma.invitation.findUnique({
            where:{
                userId_organizationId: {
                    userId,
                    organizationId
                }
            }
        })
        if(!invitation){
            return res.status(404).json({ message: "Invitation not found" })
        }
        if(invitation.inviteRole!==inviteRole){
            return res.status(400).json({ message: "Invalid invitation role" })
        }
        const organizationMember=await prisma.organizationMember.create({
            data:{
                userId,
                organizationId,
                role:inviteRole
            }
        })
        return res.status(200).json({ message: "Invitation accepted successfully", organizationMember })
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
        const {userId,organizationId}=req.body
        await prisma.invitation.delete({
            where:{
                userId_organizationId: {
                    userId,
                    organizationId
                }
            }
        })
        return res.status(200).json({ message: "Invitation deleted successfully" })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}