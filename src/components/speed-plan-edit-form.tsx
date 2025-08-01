"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertTriangle, Zap } from "lucide-react"

const speedPlanUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters").optional(),
  downloadSpeed: z.number().min(1, "Download speed must be at least 1 Kbps").max(1000000, "Download speed must be less than 1,000,000 Kbps").optional(),
  uploadSpeed: z.number().min(1, "Upload speed must be at least 1 Kbps").max(1000000, "Upload speed must be less than 1,000,000 Kbps").optional(),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  isActive: z.boolean().optional(),
})

type SpeedPlanUpdateData = z.infer<typeof speedPlanUpdateSchema>

interface SpeedPlan {
  id: string
  name: string
  downloadSpeed: number
  uploadSpeed: number
  description?: string
  isActive: boolean
  router: {
    id: string
    friendlyName: string
    address: string
  }
}

interface SpeedPlanEditFormProps {
  speedPlan: SpeedPlan
  onSuccess: () => void
  onCancel: () => void
}

export function SpeedPlanEditForm({ speedPlan, onSuccess, onCancel }: SpeedPlanEditFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [updateResult, setUpdateResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SpeedPlanUpdateData>({
    resolver: zodResolver(speedPlanUpdateSchema),
    defaultValues: {
      name: speedPlan.name,
      downloadSpeed: speedPlan.downloadSpeed,
      uploadSpeed: speedPlan.uploadSpeed,
      description: speedPlan.description || "",
      isActive: speedPlan.isActive,
    },
  })

  const isActive = watch("isActive")

  const onSubmit = async (data: SpeedPlanUpdateData) => {
    setLoading(true)
    setError("")
    setUpdateResult(null)

    try {
      const response = await fetch(`/api/speed-plans/${speedPlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setUpdateResult({
          success: true,
          message: "Speed plan updated successfully!"
        })
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        const result = await response.json()
        setError(result.error || "Failed to update speed plan")
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

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Router:</strong> {speedPlan.router.friendlyName} ({speedPlan.router.address})
        </p>
      </div>

      {updateResult && (
        <Alert className={updateResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {updateResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={updateResult.success ? "text-green-700" : "text-red-700"}>
            {updateResult.message}
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
          Update Speed Plan
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}