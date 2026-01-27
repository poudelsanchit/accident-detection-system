import { z } from "zod"

export const createVehicleSchema = z.object({
    vehicleNumber: z.string().min(1, "Vehicle number is required"),
    vehicleType: z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'BUS', 'OTHER']),
    driverId: z.string().uuid("Invalid driver ID").refine((val) => val.trim() !== "", {
        message: "Driver ID cannot be empty"
    }),
    organizationId: z.string().uuid("Invalid organization ID"),
    ipAddress: z.string().optional().refine((val) => {
        if (!val || val.trim() === "") return true // Optional field
        // Basic IP address validation (IPv4)
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        return ipRegex.test(val)
    }, {
        message: "Invalid IP address format"
    }),
    port: z.number().int().min(1).max(65535).optional()
})
