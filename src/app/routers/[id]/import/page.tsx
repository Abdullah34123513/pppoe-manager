"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowLeft,
  Calendar,
  Users
} from "lucide-react"
import Link from "next/link"

interface ImportedUser {
  id: string
  name: string
  password: string
  service: string
  profile: string
  callerId: string
  disabled: boolean
  comment: string
  expiryDate?: string
  skip?: boolean
}

interface Router {
  id: string
  friendlyName: string
  address: string
  status: string
}

export default function ImportUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const routerId = searchParams.get('id')
  
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")
  const [routerInfo, setRouterInfo] = useState<Router | null>(null)
  const [users, setUsers] = useState<ImportedUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(30)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && routerId) {
      fetchRouterInfo()
    }
  }, [status, router, routerId])

  const fetchRouterInfo = async () => {
    try {
      const response = await fetch(`/api/routers/${routerId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch router info")
      }
      const data = await response.json()
      setRouterInfo(data)
      
      // After getting router info, automatically fetch users
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    if (!routerId) return

    try {
      const response = await fetch(`/api/routers/${routerId}/resync`, {
        method: "POST"
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch users from router")
      }

      const result = await response.json()
      
      // Now get all users for this router
      const usersResponse = await fetch(`/api/pppoe-users?routerId=${routerId}`)
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const importedUsers = usersData.users.filter((u: any) => u.source === 'IMPORTED')
        
        const formattedUsers = importedUsers.map((user: any) => ({
          id: user.id,
          name: user.username,
          password: user.password || '',
          service: 'pppoe',
          profile: 'default',
          callerId: '',
          disabled: user.status === 'DISABLED',
          comment: '',
          expiryDate: user.expiryAt ? new Date(user.expiryAt).toISOString().split('T')[0] : undefined
        }))
        
        setUsers(formattedUsers)
        // Select all users by default
        setSelectedUsers(new Set(formattedUsers.map(u => u.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(u => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleExpiryDateChange = (userId: string, date: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, expiryDate: date, skip: false }
        : user
    ))
  }

  const handleSkipUser = (userId: string, skip: boolean) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, skip, expiryDate: skip ? undefined : user.expiryDate }
        : user
    ))
  }

  const applyDefaultExpiry = () => {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + defaultExpiryDays)
    const expiryDateString = expiryDate.toISOString().split('T')[0]
    
    setUsers(users.map(user => ({
      ...user,
      expiryDate: user.skip ? undefined : expiryDateString
    })))
  }

  const saveImportedUsers = async () => {
    setImporting(true)
    setError("")

    try {
      const updates = users
        .filter(user => selectedUsers.has(user.id) && !user.skip && user.expiryDate)
        .map(user => ({
          id: user.id,
          expiryAt: user.expiryDate
        }))

      for (const update of updates) {
        const response = await fetch(`/api/pppoe-users/${update.id}/expiry`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiryAt: update.expiryAt }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update user ${update.id}`)
        }
      }

      router.push("/routers")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setImporting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
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

  if (!routerInfo) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Router not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/routers`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Routers
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Import PPPoE Users</h1>
          <p className="text-gray-600">
            Router: {routerInfo.friendlyName} ({routerInfo.address})
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-gray-600 mb-4">
                No PPPoE users found on this router or all users have already been imported.
              </p>
              <Button onClick={async () => {
                setLoading(true)
                await fetchUsers()
                setLoading(false)
              }}>
                <Download className="mr-2 h-4 w-4" />
                Fetch Users from Router
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Import Summary
              </CardTitle>
              <CardDescription>
                {users.length} users found on router. Set expiry dates for the users you want to manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="defaultExpiry">Default expiry period:</Label>
                  <Input
                    id="defaultExpiry"
                    type="number"
                    value={defaultExpiryDays}
                    onChange={(e) => setDefaultExpiryDays(parseInt(e.target.value) || 30)}
                    className="w-20"
                    min="1"
                  />
                  <span>days</span>
                </div>
                <Button onClick={applyDefaultExpiry} variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Apply to All
                </Button>
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedUsers.size === users.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Skip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => 
                              handleUserSelection(user.id, checked as boolean)
                            }
                            disabled={user.skip}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant={user.disabled ? "destructive" : "default"}>
                            {user.disabled ? "Disabled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={user.expiryDate || ""}
                            onChange={(e) => handleExpiryDateChange(user.id, e.target.value)}
                            disabled={user.skip}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={user.skip || false}
                            onCheckedChange={(checked) => 
                              handleSkipUser(user.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedUsers.size} users selected for import
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/routers")}>
                Cancel
              </Button>
              <Button 
                onClick={saveImportedUsers}
                disabled={importing || selectedUsers.size === 0}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Save Import
              </Button>
            </div>
          </div>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}