import { Router } from "express"
import { deleteUser, getUserById, getUsers, updateUser } from "../services/user"
const router=Router()
router.get('/',getUsers)
router.get('/:id',getUserById)
router.put('/:id',updateUser)
router.delete('/:id',deleteUser)
export default router