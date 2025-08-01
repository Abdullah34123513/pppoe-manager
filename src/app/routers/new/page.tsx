"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RouterForm } from "@/components/router-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NewRouterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  const handleSuccess = () => {
    router.push("/routers")
  }

  const handleCancel = () => {
    router.push("/routers")
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/routers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Routers
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Router</h1>
          <p className="text-gray-600">Configure a new MikroTik router</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Router Configuration</CardTitle>
          <CardDescription>
            Enter the details for your MikroTik router. Make sure the API service is enabled and accessible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RouterForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  )
}