"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Zap,
  UserX,
  Settings,
  Users,
  Wifi,
  Shield,
  Globe,
  Activity,
  TrendingUp,
  TrendingDown,
  Power,
  PowerOff,
  Database,
  Server
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PPPoEUserForm } from "@/components/pppoe-user-form"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface PPPoEUser {
  id: string
  routerId: string
  username: string
  password?: string
  status: "ACTIVE" | "EXPIRED" | "DISABLED"
  activatedAt: string
  expiryAt?: string
  importedAt?: string
  source: "IMPORTED" | "MANUAL"
  lastRechargedAt?: string
  createdAt: string
  updatedAt: string
  router: {
    id: string
    friendlyName: string
    status: string
  }
}

interface UsersResponse {
  users: PPPoEUser[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function PPPoEUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<PPPoEUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routerFilter, setRouterFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUser, setSelectedUser] = useState<PPPoEUser | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [routers, setRouters] = useState<any[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchUsers()
      fetchRouters()
    }
  }, [status, router, currentPage, statusFilter, routerFilter])

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/routers")
      if (response.ok) {
        const data = await response.json()
        setRouters(data)
      }
    } catch (err) {
      console.error("Failed to fetch routers:", err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
      })

      if (searchTerm) {
        params.append("search", searchTerm)
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      if (routerFilter !== "all") {
        params.append("routerId", routerFilter)
      }

      const response = await fetch(`/api/pppoe-users?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.pages)
      setTotalUsers(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchUsers()
    setRefreshing(false)
  }

  const toggleUserStatus = async (userId: string, disable: boolean) => {
    try {
      const response = await fetch(`/api/pppoe-users/${userId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disable }),
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        setError(error.error || "Failed to toggle user status")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const rechargeUser = async (userId: string, days: number = 30) => {
    try {
      const response = await fetch(`/api/pppoe-users/${userId}/recharge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days }),
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        setError(error.error || "Failed to recharge user")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          badge: "bg-green-500/20 text-green-400 border-green-500/30",
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          label: "Active",
          color: "text-green-400",
          bg: "bg-green-500/10"
        }
      case "EXPIRED":
        return {
          badge: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: <XCircle className="h-5 w-5 text-red-400" />,
          label: "Expired",
          color: "text-red-400",
          bg: "bg-red-500/10"
        }
      case "DISABLED":
        return {
          badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          icon: <PowerOff className="h-5 w-5 text-gray-400" />,
          label: "Disabled",
          color: "text-gray-400",
          bg: "bg-gray-500/10"
        }
      default:
        return {
          badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          icon: <AlertTriangle className="h-5 w-5 text-gray-400" />,
          label: "Unknown",
          color: "text-gray-400",
          bg: "bg-gray-500/10"
        }
    }
  }

  const getDaysRemaining = (expiryAt?: string) => {
    if (!expiryAt) return null
    const expiry = new Date(expiryAt)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">PPPoE Users</h1>
                <p className="text-gray-400">Manage PPPoE users across all routers</p>
              </div>
              <Skeleton className="h-12 w-32 bg-gray-800" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24 bg-gray-700" />
                  <Skeleton className="h-8 w-8 bg-gray-700 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-16 bg-gray-700" />
              </div>
            ))}
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 bg-gray-700 rounded-xl" />
                    <div>
                      <Skeleton className="h-5 w-24 bg-gray-700 mb-1" />
                      <Skeleton className="h-4 w-16 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 bg-gray-700 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-12 bg-gray-700" />
                      <Skeleton className="h-4 w-16 bg-gray-700" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 bg-gray-700 rounded-lg" />
                  <Skeleton className="h-8 w-16 bg-gray-700 rounded-lg" />
                  <Skeleton className="h-8 w-16 bg-gray-700 rounded-lg" />
                </div>
              </div>
            ))}
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
            <Button onClick={fetchUsers} className="bg-red-600 hover:bg-red-700 text-white">
              Try Again
            </Button>
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
              <h1 className="text-4xl font-bold text-white mb-2">PPPoE Users</h1>
              <p className="text-gray-400">Manage PPPoE users across all routers</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl">
                    <Plus className="mr-3 h-5 w-5" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-0 shadow-2xl bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-white">Create New PPPoE User</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Add a new PPPoE user to a router
                    </DialogDescription>
                  </DialogHeader>
                  <PPPoEUserForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false)
                      fetchUsers()
                    }}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Alert className="border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{totalUsers}</div>
            </div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'ACTIVE').length}
              </div>
            </div>
            <div className="text-sm text-gray-400">Active</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'EXPIRED').length}
              </div>
            </div>
            <div className="text-sm text-gray-400">Expired</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center">
                <PowerOff className="h-6 w-6 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {users.filter(u => u.status === 'DISABLED').length}
              </div>
            </div>
            <div className="text-sm text-gray-400">Disabled</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-600 bg-gray-700/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-gray-600 bg-gray-700/50 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={routerFilter} onValueChange={setRouterFilter}>
              <SelectTrigger className="border-gray-600 bg-gray-700/50 text-white">
                <SelectValue placeholder="Filter by router" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routers</SelectItem>
                {routers.map((router) => (
                  <SelectItem key={router.id} value={router.id}>
                    {router.friendlyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={fetchUsers} disabled={loading} className="bg-gray-700/50 hover:bg-gray-700 text-white border-gray-600">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>

        {/* User Cards */}
        {users.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 text-center border border-gray-700">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UserX className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">No Users Found</h2>
            <p className="text-xl text-gray-300 mb-8">
              {searchTerm || statusFilter !== "all" || routerFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first PPPoE user"
              }
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl">
                  <Plus className="mr-3 h-5 w-5" />
                  Add Your First User
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {users.map((user, index) => {
                const statusConfig = getStatusConfig(user.status)
                const daysRemaining = getDaysRemaining(user.expiryAt)
                
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.bg}`}>
                            {statusConfig.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1">{user.username}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Server className="w-4 h-4" />
                              <span>{user.router.friendlyName}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-700/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-gray-400">Created</span>
                          </div>
                          <div className="text-white text-sm font-medium">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-gray-400">Source</span>
                          </div>
                          <div className="text-white text-sm font-medium">
                            {user.source === "IMPORTED" ? "Imported" : "Manual"}
                          </div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span className="text-xs text-gray-400">Expiry</span>
                          </div>
                          <div className="text-white text-sm font-medium">
                            {user.expiryAt ? (
                              <div className="flex items-center gap-1">
                                <span>{new Date(user.expiryAt).toLocaleDateString()}</span>
                                {daysRemaining !== null && (
                                  <Badge 
                                    className={`text-xs ${
                                      daysRemaining <= 3 
                                        ? "bg-red-500/20 text-red-400 border-red-500/30" 
                                        : "bg-green-500/20 text-green-400 border-green-500/30"
                                    }`}
                                  >
                                    {daysRemaining > 0 ? `${daysRemaining}d` : "Expired"}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No expiry</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-gray-400">Status</span>
                          </div>
                          <div className={`font-medium text-sm ${statusConfig.color}`}>
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-700">
                        {user.status === "ACTIVE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, true)}
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <PowerOff className="h-4 w-4 mr-1" />
                            Disable
                          </Button>
                        )}
                        
                        {(user.status === "DISABLED" || user.status === "EXPIRED") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, false)}
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <Power className="h-4 w-4 mr-1" />
                            Enable
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rechargeUser(user.id)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Page</span>
              <span className="text-white font-medium">{currentPage}</span>
              <span className="text-gray-400">of</span>
              <span className="text-white font-medium">{totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}