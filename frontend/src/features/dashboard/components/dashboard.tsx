"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Badge } from "@/core/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/core/components/ui/chart"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Activity, AlertTriangle, Car, Users, TrendingUp, TrendingDown, Building2, Shield } from "lucide-react"

interface Accident {
  id: string
  vehicleId: string
  location: string
  severity: string
  timestamp: string
  status: string
  type: "public" | "private"
}

interface Organization {
  id: string
  name: string
  vehicleCount: number
  memberCount: number
}

interface Stats {
  totalVehicles: number
  publicVehicles: number
  privateVehicles: number
  totalAccidents: number
  activeAlerts: number
  resolvedIncidents: number
  avgResponseTime: string
  safetyScore: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0,
    publicVehicles: 0,
    privateVehicles: 0,
    totalAccidents: 0,
    activeAlerts: 0,
    resolvedIncidents: 0,
    avgResponseTime: "0m",
    safetyScore: 0
  })
  const [accidents, setAccidents] = useState<Accident[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [accidentTrendData, setAccidentTrendData] = useState<any[]>([])
  const [severityData, setSeverityData] = useState<any[]>([])
  const [vehicleTypeData, setVehicleTypeData] = useState<any[]>([])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.accessToken) {
      fetchDashboardData()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status, session])

  const fetchDashboardData = async () => {
    try {
      if (!session?.user?.accessToken) {
        console.error("No authentication token found")
        setLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/stats`, {
        headers: {
          "Authorization": session.user.accessToken,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const data = await response.json()
      
      setStats(data.stats)
      setAccidents(data.accidents)
      setOrganizations(data.organizations)
      setAccidentTrendData(data.accidentTrends)
      setSeverityData(data.severityDistribution)
      setVehicleTypeData(data.vehicleTypeDistribution)
      
      setLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
      default: return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    return statusLower === "active" || statusLower === "reported" ? "destructive" : "secondary"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your fleet and safety metrics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Vehicles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publicVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.publicVehicles / stats.totalVehicles) * 100).toFixed(0)}% of total fleet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.resolvedIncidents} resolved today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.safetyScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5.2%
              </span>{" "}
              improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.privateVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.privateVehicles / stats.totalVehicles) * 100).toFixed(0)}% of total fleet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccidents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-600 inline-flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -8%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Accident Trends</CardTitle>
            <CardDescription>Monthly accident reports and resolution rates</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                accidents: { label: "Accidents", color: "#ef4444" },
                resolved: { label: "Resolved", color: "#10b981" },
              }}
              className="h-[300px]"
            >
              <LineChart data={accidentTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="accidents" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Breakdown by incident severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "Count" },
              }}
              className="h-[300px]"
            >
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Type Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Composition</CardTitle>
          <CardDescription>Public vs Private vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: { label: "Vehicles", color: "#3b82f6" },
            }}
            className="h-[200px]"
          >
            <BarChart data={vehicleTypeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="type" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* My Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>My Organizations</CardTitle>
          <CardDescription>Organizations you are a member of</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{org.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vehicles</span>
                    <span className="font-semibold">{org.vehicleCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-semibold">{org.memberCount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latest Accidents */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Accidents</CardTitle>
          <CardDescription>Recent accident reports across your fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="public">Public</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accidents.map((accident) => (
                    <TableRow key={accident.id}>
                      <TableCell className="font-medium">{accident.vehicleId}</TableCell>
                      <TableCell>{accident.location}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(accident.severity)}>
                          {accident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{accident.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{accident.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(accident.status)}>
                          {accident.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="public" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accidents.filter(a => a.type === "public").map((accident) => (
                    <TableRow key={accident.id}>
                      <TableCell className="font-medium">{accident.vehicleId}</TableCell>
                      <TableCell>{accident.location}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(accident.severity)}>
                          {accident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{accident.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(accident.status)}>
                          {accident.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="private" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accidents.filter(a => a.type === "private").map((accident) => (
                    <TableRow key={accident.id}>
                      <TableCell className="font-medium">{accident.vehicleId}</TableCell>
                      <TableCell>{accident.location}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(accident.severity)}>
                          {accident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{accident.timestamp}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(accident.status)}>
                          {accident.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}