import { Router } from "express"
import { createAccident, deleteAccident, getAccidentById, getAccidents, updateAccident } from "../services/accident"
const router=Router()
router.post("/",createAccident)
router.get('/',getAccidents)
router.get('/:id',getAccidentById)
router.put('/:id',updateAccident)
router.delete('/:id',deleteAccident)
export default router