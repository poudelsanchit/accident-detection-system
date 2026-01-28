import { Router } from "express"
import { createAccident, deleteAccident, getAccidentById, getAccidents, updateAccident, resolveAccident } from "../services/accident"
const router=Router()
router.post("/",createAccident)
router.get('/',getAccidents)
router.get('/:id',getAccidentById)
router.put('/:id',updateAccident)
router.delete('/:id',deleteAccident)
router.post('/:id/resolve',resolveAccident)
export default router