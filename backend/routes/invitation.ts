import { Router } from "express";
import { createInvitation, getInvitations, acceptInvitation, declineInvitation, deleteInvitation } from "../services/invitation";

const router = Router();

router.post('/create', createInvitation);
router.get('/get', getInvitations);
router.post('/accept', acceptInvitation);
router.post('/decline', declineInvitation);
router.delete('/delete', deleteInvitation);

export default router;