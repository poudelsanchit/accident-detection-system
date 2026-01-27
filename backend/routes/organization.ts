import { Router } from "express"
import { createOrganization, deleteOrganization, getOrganizationById, getOrganizations, updateOrganization } from "../services/organization"
const router=Router()
router.post("/",createOrganization)
router.get('/',getOrganizations)
router.get('/:id',getOrganizationById)
router.put('/:id',updateOrganization)
router.delete('/:id',deleteOrganization)
export default router