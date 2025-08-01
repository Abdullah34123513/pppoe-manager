"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Shield,
  User,
  Lock,
  Calendar,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Users,
  Settings,
  Database
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"

interface AdminUser {
  id: string
  username: string
  createdAt: string
  updatedAt: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "" })
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchAdmins()
    }
  }, [status, router])

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin-users")
      if (!response.ok) {
        throw new Error("Failed to fetch admin users")
      }
      const data = await response.json()
      setAdmins(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAdmins()
    setRefreshing(false)
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAdmin),
      })

      if (response.ok) {
        setNewAdmin({ username: "", password: "" })
        setIsCreateDialogOpen(false)
        await fetchAdmins()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create admin user")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to delete this admin user?")) {
      return
    }

    setDeleteLoading(adminId)
    try {
      const response = await fetch(`/api/admin-users/${adminId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchAdmins()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete admin user")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setDeleteLoading(null)
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Admin Users</h1>
                <p className="text-gray-400">Manage system administrator accounts</p>
              </div>
              <Skeleton className="h-12 w-32 bg-gray-800" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24 bg-gray-700" />
                  <Skeleton className="h-8 w-8 bg-gray-700 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-16 bg-gray-700" />
              </div>
            ))}
          </div>

          {/* Admin Cards Grid */}
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
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-12 bg-gray-700" />
                    <Skeleton className="h-4 w-20 bg-gray-700" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 bg-gray-700" />
                    <Skeleton className="h-4 w-24 bg-gray-700" />
                  </div>
                </div>
                <div className="flex gap-2">
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
            <Button onClick={fetchAdmins} className="bg-red-600 hover:bg-red-700 text-white">
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
              <h1 className="text-4xl font-bold text-white mb-2">Admin Users</h1>
              <p className="text-gray-400">Manage system administrator accounts</p>
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
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-0 shadow-2xl bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-white">Create New Admin User</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Add a new administrator account to the system
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Username
                      </label>
                      <Input
                        type="text"
                        value={newAdmin.username}
                        onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                        required
                        placeholder="Enter username"
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Password
                      </label>
                      <Input
                        type="password"
                        value={newAdmin.password}
                        onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        required
                        placeholder="Enter password"
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    {error && (
                      <Alert className="border-red-500/20 bg-red-500/10">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-300">{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createLoading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex-1"
                      >
                        {createLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Create Admin
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{admins.length}</div>
            </div>
            <div className="text-sm text-gray-400">Total Admins</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{admins.length}</div>
            </div>
            <div className="text-sm text-gray-400">Active Accounts</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {admins.length > 0 ? Math.floor((new Date().getTime() - new Date(admins[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </div>
            </div>
            <div className="text-sm text-gray-400">Days Since First Admin</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search admin users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 pl-10"
            />
          </div>
        </div>

        {/* Admin Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAdmins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{admin.username}</h3>
                        <p className="text-sm text-gray-400">Administrator</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Active
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Created</span>
                      </div>
                      <span className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Last Updated</span>
                      </div>
                      <span className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(admin.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAdmin(admin.id)}
                      disabled={deleteLoading === admin.id}
                      className="border-red-600 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                    >
                      {deleteLoading === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredAdmins.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Admin Users Found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm ? "No admin users match your search criteria." : "Get started by creating your first admin user."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Admin User
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}