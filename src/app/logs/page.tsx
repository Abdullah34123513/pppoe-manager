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
  Search, 
  Filter, 
  RefreshCw, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  Router,
  User,
  Clock,
  Loader2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface LogEntry {
  id: string
  action: string
  details: string
  timestamp: string
  router?: {
    id: string
    friendlyName: string
  }
  pppoeUser?: {
    id: string
    username: string
  }
}

interface LogsResponse {
  logs: LogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const actionColors: Record<string, string> = {
  'ROUTER_CREATED': 'bg-green-100 text-green-800',
  'ROUTER_UPDATED': 'bg-blue-100 text-blue-800',
  'ROUTER_DELETED': 'bg-red-100 text-red-800',
  'ROUTER_CONNECTION_TEST': 'bg-purple-100 text-purple-800',
  'ROUTER_RESYNC': 'bg-indigo-100 text-indigo-800',
  'PPPOE_USER_CREATED': 'bg-green-100 text-green-800',
  'PPPOE_USER_UPDATED': 'bg-blue-100 text-blue-800',
  'PPPOE_USER_DELETED': 'bg-red-100 text-red-800',
  'PPPOE_USER_RECHARGED': 'bg-yellow-100 text-yellow-800',
  'PPPOE_USER_DISABLED': 'bg-orange-100 text-orange-800',
  'PPPOE_USER_ENABLED': 'bg-teal-100 text-teal-800',
  'PPPOE_USER_AUTO_DISABLED': 'bg-red-100 text-red-800',
  'PPPOE_USER_AUTO_DISABLE_FAILED': 'bg-red-200 text-red-900',
  'PPPOE_USER_AUTO_DISABLE_ERROR': 'bg-red-300 text-red-900',
  'PPPOE_USER_EXPIRY_UPDATED': 'bg-purple-100 text-purple-800',
  'EXPIRATION_SCHEDULER_ERROR': 'bg-red-100 text-red-800',
}

const actionIcons: Record<string, React.ReactNode> = {
  'ROUTER_CREATED': <Settings className="h-4 w-4" />,
  'ROUTER_UPDATED': <Settings className="h-4 w-4" />,
  'ROUTER_DELETED': <Settings className="h-4 w-4" />,
  'ROUTER_CONNECTION_TEST': <Activity className="h-4 w-4" />,
  'ROUTER_RESYNC': <Activity className="h-4 w-4" />,
  'PPPOE_USER_CREATED': <User className="h-4 w-4" />,
  'PPPOE_USER_UPDATED': <User className="h-4 w-4" />,
  'PPPOE_USER_DELETED': <User className="h-4 w-4" />,
  'PPPOE_USER_RECHARGED': <Clock className="h-4 w-4" />,
  'PPPOE_USER_DISABLED': <AlertTriangle className="h-4 w-4" />,
  'PPPOE_USER_ENABLED': <CheckCircle className="h-4 w-4" />,
  'PPPOE_USER_AUTO_DISABLED': <AlertTriangle className="h-4 w-4" />,
  'PPPOE_USER_AUTO_DISABLE_FAILED': <AlertTriangle className="h-4 w-4" />,
  'PPPOE_USER_AUTO_DISABLE_ERROR': <AlertTriangle className="h-4 w-4" />,
  'PPPOE_USER_EXPIRY_UPDATED': <Clock className="h-4 w-4" />,
  'EXPIRATION_SCHEDULER_ERROR': <AlertTriangle className="h-4 w-4" />,
}

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [routerFilter, setRouterFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchLogs()
    }
  }, [status, router, currentPage, actionFilter, routerFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      })

      if (searchTerm) {
        params.append("search", searchTerm)
      }

      if (actionFilter !== "all") {
        params.append("action", actionFilter)
      }

      if (routerFilter !== "all") {
        params.append("routerId", routerFilter)
      }

      const response = await fetch(`/api/logs?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch logs")
      }
      const data: LogsResponse = await response.json()
      setLogs(data.logs)
      setTotalPages(data.pagination.pages)
      setTotalLogs(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLogs()
    setRefreshing(false)
  }

  const getActionBadge = (action: string) => {
    const colorClass = actionColors[action] || "bg-gray-100 text-gray-800"
    return (
      <Badge className={`text-xs ${colorClass}`}>
        {action.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const getActionIcon = (action: string) => {
    return actionIcons[action] || <Activity className="h-4 w-4" />
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">System Logs</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-48" />
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
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-gray-600">View system events and activities</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
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
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="ROUTER_CREATED">Router Created</SelectItem>
                <SelectItem value="ROUTER_UPDATED">Router Updated</SelectItem>
                <SelectItem value="ROUTER_DELETED">Router Deleted</SelectItem>
                <SelectItem value="ROUTER_CONNECTION_TEST">Connection Test</SelectItem>
                <SelectItem value="ROUTER_RESYNC">Router Resync</SelectItem>
                <SelectItem value="PPPOE_USER_CREATED">User Created</SelectItem>
                <SelectItem value="PPPOE_USER_UPDATED">User Updated</SelectItem>
                <SelectItem value="PPPOE_USER_DELETED">User Deleted</SelectItem>
                <SelectItem value="PPPOE_USER_RECHARGED">User Recharged</SelectItem>
                <SelectItem value="PPPOE_USER_DISABLED">User Disabled</SelectItem>
                <SelectItem value="PPPOE_USER_ENABLED">User Enabled</SelectItem>
                <SelectItem value="PPPOE_USER_AUTO_DISABLED">Auto Disabled</SelectItem>
                <SelectItem value="PPPOE_USER_EXPIRY_UPDATED">Expiry Updated</SelectItem>
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
            <Button onClick={fetchLogs} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Logs ({totalLogs})
          </CardTitle>
          <CardDescription>
            Recent system events and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No logs found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || actionFilter !== "all" || routerFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No system activities recorded yet"
                }
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Time</TableHead>
                    <TableHead className="w-48">Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Router</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          {getActionBadge(log.action)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.details}</TableCell>
                      <TableCell>
                        {log.router ? (
                          <div className="flex items-center gap-1">
                            <Router className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{log.router.friendlyName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.pppoeUser ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{log.pppoeUser.username}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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