import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"

export const createVehicle = async (req: Request, res: Response) => {
    try{
        const {vehicleNumber,vehicleType,driverId,organizationId}=req.body
        const vehicle=await prisma.vehicle.create({
            data:{
                vehicleNumber,
                vehicleType,
                driverId,
                organizationId
            },
            include:{
                driver:true,
                organization:true
            }
        })
        return res.status(201).json({ message: "Vehicle created successfully", vehicle })
    }catch(err:any){
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const getVehicles = async (req: Request, res: Response) => {}
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