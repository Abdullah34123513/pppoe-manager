"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"

const routerSchema = z.object({
  friendlyName: z.string().min(1, "Friendly name is required"),
  address: z.string().min(1, "Address is required"),
  apiUsername: z.string().min(1, "API username is required"),
  apiPassword: z.string().min(1, "API password is required"),
  port: z.number().min(1).max(65535).optional().default(8728),
})

type RouterFormData = z.infer<typeof routerSchema>

interface Router {
  id: string
  friendlyName: string
  address: string
  apiUsername: string
  apiPassword: string
  port: number
}

interface RouterFormProps {
  router?: Router
  onSuccess: () => void
  onCancel: () => void
}

export function RouterForm({ router, onSuccess, onCancel }: RouterFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<RouterFormData>({
    resolver: zodResolver(routerSchema),
    defaultValues: router ? {
      friendlyName: router.friendlyName,
      address: router.address,
      apiUsername: router.apiUsername,
      apiPassword: router.apiPassword,
      port: router.port,
    } : {
      port: 8728,
    },
  })

  const testConnection = async (data: RouterFormData) => {
    setTestResult(null)
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/routers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      console.log('Test connection response status:', response.status)
      console.log('Test connection response headers:', response.headers)

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Test connection error response:', errorText)
        
        // Check if the response is HTML (redirect to login page)
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          throw new Error('Authentication failed. Please log in again.')
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Parse JSON with error handling
      let result
      try {
        result = await response.json()
        console.log('Test connection result:', result)
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError)
        throw new Error('Invalid response from server')
      }
      
      if (result.success) {
        setTestResult({
          success: true,
          message: "Connection successful!",
        })
      } else {
        setTestResult({
          success: false,
          message: result.error || "Connection failed",
        })
      }
    } catch (err) {
      console.error('Test connection error:', err)
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: RouterFormData) => {
    setLoading(true)
    setError("")

    try {
      const url = router ? `/api/routers/${router.id}` : "/api/routers"
      const method = router ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onSuccess()
        reset()
      } else {
        const result = await response.json()
        setError(result.error || "Failed to save router")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="friendlyName">Friendly Name</Label>
        <Input
          id="friendlyName"
          {...register("friendlyName")}
          placeholder="My MikroTik Router"
        />
        {errors.friendlyName && (
          <p className="text-sm text-red-500">{errors.friendlyName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">IP Address or Hostname</Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="192.168.1.1"
        />
        {errors.address && (
          <p className="text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            {...register("port", { valueAsNumber: true })}
            placeholder="8728"
          />
          {errors.port && (
            <p className="text-sm text-red-500">{errors.port.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiUsername">API Username</Label>
          <Input
            id="apiUsername"
            {...register("apiUsername")}
            placeholder="admin"
          />
          {errors.apiUsername && (
            <p className="text-sm text-red-500">{errors.apiUsername.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiPassword">API Password</Label>
        <Input
          id="apiPassword"
          type="password"
          {...register("apiPassword")}
          placeholder="••••••••"
        />
        {errors.apiPassword && (
          <p className="text-sm text-red-500">{errors.apiPassword.message}</p>
        )}
      </div>

      {testResult && (
        <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => testConnection(getValues())}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Test Connection
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {router ? "Update Router" : "Add Router"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}