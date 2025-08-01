import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.pPPoEUser.findUnique({
      where: { id: params.id },
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true,
            status: true
          }
        },
        expiryAdjustments: {
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { username, password } = body

    const existingUser = await db.pPPoEUser.findUnique({
      where: { id: params.id },
      include: {
        router: true
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}
    
    if (username && username !== existingUser.username) {
      // Check if username already exists on this router
      const duplicateUser = await db.pPPoEUser.findFirst({
        where: {
          routerId: existingUser.routerId,
          username,
          id: { not: params.id }
        }
      })

      if (duplicateUser) {
        return NextResponse.json({ error: 'Username already exists on this router' }, { status: 400 })
      }
      
      updateData.username = username
    }
    
    if (password) {
      updateData.password = password
    }

    const user = await db.pPPoEUser.update({
      where: { id: params.id },
      data: updateData,
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true
          }
        }
      }
    })

    // Log the user update
    await db.logEntry.create({
      data: {
        action: 'PPPOE_USER_UPDATED',
        routerId: existingUser.routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${user.username}" updated`
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    await db.pPPoEUser.delete({
      where: { id: params.id }
    })

    // Log the user deletion
    await db.logEntry.create({
      data: {
        action: 'PPPOE_USER_DELETED',
        routerId: user.routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${user.username}" deleted from router "${user.router.friendlyName}"`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}