import { Router } from "express"
import express from "express"
import { login, register, verifyCode, resendCode } from "../services/auth"

const router = Router()
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

router.post("/register", register)
router.post("/verify-code", verifyCode)
router.post("/resend-code", resendCode)
router.post("/login", login)

export default router