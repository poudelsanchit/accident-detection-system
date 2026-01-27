import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"
import { createAccidentSchema, updateAccidentSchema } from "../schemas/accident"

export const createAccident = async (req: Request, res: Response) => {
    try{
        const validationResult = createAccidentSchema.safeParse(req.body)
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }
        const {title,description,latitude,longitude,occurredAt,status,vehicleId,organizationId}=validationResult.data
        
        // Convert occurredAt string to Date if needed
        const occurredAtDate = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt
        
        const accident=await prisma.accident.create({
            data:{
                title,
                description:description || null,
                latitude,
                longitude,
                occurredAt: occurredAtDate,
                status,
                vehicleId,
                organizationId
            },
            include: {
                vehicle: true,
                organization: true
            }
        })
        return res.status(201).json({ message: "Accident created successfully", accident })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getAccidents = async (req: Request, res: Response) => {
    try{
        const { organizationId, vehicleId, status } = req.query
        
        const where: any = {}
        if (organizationId) where.organizationId = organizationId as string
        if (vehicleId) where.vehicleId = vehicleId as string
        if (status) where.status = status as string
        
        const accidents = await prisma.accident.findMany({
            where,
            include: {
                vehicle: true,
                organization: true
            },
            orderBy: {
                occurredAt: 'desc'
            }
        })
        
        return res.status(200).json({ 
            message: "Accidents fetched successfully", 
            accidents 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getAccidentById = async (req: Request, res: Response) => {
    try{
        const { id } = req.params
        const accidentId = Array.isArray(id) ? id[0] : id
        
        if (!accidentId) {
            return res.status(400).json({ message: "Accident ID is required" })
        }
        
        const accident = await prisma.accident.findUnique({
            where: { id: accidentId },
            include: {
                vehicle: true,
                organization: true
            }
        })
        
        if (!accident) {
            return res.status(404).json({ message: "Accident not found" })
        }
        
        return res.status(200).json({ 
            message: "Accident fetched successfully", 
            accident 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const updateAccident = async (req: Request, res: Response) => {
    try{
        const { id } = req.params
        const accidentId = Array.isArray(id) ? id[0] : id
        
        if (!accidentId) {
            return res.status(400).json({ message: "Accident ID is required" })
        }
        
        const validationResult = updateAccidentSchema.safeParse(req.body)
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }
        
        // Check if accident exists
        const existingAccident = await prisma.accident.findUnique({
            where: { id: accidentId }
        })
        
        if (!existingAccident) {
            return res.status(404).json({ message: "Accident not found" })
        }
        
        const updateData: any = { ...validationResult.data }
        
        // Convert occurredAt string to Date if provided
        if (updateData.occurredAt && typeof updateData.occurredAt === 'string') {
            updateData.occurredAt = new Date(updateData.occurredAt)
        }
        
        const accident = await prisma.accident.update({
            where: { id: accidentId },
            data: updateData,
            include: {
                vehicle: true,
                organization: true
            }
        })
        
        return res.status(200).json({ 
            message: "Accident updated successfully", 
            accident 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const deleteAccident = async (req: Request, res: Response) => {
    try{
        const { id } = req.params
        const accidentId = Array.isArray(id) ? id[0] : id
        
        if (!accidentId) {
            return res.status(400).json({ message: "Accident ID is required" })
        }
        
        // Check if accident exists
        const existingAccident = await prisma.accident.findUnique({
            where: { id: accidentId as string }
        })
        
        if (!existingAccident) {
            return res.status(404).json({ message: "Accident not found" })
        }
        
        await prisma.accident.delete({
            where: { id: accidentId as string }
        })
        
        return res.status(200).json({ 
            message: "Accident deleted successfully" 
        })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}