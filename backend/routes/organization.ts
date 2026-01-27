import { Router } from "express"
import { createOrganization, deleteOrganization, getOrganizationById, getOrganizations, getMyOrganizations, updateOrganization } from "../services/organization"
const router=Router()
router.post("/",createOrganization)
router.get('/my-organizations', getMyOrganizations)
router.get('/',getOrganizations)
router.get('/:id',getOrganizationById)
router.put('/:id',updateOrganization)
router.delete('/:id',deleteOrganization)
export default router