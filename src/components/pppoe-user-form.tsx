"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"

const userSchema = z.object({
  routerId: z.string().min(1, "Router is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  days: z.number().min(1, "Days must be at least 1").default(30),
})

type UserFormData = z.infer<typeof userSchema>

interface Router {
  id: string
  friendlyName: string
  address: string
  status: string
}

interface PPPoEUserFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function PPPoEUserForm({ onSuccess, onCancel }: PPPoEUserFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [routers, setRouters] = useState<Router[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      days: 30,
    },
  })

  const selectedRouterId = watch("routerId")

  useEffect(() => {
    fetchRouters()
  }, [])

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

  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/pppoe-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routerId: data.routerId,
          username: data.username,
          password: data.password,
        }),
      })

      if (response.ok) {
        onSuccess()
        reset()
      } else {
        const result = await response.json()
        setError(result.error || "Failed to create user")
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
        <Label htmlFor="routerId">Router</Label>
        <Select 
          value={selectedRouterId} 
          onValueChange={(value) => setValue("routerId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a router" />
          </SelectTrigger>
          <SelectContent>
            {routers.map((router) => (
              <SelectItem key={router.id} value={router.id}>
                {router.friendlyName} ({router.address})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.routerId && (
          <p className="text-sm text-red-500">{errors.routerId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          {...register("username")}
          placeholder="username"
        />
        {errors.username && (
          <p className="text-sm text-red-500">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          placeholder="password"
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="days">Initial Validity Period</Label>
        <Input
          id="days"
          type="number"
          {...register("days", { valueAsNumber: true })}
          placeholder="30"
          min="1"
        />
        <p className="text-sm text-gray-600">User will be valid for this many days from creation</p>
        {errors.days && (
          <p className="text-sm text-red-500">{errors.days.message}</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Create User
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}