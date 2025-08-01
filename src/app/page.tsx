"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Settings,
  BarChart3,
  Globe,
  Shield,
  Database,
  Zap as ZapIcon
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Network Management Overview</p>
              </div>
              <Skeleton className="h-12 w-32 bg-gray-800" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24 bg-gray-700" />
                  <Skeleton className="h-8 w-8 bg-gray-700 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-16 bg-gray-700" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-6 w-16 bg-gray-700 rounded-full" />
                  <Skeleton className="h-6 w-16 bg-gray-700 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Activity Feed */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-6 w-6 bg-gray-700" />
              <Skeleton className="h-6 w-32 bg-gray-700" />
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-5 w-24 bg-gray-600" />
                    <Skeleton className="h-4 w-20 bg-gray-600" />
                  </div>
                  <Skeleton className="h-4 w-full bg-gray-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <Button onClick={fetchDashboardSummary} className="bg-red-600 hover:bg-red-700 text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Data Available</h2>
            <p className="text-gray-400">Unable to load dashboard information</p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to router setup if no routers exist
  if (summary.routers.total === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-3xl p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Router className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to PPPoE Manager</h1>
            <p className="text-xl text-gray-300 mb-8">
              Let's get started by adding your first MikroTik router
            </p>
            <Link href="/routers">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl">
                <Plus className="mr-3 h-5 w-5" />
                Add Your First Router
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Network Management Overview</p>
            </div>
            <Button 
              onClick={fetchDashboardSummary} 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400">Live</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{summary.users.total}</div>
              <div className="text-sm text-blue-300 mb-3">Total Users</div>
              <div className="flex gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {summary.users.active} Active
                </Badge>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {summary.users.expired} Expired
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Routers Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Router className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-purple-400">Network</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{summary.routers.total}</div>
              <div className="text-sm text-purple-300 mb-3">Routers</div>
              <div className="flex gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {summary.routers.online} Online
                </Badge>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {summary.routers.offline} Offline
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Expiring Soon Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-orange-400">Urgent</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{summary.users.expiringSoon}</div>
              <div className="text-sm text-orange-300 mb-3">Expiring Soon</div>
              <div className="text-xs text-orange-400">
                Within next 3 days
              </div>
            </div>
          </motion.div>

          {/* Alerts Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-400">Alerts</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {summary.alerts.recentAutoDisables + summary.alerts.usersWithoutExpiry + summary.alerts.offlineRouters + summary.alerts.errorRouters}
              </div>
              <div className="text-sm text-red-300 mb-3">Active Alerts</div>
              <div className="flex gap-2 flex-wrap">
                {summary.alerts.usersWithoutExpiry > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    {summary.alerts.usersWithoutExpiry} No Expiry
                  </Badge>
                )}
                {summary.alerts.offlineRouters > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    {summary.alerts.offlineRouters} Offline
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <p className="text-gray-400 text-sm">Latest system events and actions</p>
                </div>
              </div>

              {summary.recentLogs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">All Systems Quiet</h3>
                  <p className="text-gray-400">No recent activity to display</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {summary.recentLogs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="group"
                      >
                        <div className="bg-gray-700/30 hover:bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-all duration-300">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {log.action}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{log.details}</p>
                          {log.router && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Router className="w-3 h-3" />
                              <span>{log.router.friendlyName}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                  <p className="text-gray-400 text-sm">Common tasks you might want to perform</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/routers">
                  <Button className="w-full justify-start bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 h-12">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Router className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Manage Routers</div>
                      <div className="text-xs text-gray-500">Configure network devices</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/pppoe-users">
                  <Button className="w-full justify-start bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 h-12">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Manage Users</div>
                      <div className="text-xs text-gray-500">PPPoE user management</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/speed-plans">
                  <Button className="w-full justify-start bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 h-12">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                      <ZapIcon className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Speed Plans</div>
                      <div className="text-xs text-gray-500">Manage speed limits</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/admin-users">
                  <Button className="w-full justify-start bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 h-12">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Admin Users</div>
                      <div className="text-xs text-gray-500">Manage administrators</div>
                    </div>
                  </Button>
                </Link>

                <Link href="/logs">
                  <Button className="w-full justify-start bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 h-12">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
                      <Activity className="h-4 w-4 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">View Logs</div>
                      <div className="text-xs text-gray-500">System activity logs</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}