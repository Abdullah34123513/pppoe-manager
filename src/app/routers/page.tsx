"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw,
  Settings,
  Users,
  Loader2,
  Globe,
  Shield,
  Activity,
  Zap,
  Server,
  Network,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RouterForm } from "@/components/router-form"
import Link from "next/link"

interface Router {
  id: string
  friendlyName: string
  address: string
  apiUsername: string
  port: number
  lastCheckedAt: string | null
  status: "ONLINE" | "OFFLINE" | "ERROR"
  createdAt: string
  updatedAt: string
  _count: {
    pppoeUsers: number
  }
}

export default function RoutersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [routers, setRouters] = useState<Router[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [testingRouter, setTestingRouter] = useState<string | null>(null)
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchRouters()
    }
  }, [status, router])

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/routers")
      if (!response.ok) {
        throw new Error("Failed to fetch routers")
      }
      const data = await response.json()
      setRouters(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (routerId: string, routerData: any) => {
    setTestingRouter(routerId)
    try {
      const response = await fetch("/api/routers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...routerData,
          routerId: routerId
        })
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh routers to update status
        await fetchRouters()
      } else {
        setError(result.error || "Connection test failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setTestingRouter(null)
    }
  }

  const deleteRouter = async (routerId: string) => {
    if (!confirm("Are you sure you want to delete this router? This will also delete all associated PPPoE users.")) {
      return
    }

    try {
      const response = await fetch(`/api/routers/${routerId}`, {
        method: "DELETE"
      })
      
      if (response.ok) {
        await fetchRouters()
      } else {
        const error = await response.json()
        setError(error.error || "Failed to delete router")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setSelectedRouter(null)
    fetchRouters()
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ONLINE":
        return {
          badge: "bg-green-500/20 text-green-400 border-green-500/30",
          icon: <Wifi className="h-5 w-5 text-green-400" />,
          label: "Online",
          color: "text-green-400"
        }
      case "OFFLINE":
        return {
          badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          icon: <WifiOff className="h-5 w-5 text-gray-400" />,
          label: "Offline",
          color: "text-gray-400"
        }
      case "ERROR":
        return {
          badge: "bg-red-500/20 text-red-400 border-red-500/30",
          icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
          label: "Error",
          color: "text-red-400"
        }
      default:
        return {
          badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          icon: <AlertTriangle className="h-5 w-5 text-gray-400" />,
          label: "Unknown",
          color: "text-gray-400"
        }
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
                <h1 className="text-4xl font-bold text-white mb-2">Network Routers</h1>
                <p className="text-gray-400">Manage your MikroTik infrastructure</p>
              </div>
              <Skeleton className="h-12 w-32 bg-gray-800" />
            </div>
          </div>

          {/* Router Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 bg-gray-700 rounded-xl" />
                    <div>
                      <Skeleton className="h-6 w-32 bg-gray-700 mb-2" />
                      <Skeleton className="h-4 w-24 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 bg-gray-700 rounded-full" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-20 bg-gray-700" />
                      <Skeleton className="h-5 w-16 bg-gray-700" />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-20 bg-gray-700 rounded-lg" />
                  <Skeleton className="h-10 w-20 bg-gray-700 rounded-lg" />
                  <Skeleton className="h-10 w-20 bg-gray-700 rounded-lg" />
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
            <Button onClick={fetchRouters} className="bg-red-600 hover:bg-red-700 text-white">
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
              <h1 className="text-4xl font-bold text-white mb-2">Network Routers</h1>
              <p className="text-gray-400">Manage your MikroTik infrastructure</p>
            </div>
            <Link href="/routers/new">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl">
                <Plus className="mr-3 h-5 w-5" />
                Add Router
              </Button>
            </Link>
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
                <Server className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{routers.length}</div>
            </div>
            <div className="text-sm text-gray-400">Total Routers</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Wifi className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {routers.filter(r => r.status === 'ONLINE').length}
              </div>
            </div>
            <div className="text-sm text-gray-400">Online</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {routers.reduce((sum, r) => sum + r._count.pppoeUsers, 0)}
              </div>
            </div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Network className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {routers.filter(r => r.status === 'ERROR').length}
              </div>
            </div>
            <div className="text-sm text-gray-400">Errors</div>
          </div>
        </div>

        {/* Router Cards */}
        {routers.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 text-center border border-gray-700">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Settings className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">No Routers Configured</h2>
            <p className="text-xl text-gray-300 mb-8">Add your first MikroTik router to get started</p>
            <Link href="/routers/new">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl">
                <Plus className="mr-3 h-5 w-5" />
                Add Your First Router
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {routers.map((router, index) => {
                const statusConfig = getStatusConfig(router.status)
                
                return (
                  <motion.div
                    key={router.id}
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
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            router.status === 'ONLINE' ? 'bg-green-500/20' :
                            router.status === 'ERROR' ? 'bg-red-500/20' : 'bg-gray-500/20'
                          }`}>
                            {statusConfig.icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{router.friendlyName}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Globe className="w-4 h-4" />
                              <span>{router.address}:{router.port}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-400">API User</span>
                          </div>
                          <div className="text-white font-medium">{router.apiUsername}</div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-gray-400">Users</span>
                          </div>
                          <div className="text-white font-medium">{router._count.pppoeUsers}</div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-gray-400">Last Check</span>
                          </div>
                          <div className="text-white font-medium text-sm">
                            {router.lastCheckedAt 
                              ? new Date(router.lastCheckedAt).toLocaleDateString()
                              : "Never"
                            }
                          </div>
                        </div>

                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-gray-400">Status</span>
                          </div>
                          <div className={`font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(router.id, router)}
                          disabled={testingRouter === router.id}
                          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          {testingRouter === router.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Test Connection
                        </Button>

                        <Dialog open={isEditDialogOpen && selectedRouter?.id === router.id} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRouter(router)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md border-0 shadow-2xl bg-gray-800">
                            <DialogHeader>
                              <DialogTitle className="text-xl text-white">Edit Router</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Update router configuration
                              </DialogDescription>
                            </DialogHeader>
                            {selectedRouter && (
                              <RouterForm
                                router={selectedRouter}
                                onSuccess={handleEditSuccess}
                                onCancel={() => setIsEditDialogOpen(false)}
                              />
                            )}
                          </DialogContent>
                        </Dialog>

                        <Link href={`/routers/${router.id}/import`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRouter(router.id)}
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}