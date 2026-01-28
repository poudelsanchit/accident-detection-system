import { Router } from "express"
import { generateAccidentReport } from "../services/report"

const router = Router()

router.get("/accident/:organizationId", generateAccidentReport)

export default router
