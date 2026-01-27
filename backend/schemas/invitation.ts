import { z } from "zod"

export const createInvitationSchema = z.object({
    phoneNumber: z.string()
        .min(10, "Phone number must be at least 10 characters")
        .regex(/^[0-9+\-\s()]+$/, "Phone number must contain only numbers and valid characters"),
    organizationId: z.string().uuid("Invalid organization ID"),
    inviteRole: z.enum(['ADMIN', 'DRIVER', 'VIEWER'])
})
