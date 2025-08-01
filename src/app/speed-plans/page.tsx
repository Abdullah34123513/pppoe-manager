"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  XCircle
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

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Speed Plans</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
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
          <AlertDescription>Error loading speed plans: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Speed Plans</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Speed Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Speed Plan</DialogTitle>
              <DialogDescription>
                Define a new speed plan with download and upload limits
              </DialogDescription>
            </DialogHeader>
            <SpeedPlanForm onSuccess={handleCreateSuccess} onCancel={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Router</label>
              <Select value={selectedRouter} onValueChange={setSelectedRouter}>
                <SelectTrigger>
                  <SelectValue placeholder="All routers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routers</SelectItem>
                  {routers.map((router) => (
                    <SelectItem key={router.id} value={router.id}>
                      {router.friendlyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={showActiveOnly ? "active" : "all"} onValueChange={(value) => setShowActiveOnly(value === "active")}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speed Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Speed Plans ({filteredSpeedPlans.length})
          </CardTitle>
          <CardDescription>
            Manage download and upload speed limits for your PPPoE users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSpeedPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No speed plans found</p>
              <p className="text-sm">Create your first speed plan to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Router</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpeedPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        {plan.description && (
                          <div className="text-sm text-gray-500">{plan.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.router.friendlyName}</div>
                        <div className="text-sm text-gray-500">{plan.router.address}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{plan.downloadSpeed} Kbps ↓</div>
                        <div className="text-gray-500">{plan.uploadSpeed} Kbps ↑</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{plan._count.pppoeUsers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={editingPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingPlan(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPlan(plan)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Speed Plan</DialogTitle>
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
                          className={plan._count.pppoeUsers > 0 ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}