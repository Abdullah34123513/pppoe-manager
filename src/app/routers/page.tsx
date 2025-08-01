"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Loader2
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ONLINE":
        return <Badge className="bg-green-100 text-green-800">Online</Badge>
      case "OFFLINE":
        return <Badge variant="secondary">Offline</Badge>
      case "ERROR":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ONLINE":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "OFFLINE":
        return <WifiOff className="h-4 w-4 text-gray-500" />
      case "ERROR":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Routers</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
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
          <h1 className="text-3xl font-bold">Routers</h1>
          <p className="text-gray-600">Manage your MikroTik routers</p>
        </div>
        <Link href="/routers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Router
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {routers.length === 0 ? (
        <Card className="text-center">
          <CardContent className="pt-6">
            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No routers configured</h3>
            <p className="text-gray-600 mb-4">Add your first MikroTik router to get started</p>
            <Link href="/routers/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Router
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {routers.map((router) => (
            <Card key={router.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(router.status)}
                    <div>
                      <CardTitle className="text-xl">{router.friendlyName}</CardTitle>
                      <CardDescription>{router.address}:{router.port}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(router.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(router.id, router)}
                      disabled={testingRouter === router.id}
                    >
                      {testingRouter === router.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Test
                    </Button>
                    <Dialog open={isEditDialogOpen && selectedRouter?.id === router.id} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRouter(router)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Router</DialogTitle>
                          <DialogDescription>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRouter(router.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">API Username</p>
                    <p className="text-sm">{router.apiUsername}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Users</p>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{router._count.pppoeUsers}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Checked</p>
                    <p className="text-sm">
                      {router.lastCheckedAt 
                        ? new Date(router.lastCheckedAt).toLocaleString()
                        : "Never"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Actions</p>
                    <div className="flex gap-2">
                      <Link href={`/routers/${router.id}/import`}>
                        <Button variant="outline" size="sm">
                          Import Users
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/routers/${router.id}/resync`, {
                              method: "POST"
                            })
                            if (response.ok) {
                              await fetchRouters()
                            } else {
                              const error = await response.json()
                              setError(error.error || "Failed to resync router")
                            }
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Unknown error")
                          }
                        }}
                      >
                        Resync
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}