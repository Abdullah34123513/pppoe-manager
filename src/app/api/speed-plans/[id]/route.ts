import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const speedPlanUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  downloadSpeed: z.number().min(1, "Download speed must be at least 1 Kbps").optional(),
  uploadSpeed: z.number().min(1, "Upload speed must be at least 1 Kbps").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const speedPlan = await db.speedPlan.findUnique({
      where: { id: params.id },
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true,
            address: true,
          },
        },
        _count: {
          select: {
            pppoeUsers: true,
          },
        },
      },
    })

    if (!speedPlan) {
      return NextResponse.json({ error: "Speed plan not found" }, { status: 404 })
    }

    return NextResponse.json(speedPlan)
  } catch (error) {
    console.error("Error fetching speed plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch speed plan" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = speedPlanUpdateSchema.parse(body)

    // Check if speed plan exists
    const existingPlan = await db.speedPlan.findUnique({
      where: { id: params.id },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: "Speed plan not found" }, { status: 404 })
    }

    // If updating name, check for uniqueness
    if (validatedData.name && validatedData.name !== existingPlan.name) {
      const nameExists = await db.speedPlan.findFirst({
        where: {
          routerId: existingPlan.routerId,
          name: validatedData.name,
          id: { not: params.id },
        },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: "Speed plan with this name already exists for this router" },
          { status: 400 }
        )
      }
    }

    const speedPlan = await db.speedPlan.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true,
            address: true,
          },
        },
      },
    })

    // Log the speed plan update
    await db.logEntry.create({
      data: {
        action: "SPEED_PLAN_UPDATED",
        routerId: existingPlan.routerId,
        details: `Updated speed plan: ${speedPlan.name} (${speedPlan.downloadSpeed}/${speedPlan.uploadSpeed} Kbps)`,
      },
    })

    return NextResponse.json(speedPlan)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating speed plan:", error)
    return NextResponse.json(
      { error: "Failed to update speed plan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if speed plan exists and get user count
    const speedPlan = await db.speedPlan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            pppoeUsers: true,
          },
        },
      },
    })

    if (!speedPlan) {
      return NextResponse.json({ error: "Speed plan not found" }, { status: 404 })
    }

    // Don't allow deletion if speed plan is in use
    if (speedPlan._count.pppoeUsers > 0) {
      return NextResponse.json(
        { error: "Cannot delete speed plan that is in use by users" },
        { status: 400 }
      )
    }

    await db.speedPlan.delete({
      where: { id: params.id },
    })

    // Log the speed plan deletion
    await db.logEntry.create({
      data: {
        action: "SPEED_PLAN_DELETED",
        routerId: speedPlan.routerId,
        details: `Deleted speed plan: ${speedPlan.name}`,
      },
    })

    return NextResponse.json({ message: "Speed plan deleted successfully" })
  } catch (error) {
    console.error("Error deleting speed plan:", error)
    return NextResponse.json(
      { error: "Failed to delete speed plan" },
      { status: 500 }
    )
  }
}