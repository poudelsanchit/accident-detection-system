import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try{
        const token = req.headers.authorization
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
        if(!decoded){
            return res.status(401).json({ message: "Unauthorized" })
        }
      
        (req as any).user = decoded
        next()
    } catch(err) {
        console.error(err)
        return res.status(500).json({ message: "Internal server error" })
    }
}