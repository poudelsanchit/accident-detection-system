import { Router } from "express"
import { createAlert, getAlertById, getAlerts, updateAlert } from "../services/alert"
const router=Router()
router.post("/",createAlert)
router.get('/',getAlerts)
router.get('/:id',getAlertById)
router.put('/:id',updateAlert)
export default router