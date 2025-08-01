import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PPPoEStatus } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { expiryAt } = body

    if (!expiryAt) {
      return NextResponse.json({ error: 'Expiry date is required' }, { status: 400 })
    }

    const user = await db.pppoeUser.findUnique({
      where: { id: params.id },
      include: {
        router: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const previousExpiry = user.expiryAt
    const newExpiry = new Date(expiryAt)

    // Update user in database
    const updatedUser = await db.pppoeUser.update({
      where: { id: params.id },
      data: {
        expiryAt: newExpiry
      },
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true
          }
        }
      }
    })

    // Record expiry adjustment
    await db.expiryAdjustment.create({
      data: {
        pppoeUserId: user.id,
        previousExpiry,
        newExpiry,
        type: 'MANUAL_EDIT'
      }
    })

    // Log the expiry update
    await db.logEntry.create({
      data: {
        action: 'PPPOE_USER_EXPIRY_UPDATED',
        routerId: user.routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${user.username}" expiry updated to ${newExpiry.toISOString()}`
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating PPPoE user expiry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}