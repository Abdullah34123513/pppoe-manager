"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Settings
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchUsers()
    }
  }, [status, router, currentPage, statusFilter, routerFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "EXPIRED":
        return <Badge variant="destructive">Expired</Badge>
      case "DISABLED":
        return <Badge variant="secondary">Disabled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "EXPIRED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "DISABLED":
        return <UserX className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">PPPoE Users</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
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
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">PPPoE Users</h1>
          <p className="text-gray-600">Manage PPPoE users across all routers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New PPPoE User</DialogTitle>
                <DialogDescription>
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

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Filter by router" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routers</SelectItem>
                {/* This would be populated with actual routers */}
              </SelectContent>
            </Select>
            <Button onClick={fetchUsers} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Users ({totalUsers})
          </CardTitle>
          <CardDescription>
            All PPPoE users across configured routers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" || routerFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first PPPoE user"
                }
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Router</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const daysRemaining = getDaysRemaining(user.expiryAt)
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.router.friendlyName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(user.status)}
                            {getStatusBadge(user.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.expiryAt ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {new Date(user.expiryAt).toLocaleDateString()}
                              </span>
                              {daysRemaining !== null && (
                                <Badge 
                                  variant={daysRemaining <= 3 ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {daysRemaining > 0 ? `${daysRemaining}d` : "Expired"}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">No expiry set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.source === "IMPORTED" ? "Imported" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.status === "ACTIVE" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, true)}
                              >
                                Disable
                              </Button>
                            )}
                            {(user.status === "DISABLED" || user.status === "EXPIRED") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, false)}
                              >
                                Enable
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rechargeUser(user.id)}
                            >
                              <Clock className="h-4 w-4" />
                              Recharge
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}