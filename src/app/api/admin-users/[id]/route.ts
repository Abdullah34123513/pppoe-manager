import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Check if admin exists
    const admin = await db.admin.findUnique({
      where: { id },
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    // Prevent deletion of the last admin user
    const adminCount = await db.admin.count()
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin user" }, { status: 400 })
    }

    // Delete admin user
    await db.admin.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin user:", error)
    return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 })
  }
}