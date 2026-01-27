import { z } from "zod"

export const createAccidentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
    longitude: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
    occurredAt: z.string().datetime("Invalid date format").or(z.date()),
    status: z.enum(['REPORTED', 'CONFIRMED', 'RESOLVED']),
    vehicleId: z.string().uuid("Invalid vehicle ID"),
    organizationId: z.string().uuid("Invalid organization ID")
})

export const updateAccidentSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().optional(),
    latitude: z.number().min(-90).max(90, "Latitude must be between -90 and 90").optional(),
    longitude: z.number().min(-180).max(180, "Longitude must be between -180 and 180").optional(),
    occurredAt: z.string().datetime("Invalid date format").or(z.date()).optional(),
    status: z.enum(['REPORTED', 'CONFIRMED', 'RESOLVED']).optional(),
    vehicleId: z.string().uuid("Invalid vehicle ID").optional(),
    organizationId: z.string().uuid("Invalid organization ID").optional()
})
