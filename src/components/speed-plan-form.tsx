"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle, Zap } from "lucide-react"

const speedPlanSchema = z.object({
  routerId: z.string().min(1, "Router is required"),
  name: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
  downloadSpeed: z.number().min(1, "Download speed must be at least 1 Kbps").max(1000000, "Download speed must be less than 1,000,000 Kbps"),
  uploadSpeed: z.number().min(1, "Upload speed must be at least 1 Kbps").max(1000000, "Upload speed must be less than 1,000,000 Kbps"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  isActive: z.boolean().default(true),
})

type SpeedPlanFormData = z.infer<typeof speedPlanSchema>

interface Router {
  id: string
  friendlyName: string
  address: string
  status: string
}

interface SpeedPlanFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function SpeedPlanForm({ onSuccess, onCancel }: SpeedPlanFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [routers, setRouters] = useState<Router[]>([])
  const [createResult, setCreateResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SpeedPlanFormData>({
    resolver: zodResolver(speedPlanSchema),
    defaultValues: {
      isActive: true,
      downloadSpeed: 1024,
      uploadSpeed: 512,
    },
  })

  const selectedRouterId = watch("routerId")
  const isActive = watch("isActive")

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

  const onSubmit = async (data: SpeedPlanFormData) => {
    setLoading(true)
    setError("")
    setCreateResult(null)

    try {
      const response = await fetch("/api/speed-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setCreateResult({
          success: true,
          message: "Speed plan created successfully!"
        })
        setTimeout(() => {
          onSuccess()
          reset()
        }, 1500)
      } else {
        const result = await response.json()
        setError(result.error || "Failed to create speed plan")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const formatSpeed = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`
    }
    return `${kbps} Kbps`
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
        <Label htmlFor="name">Plan Name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Basic Plan"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="downloadSpeed">Download Speed</Label>
          <Input
            id="downloadSpeed"
            type="number"
            {...register("downloadSpeed", { valueAsNumber: true })}
            placeholder="1024"
            min="1"
            max="1000000"
          />
          <p className="text-xs text-gray-600">
            {watch("downloadSpeed") && formatSpeed(watch("downloadSpeed"))}
          </p>
          {errors.downloadSpeed && (
            <p className="text-sm text-red-500">{errors.downloadSpeed.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="uploadSpeed">Upload Speed</Label>
          <Input
            id="uploadSpeed"
            type="number"
            {...register("uploadSpeed", { valueAsNumber: true })}
            placeholder="512"
            min="1"
            max="1000000"
          />
          <p className="text-xs text-gray-600">
            {watch("uploadSpeed") && formatSpeed(watch("uploadSpeed"))}
          </p>
          {errors.uploadSpeed && (
            <p className="text-sm text-red-500">{errors.uploadSpeed.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Basic internet plan for home users"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      {createResult && (
        <Alert className={createResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {createResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={createResult.success ? "text-green-700" : "text-red-700"}>
            {createResult.message}
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
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Create Speed Plan
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}