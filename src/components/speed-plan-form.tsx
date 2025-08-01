"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Info
} from "lucide-react"

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
  const downloadSpeed = watch("downloadSpeed")
  const uploadSpeed = watch("uploadSpeed")

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
      <AnimatePresence>
        {createResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
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
        {/* Router Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <RouterIcon className="w-4 h-4" />
            Router
          </Label>
          <Select 
            value={selectedRouterId} 
            onValueChange={(value) => setValue("routerId", value)}
          >
            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Select a router" />
            </SelectTrigger>
            <SelectContent>
              {routers.map((router) => (
                <SelectItem key={router.id} value={router.id}>
                  <div className="flex items-center gap-2">
                    <RouterIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{router.friendlyName}</div>
                      <div className="text-xs text-gray-500">{router.address}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.routerId && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {errors.routerId.message}
            </p>
          )}
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
                Creating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Create Speed Plan
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