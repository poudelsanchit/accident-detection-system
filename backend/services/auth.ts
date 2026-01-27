import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"
import createMessage from "../config/twilio"
import jwt from "jsonwebtoken"
import { registerSchema, verifyCodeSchema, loginSchema } from "../schemas/auth"

export const register = async (req: Request, res: Response) => {
    try{
        const validationResult = registerSchema.safeParse(req.body)
        
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }

        const { phoneNumber, password ,phoneNumberPrefix} = validationResult.data

        const existingUser = await prisma.user.findUnique({
           where: {
            phoneNumber
           }
        })
        
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" })
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.create({
            data: {
                phoneNumber,
                password,
                verificationCode
            }
        })
        await createMessage(phoneNumberPrefix+phoneNumber,verificationCode);
        return res.status(200).json({ message: "Verification code sent to phone number" })
    } catch(err) {
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const verifyCode = async (req: Request, res: Response) => {
    try {
        const validationResult = verifyCodeSchema.safeParse(req.body)
        
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }

        const { phoneNumber, verificationCode } = validationResult.data
        
        const user = await prisma.user.findUnique({
            where: {
                phoneNumber
            }
        })
        
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        
        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ message: "Invalid verification code" })
        }
        
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isVerified: true,
                verificationCode: null 
            }
        })
        
        return res.status(200).json({ message: "Phone number verified successfully" })
    } catch(err) {
        return res.status(500).json({ message: "Internal server error" })
    }
}
export const login = async (req: Request, res: Response) => {
    try{
        const validationResult = loginSchema.safeParse(req.body)
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }
        const { phoneNumber, password } = validationResult.data
        const user = await prisma.user.findUnique({
            where: { phoneNumber ,
                password
            }
        })
        if (!user) {
            return res.status(404).json({ message: "user and password donot match" })
        }
        if(user.isVerified === false) {
            return res.status(400).json({ message: "User is not verified" })
        }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured")
        }
        const token = jwt.sign({ userId: user.id ,phoneNumber: user.phoneNumber,fullName: user.fullName}, process.env.JWT_SECRET, { expiresIn: "1h" })
        return res.status(200).json({ message: "Login successful", token })
    } catch(err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}