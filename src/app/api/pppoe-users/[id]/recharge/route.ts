import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { routerOSService } from '@/lib/routeros'
import { PPPoEStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { days = 30 } = body

    if (days <= 0) {
      return NextResponse.json({ error: 'Days must be greater than 0' }, { status: 400 })
    }

    const user = await db.pPPoEUser.findUnique({
      where: { id: params.id },
      include: {
        router: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const previousExpiry = user.expiryAt
    let newExpiry: Date

    if (!previousExpiry || new Date(previousExpiry) < new Date()) {
      // If no expiry or expired, set from today
      newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + days)
    } else {
      // Extend existing expiry
      newExpiry = new Date(previousExpiry)
      newExpiry.setDate(newExpiry.getDate() + days)
    }

    // Update user in database
    const updatedUser = await db.pPPoEUser.update({
      where: { id: params.id },
      data: {
        expiryAt: newExpiry,
        status: PPPoEStatus.ACTIVE,
        lastRechargedAt: new Date()
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
        type: 'RECHARGE'
      }
    })

    // Enable user on router if they were disabled
    if (user.status === PPPoEStatus.EXPIRED || user.status === PPPoEStatus.DISABLED) {
      const enableResult = await routerOSService.enableUser(user.router, user.username)
      
      if (!enableResult.success) {
        // Log the error but don't fail the recharge
        await db.logEntry.create({
          data: {
            action: 'PPPOE_USER_ENABLE_FAILED',
            routerId: user.routerId,
            pppoeUserId: user.id,
            details: `Failed to enable user "${user.username}" on router: ${enableResult.error}`
          }
        })
      }
    }

    // Log the recharge
    await db.logEntry.create({
      data: {
        action: 'PPPOE_USER_RECHARGED',
        routerId: user.routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${user.username}" recharged for ${days} days`
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error recharging PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}