"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Plus, 
  Search, 
  Filter, 
  Zap, 
  Edit, 
  Trash2, 
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Activity,
  Router as RouterIcon,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { SpeedPlanForm } from "@/components/speed-plan-form"
import { SpeedPlanEditForm } from "@/components/speed-plan-edit-form"

interface Router {
  id: string
  friendlyName: string
  address: string
  status: string
}

interface SpeedPlan {
  id: string
  name: string
  downloadSpeed: number
  uploadSpeed: number
  description?: string
  isActive: boolean
  createdAt: string
  router: {
    id: string
    friendlyName: string
    address: string
  }
  _count: {
    pppoeUsers: number
  }
}

export default function SpeedPlansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [speedPlans, setSpeedPlans] = useState<SpeedPlan[]>([])
  const [routers, setRouters] = useState<Router[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRouter, setSelectedRouter] = useState<string>("all")
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SpeedPlan | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchSpeedPlans()
      fetchRouters()
    }
  }, [status, router])

  const fetchSpeedPlans = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedRouter !== "all") {
        params.append("routerId", selectedRouter)
      }

      const response = await fetch(`/api/speed-plans?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch speed plans")
      }
      const data = await response.json()
      setSpeedPlans(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

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

  const filteredSpeedPlans = speedPlans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.router.friendlyName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRouter = selectedRouter === "all" || plan.router.id === selectedRouter
    const matchesActive = !showActiveOnly || plan.isActive

    return matchesSearch && matchesRouter && matchesActive
  })

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false)
    fetchSpeedPlans()
  }

  const handleEditSuccess = () => {
    setEditingPlan(null)
    fetchSpeedPlans()
  }

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this speed plan?")) {
      return
    }

    try {
      const response = await fetch(`/api/speed-plans/${planId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSpeedPlans()
      } else {
        const result = await response.json()
        alert(result.error || "Failed to delete speed plan")
      }
    } catch (err) {
      alert("Failed to delete speed plan")
    }
  }

  const formatSpeed = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`
    }
    return `${kbps} Kbps`
  }

  const getSpeedColor = (speed: number) => {
    if (speed >= 10000) return "text-green-600"
    if (speed >= 5000) return "text-blue-600"
    if (speed >= 1000) return "text-yellow-600"
    return "text-orange-600"
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Speed Plans</h1>
              <p className="text-gray-600 mt-2">Manage internet speed plans for your users</p>
            </div>
            <div className="animate-pulse">
              <div className="h-12 w-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 w-32 bg-gray-200 rounded"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="h-8 w-full bg-gray-200 rounded"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Speed Plans</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Speed Plans</h1>
              <p className="text-gray-600 mt-1">Create and manage internet speed plans for your PPPoE users</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Speed Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Speed Plan</DialogTitle>
                  <DialogDescription>
                    Define download and upload speed limits for your users
                  </DialogDescription>
                </DialogHeader>
                <SpeedPlanForm onSuccess={handleCreateSuccess} onCancel={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900">{speedPlans.length}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">
                  {speedPlans.filter(p => p.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {speedPlans.reduce((sum, plan) => sum + plan._count.pppoeUsers, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold text-blue-600">{filteredSpeedPlans.length}</p>
              </div>
              <Filter className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search speed plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedRouter}
                onChange={(e) => setSelectedRouter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Routers</option>
                {routers.map((router) => (
                  <option key={router.id} value={router.id}>
                    {router.friendlyName}
                  </option>
                ))}
              </select>

              <select
                value={showActiveOnly ? "active" : "all"}
                onChange={(e) => setShowActiveOnly(e.target.value === "active")}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Speed Plans Grid */}
        {filteredSpeedPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Speed Plans Found</h3>
            <p className="text-gray-600 mb-6">Create your first speed plan to get started</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Speed Plan
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredSpeedPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <div className="flex items-center gap-2">
                          {plan.isActive ? (
                            <Badge className="bg-green-500 text-white">
                              <Wifi className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-500 text-white">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-blue-100 text-sm flex items-center gap-1">
                        <RouterIcon className="w-4 h-4" />
                        {plan.router.friendlyName}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Speed Indicators */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-center mb-1">
                            <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600 font-medium">DOWNLOAD</span>
                          </div>
                          <p className={`text-lg font-bold ${getSpeedColor(plan.downloadSpeed)}`}>
                            {formatSpeed(plan.downloadSpeed)}
                          </p>
                        </div>
                        
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-center mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
                            <span className="text-xs text-blue-600 font-medium">UPLOAD</span>
                          </div>
                          <p className={`text-lg font-bold ${getSpeedColor(plan.uploadSpeed)}`}>
                            {formatSpeed(plan.uploadSpeed)}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {plan.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {plan.description}
                        </p>
                      )}

                      {/* User Count */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{plan._count.pppoeUsers} users</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(plan.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <Dialog open={editingPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingPlan(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPlan(plan)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md border-0 shadow-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-xl">Edit Speed Plan</DialogTitle>
                              <DialogDescription>
                                Update speed plan settings
                              </DialogDescription>
                            </DialogHeader>
                            {editingPlan && (
                              <SpeedPlanEditForm
                                speedPlan={editingPlan}
                                onSuccess={handleEditSuccess}
                                onCancel={() => setEditingPlan(null)}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          disabled={plan._count.pppoeUsers > 0}
                          className={plan._count.pppoeUsers > 0 ? "opacity-50 cursor-not-allowed" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}