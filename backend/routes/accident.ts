import { Router } from "express"
import { createAccident, deleteAccident, getAccidentById, getAccidents, updateAccident, resolveAccident, getMyAccidentAlerts } from "../services/accident"
const router=Router()
router.post("/",createAccident)
router.get('/',getAccidents)
router.get('/my-alerts', getMyAccidentAlerts) // Must come before /:id
router.get('/:id',getAccidentById)
router.put('/:id',updateAccident)
router.delete('/:id',deleteAccident)
router.post('/:id/resolve',resolveAccident)
export default router