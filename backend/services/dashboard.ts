import { Request, Response } from "express"
import { prisma } from "../config/prismaClient"

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Get user's organizations
    const userMemberships = await prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true }
    })

    const organizationIds = userMemberships.map(m => m.organizationId)

    if (organizationIds.length === 0) {
      return res.json({
        stats: {
          totalVehicles: 0,
          publicVehicles: 0,
          privateVehicles: 0,
          totalAccidents: 0,
          activeAlerts: 0,
          resolvedIncidents: 0,
          avgResponseTime: "0m",
          safetyScore: 100
        },
        accidents: [],
        organizations: [],
        accidentTrends: [],
        severityDistribution: [],
        vehicleTypeDistribution: []
      })
    }

    // Get all vehicles in user's organizations
    const vehicles = await prisma.vehicle.findMany({
      where: {
        organizationId: { in: organizationIds }
      },
      include: {
        organization: {
          select: {
            organizationType: true
          }
        }
      }
    })

    // Count public vs private vehicles
    const publicVehicles = vehicles.filter(v => 
      v.organization.organizationType !== "PRIVATE"
    ).length
    const privateVehicles = vehicles.filter(v => 
      v.organization.organizationType === "PRIVATE"
    ).length
    const totalVehicles = publicVehicles + privateVehicles

    // Get accidents from user's organizations
    const accidents = await prisma.accident.findMany({
      where: {
        organizationId: { in: organizationIds }
      },
      include: {
        vehicle: {
          include: {
            organization: {
              select: {
                organizationType: true
              }
            }
          }
        }
      },
      orderBy: {
        occurredAt: "desc"
      },
      take: 50
    })

    // Calculate stats
    const activeAlerts = accidents.filter(a => a.status === "REPORTED").length
    const resolvedIncidents = accidents.filter(a => a.status === "RESOLVED").length

    // Calculate average response time (mock calculation)
    const resolvedAccidents = accidents.filter(a => a.status === "RESOLVED")
    let avgResponseMinutes = 0
    if (resolvedAccidents.length > 0) {
      const totalMinutes = resolvedAccidents.reduce((sum, acc) => {
        const responseTime = (acc.updatedAt.getTime() - acc.occurredAt.getTime()) / 60000
        return sum + responseTime
      }, 0)
      avgResponseMinutes = totalMinutes / resolvedAccidents.length
    }

    // Calculate safety score (based on resolved vs total accidents)
    const safetyScore = accidents.length > 0 
      ? Math.round((resolvedIncidents / accidents.length) * 100)
      : 100

    // Get organizations with member and vehicle counts
    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: organizationIds }
      },
      include: {
        _count: {
          select: {
            vehicles: true,
            members: true
          }
        }
      }
    })

    // Accident trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyAccidents = await prisma.accident.groupBy({
      by: ['occurredAt'],
      where: {
        organizationId: { in: organizationIds },
        occurredAt: { gte: sixMonthsAgo }
      },
      _count: true
    })

    // Process monthly data
    const accidentTrends = []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = months[date.getMonth()]
      
      const monthAccidents = accidents.filter(a => {
        const accDate = new Date(a.occurredAt)
        return accDate.getMonth() === date.getMonth() && 
               accDate.getFullYear() === date.getFullYear()
      })
      
      const resolved = monthAccidents.filter(a => a.status === "RESOLVED").length
      
      accidentTrends.push({
        month: monthName,
        accidents: monthAccidents.length,
        resolved
      })
    }

    // Severity distribution (mock - you can add severity field to schema)
    const severityDistribution = [
      { name: "Low", value: Math.floor(accidents.length * 0.45), color: "#10b981" },
      { name: "Medium", value: Math.floor(accidents.length * 0.35), color: "#f59e0b" },
      { name: "High", value: Math.floor(accidents.length * 0.20), color: "#ef4444" }
    ]

    // Vehicle type distribution
    const vehicleTypeCounts = vehicles.reduce((acc, v) => {
      acc[v.vehicleType] = (acc[v.vehicleType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const vehicleTypeDistribution = Object.entries(vehicleTypeCounts).map(([type, count]) => ({
      type,
      count
    }))

    // Format accidents for response
    const formattedAccidents = accidents.map(acc => ({
      id: acc.id,
      vehicleId: acc.vehicle.vehicleNumber,
      location: `${acc.latitude.toFixed(4)}, ${acc.longitude.toFixed(4)}`,
      severity: acc.status === "REPORTED" ? "high" : acc.status === "CONFIRMED" ? "medium" : "low",
      timestamp: acc.occurredAt.toISOString().replace('T', ' ').substring(0, 16),
      status: acc.status.toLowerCase(),
      type: acc.vehicle.organization.organizationType === "PRIVATE" ? "private" : "public"
    }))

    // Format organizations for response
    const formattedOrganizations = organizations.map(org => ({
      id: org.id,
      name: org.name,
      vehicleCount: org._count.vehicles,
      memberCount: org._count.members
    }))

    res.json({
      stats: {
        totalVehicles,
        publicVehicles,
        privateVehicles,
        totalAccidents: accidents.length,
        activeAlerts,
        resolvedIncidents,
        avgResponseTime: `${avgResponseMinutes.toFixed(1)}m`,
        safetyScore
      },
      accidents: formattedAccidents,
      organizations: formattedOrganizations,
      accidentTrends,
      severityDistribution,
      vehicleTypeDistribution
    })

  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Failed to fetch dashboard stats" })
  }
}
