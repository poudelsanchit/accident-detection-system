import { Router } from "express"
import { getDashboardStats } from "../services/dashboard"

const router = Router()

router.get("/stats", getDashboardStats)

export default router
