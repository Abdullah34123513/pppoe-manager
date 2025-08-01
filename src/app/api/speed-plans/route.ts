import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const speedPlanSchema = z.object({
  routerId: z.string().min(1, "Router is required"),
  name: z.string().min(1, "Name is required"),
  downloadSpeed: z.number().min(1, "Download speed must be at least 1 Kbps"),
  uploadSpeed: z.number().min(1, "Upload speed must be at least 1 Kbps"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const routerId = searchParams.get("routerId")

    const where = routerId ? { routerId } : {}

    const speedPlans = await db.speedPlan.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(speedPlans)
  } catch (error) {
    console.error("Error fetching speed plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch speed plans" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = speedPlanSchema.parse(body)

    // Check if speed plan with same name already exists for this router
    const existingPlan = await db.speedPlan.findFirst({
      where: {
        routerId: validatedData.routerId,
        name: validatedData.name,
      },
    })

    if (existingPlan) {
      return NextResponse.json(
        { error: "Speed plan with this name already exists for this router" },
        { status: 400 }
      )
    }

    // Verify router exists
    const router = await db.router.findUnique({
      where: { id: validatedData.routerId },
    })

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const speedPlan = await db.speedPlan.create({
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

    // Log the speed plan creation
    await db.logEntry.create({
      data: {
        action: "SPEED_PLAN_CREATED",
        routerId: validatedData.routerId,
        details: `Created speed plan: ${validatedData.name} (${validatedData.downloadSpeed}/${validatedData.uploadSpeed} Kbps)`,
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

    console.error("Error creating speed plan:", error)
    return NextResponse.json(
      { error: "Failed to create speed plan" },
      { status: 500 }
    )
  }
}