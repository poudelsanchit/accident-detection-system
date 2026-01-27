import { Router } from "express"
import { createVehicle, deleteVehicle, getVehicleById, getVehicles, getVehiclesByOrganization, updateVehicle } from "../services/vehicle"
const router=Router()
router.post("/", createVehicle)
router.get('/organization/:organizationId', getVehiclesByOrganization)
router.get('/', getVehicles)
router.get('/:id', getVehicleById)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)
export default router