import { Router } from "express";
import { createInvitation, getInvitations, getInvitationsByOrganization, getMyInvitations, acceptInvitation, declineInvitation, deleteInvitation } from "../services/invitation";

const router = Router();

router.post('/create', createInvitation);
router.get('/my-invitations', getMyInvitations);
router.get('/organization/:organizationId', getInvitationsByOrganization);
router.get('/get', getInvitations);
router.post('/accept/:invitationId', acceptInvitation);
router.post('/decline', declineInvitation);
router.delete('/:invitationId', deleteInvitation);

export default router;