"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Wifi, 
  WifiOff,
  TrendingUp,
  TrendingDown,
  Router as RouterIcon,
  Info,
  Edit
} from "lucide-react"

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
  const downloadSpeed = watch("downloadSpeed")
  const uploadSpeed = watch("uploadSpeed")

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

  const getSpeedTier = (speed: number) => {
    if (speed >= 10000) return { label: "Ultra Fast", color: "text-green-600", bg: "bg-green-50" }
    if (speed >= 5000) return { label: "Very Fast", color: "text-blue-600", bg: "bg-blue-50" }
    if (speed >= 1000) return { label: "Fast", color: "text-yellow-600", bg: "bg-yellow-50" }
    return { label: "Basic", color: "text-orange-600", bg: "bg-orange-50" }
  }

  const downloadTier = getSpeedTier(downloadSpeed || 0)
  const uploadTier = getSpeedTier(uploadSpeed || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Editing Speed Plan</h3>
            <p className="text-blue-100 text-sm">{speedPlan.name}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {updateResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                {updateResult.message}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Router Info */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <RouterIcon className="w-5 h-5 text-gray-600" />
            <div>
              <div className="font-medium text-gray-900">Router</div>
              <div className="text-sm text-gray-600">{speedPlan.router.friendlyName}</div>
              <div className="text-xs text-gray-500">{speedPlan.router.address}</div>
            </div>
          </div>
        </div>

        {/* Plan Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Plan Name
          </Label>
          <Input
            {...register("name")}
            placeholder="e.g., Basic Plan, Premium Plan, Ultra Fast"
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Speed Configuration */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">Speed Configuration</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  Download Speed
                </Label>
                <div className={`text-xs px-2 py-1 rounded-full ${downloadTier.bg} ${downloadTier.color}`}>
                  {downloadTier.label}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  {...register("downloadSpeed", { valueAsNumber: true })}
                  placeholder="1024"
                  min="1"
                  max="1000000"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500 pr-16"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  Kbps
                </div>
              </div>
              {downloadSpeed && (
                <div className="text-sm font-medium text-green-600">
                  {formatSpeed(downloadSpeed)}
                </div>
              )}
              {errors.downloadSpeed && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.downloadSpeed.message}
                </p>
              )}
            </div>

            {/* Upload Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Upload Speed
                </Label>
                <div className={`text-xs px-2 py-1 rounded-full ${uploadTier.bg} ${uploadTier.color}`}>
                  {uploadTier.label}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  {...register("uploadSpeed", { valueAsNumber: true })}
                  placeholder="512"
                  min="1"
                  max="1000000"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-16"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  Kbps
                </div>
              </div>
              {uploadSpeed && (
                <div className="text-sm font-medium text-blue-600">
                  {formatSpeed(uploadSpeed)}
                </div>
              )}
              {errors.uploadSpeed && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.uploadSpeed.message}
                </p>
              )}
            </div>
          </div>

          {/* Speed Preview */}
          {downloadSpeed && uploadSpeed && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Speed Preview</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {downloadSpeed >= uploadSpeed ? "Download Optimized" : "Upload Optimized"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-green-600 font-semibold">{formatSpeed(downloadSpeed)}</div>
                  <div className="text-gray-600">Download</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-600 font-semibold">{formatSpeed(uploadSpeed)}</div>
                  <div className="text-gray-600">Upload</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Description (Optional)
          </Label>
          <Textarea
            {...register("description")}
            placeholder="Brief description of this speed plan..."
            rows={3}
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-500">
            {watch("description")?.length || 0}/200 characters
          </p>
          {errors.description && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-gray-200'}`}>
              {isActive ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">Active Status</div>
              <div className="text-sm text-gray-600">
                {isActive ? "Plan is available for new users" : "Plan is hidden from users"}
              </div>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => setValue("isActive", checked)}
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Update Speed Plan
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}