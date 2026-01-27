import { Router } from "express"
import express from "express"
import { login, register, verifyCode, resendCode, getCurrentUserstatus } from "../services/auth"
import { authMiddleware } from "../middleware/authMiddleware"

const router = Router()
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

router.post("/register", register)
router.post("/verify-code", verifyCode)
router.post("/resend-code", resendCode)
router.post("/login", login)
router.get("/current-user-status", authMiddleware, getCurrentUserstatus)

export default router