import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"
import createMessage from "../config/twilio"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { registerSchema, verifyCodeSchema, resendCodeSchema } from "../schemas/auth"

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
        const hashedPassword = await bcrypt.hash(password, 10)
        
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.create({
            data: {
                phoneNumber,
                password: hashedPassword,
                verificationCode
            }
        })
        await createMessage(phoneNumberPrefix+phoneNumber,verificationCode);
        return res.status(200).json({ message: "Verification code sent to phone number" })
    } catch(err:any) {
        console.error(err.message)
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

export const resendCode = async (req: Request, res: Response) => {
    try {
        const validationResult = resendCodeSchema.safeParse(req.body)
        
        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResult.error.issues
            })
        }

        const { phoneNumber, phoneNumberPrefix } = validationResult.data
        const user = await prisma.user.findUnique({
            where: {
                phoneNumber
            }
        })
        
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        
        // Check if user is already verified
        if (user.isVerified) {
            return res.status(400).json({ message: "User is already verified" })
        }
        
        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update user with new verification code
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                verificationCode
            }
        })
        
        // Send new verification code via Twilio
        await createMessage(phoneNumberPrefix + phoneNumber, verificationCode);
        
        return res.status(200).json({ message: "Verification code resent successfully" })
    } catch(err: any) {
        console.error(err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const login = async (req: Request, res: Response) => {
    try{      
        // Check if body exists
        if (!req.body) {
            return res.status(400).json({ 
                message: "Request body is undefined. Ensure you're sending JSON with Content-Type: application/json",
                hint: "Make sure your request includes: Content-Type: application/json header"
            })
        }
        
        const { phoneNumber, password } = req.body
        
        if(!phoneNumber || !password) {
            return res.status(400).json({ 
                message: "Phone number and password are required",
                received: { phoneNumber: !!phoneNumber, password: !!password }
            })
        }
        // if (!validationResult.success) {
        //     return res.status(400).json({
        //         message: "Validation failed",
        //         errors: validationResult.error.issues
        //     })
        // }
        
        // Find user by phone number only
        const user = await prisma.user.findUnique({
            where: { phoneNumber }
        })
        
        if (!user) {
            return res.status(401).json({ message: "Invalid phone number " })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid phone number or password" })
        }
        // if(user.isVerified === false) {
        //     return res.status(400).json({ message: "User is not verified" })
        // }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured")
        }
        const token = jwt.sign({ userId: user.id,isVerified:user.isVerified ,phoneNumber: user.phoneNumber,fullName: user.fullName}, process.env.JWT_SECRET, { expiresIn: "2d" })
        return res.status(200).json({ message: "Login successful", token,userId:user.id,phoneNumber:user.phoneNumber,fullName:user.fullName })
    } catch(err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}