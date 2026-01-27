import { z } from "zod"

export const createVehicleSchema = z.object({
    vehicleNumber: z.string().min(1, "Vehicle number is required"),
    vehicleType: z.enum(['CAR', 'MOTORCYCLE', 'TRUCK', 'BUS', 'OTHER']),
    driverId: z.string().uuid("Invalid driver ID").refine((val) => val.trim() !== "", {
        message: "Driver ID cannot be empty"
    }),
    organizationId: z.string().uuid("Invalid organization ID")
})
