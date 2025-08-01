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
    const { disable } = body

    const user = await db.pppoeUser.findUnique({
      where: { id: params.id },
      include: {
        router: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let result
    let newStatus

    if (disable) {
      // Disable user
      result = await routerOSService.disableUser(user.router, user.username)
      newStatus = PPPoEStatus.DISABLED
    } else {
      // Enable user
      result = await routerOSService.enableUser(user.router, user.username)
      newStatus = PPPoEStatus.ACTIVE
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Update user status in database
    const updatedUser = await db.pppoeUser.update({
      where: { id: params.id },
      data: {
        status: newStatus
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

    // Log the toggle action
    await db.logEntry.create({
      data: {
        action: disable ? 'PPPOE_USER_DISABLED' : 'PPPOE_USER_ENABLED',
        routerId: user.routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${user.username}" ${disable ? 'disabled' : 'enabled'} on router "${user.router.friendlyName}"`
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error toggling PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}