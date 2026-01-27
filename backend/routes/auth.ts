import { Router } from "express"
import { login, register, verifyCode } from "../services/auth"
const router=Router()
router.post("/register",register)
router.post("/login",login)
router.post("/verify-code",verifyCode)
router.post("/login",login)
export default router