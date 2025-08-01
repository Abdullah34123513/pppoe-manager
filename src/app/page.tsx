"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, 
  Router, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  Activity,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface DashboardSummary {
  users: {
    total: number
    active: number
    expired: number
    disabled: number
    expiringSoon: number
    withoutExpiry: number
  }
  routers: {
    total: number
    online: number
    offline: number
    error: number
  }
  alerts: {
    recentAutoDisables: number
    usersWithoutExpiry: number
    offlineRouters: number
    errorRouters: number
  }
  recentLogs: Array<{
    id: string
    action: string
    details: string
    timestamp: string
    router?: { id: string; friendlyName: string }
    pppoeUser?: { id: string; username: string }
  }>
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchDashboardSummary()
    }
  }, [status, router])

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch("/api/dashboard-summary")
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard summary")
      }
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error loading dashboard: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No dashboard data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Redirect to router setup if no routers exist
  if (summary.routers.total === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to PPPoE Manager</CardTitle>
            <CardDescription>
              Let's get started by adding your first MikroTik router
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Router className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="mb-6 text-gray-600">
              You need to configure at least one router to manage PPPoE users.
            </p>
            <Link href="/routers">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Router
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={fetchDashboardSummary} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.users.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {summary.users.active} Active
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {summary.users.expired} Expired
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routers</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.routers.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                {summary.routers.online} Online
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {summary.routers.offline} Offline
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.users.expiringSoon}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Within next 3 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.alerts.recentAutoDisables + summary.alerts.usersWithoutExpiry + summary.alerts.offlineRouters + summary.alerts.errorRouters}
            </div>
            <div className="flex gap-2 mt-2">
              {summary.alerts.usersWithoutExpiry > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
                  {summary.alerts.usersWithoutExpiry} No Expiry
                </Badge>
              )}
              {summary.alerts.offlineRouters > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.alerts.offlineRouters} Offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and actions</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {summary.recentLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {log.action}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.details}</p>
                  {log.router && (
                    <p className="text-xs text-gray-500 mt-1">
                      Router: {log.router.friendlyName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you might want to perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/routers">
              <Button variant="outline" className="w-full justify-start">
                <Router className="mr-2 h-4 w-4" />
                Manage Routers
              </Button>
            </Link>
            <Link href="/pppoe-users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/logs">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}