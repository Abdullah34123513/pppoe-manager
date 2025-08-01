import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { routerOSService } from '@/lib/routeros'

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
    const { friendlyName, address, apiUsername, apiPassword, port } = body

    const existingRouter = await db.router.findUnique({
      where: { id: params.id }
    })

    if (!existingRouter) {
      return NextResponse.json({ error: 'Router not found' }, { status: 404 })
    }

    const router = await db.router.update({
      where: { id: params.id },
      data: {
        friendlyName: friendlyName || existingRouter.friendlyName,
        address: address || existingRouter.address,
        apiUsername: apiUsername || existingRouter.apiUsername,
        apiPassword: apiPassword || existingRouter.apiPassword,
        port: port || existingRouter.port,
      }
    })

    // Log the router update
    await db.logEntry.create({
      data: {
        action: 'ROUTER_UPDATED',
        routerId: router.id,
        details: `Router "${router.friendlyName}" updated`
      }
    })

    return NextResponse.json(router)
  } catch (error) {
    console.error('Error updating router:', error)
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

    const router = await db.router.findUnique({
      where: { id: params.id }
    })

    if (!router) {
      return NextResponse.json({ error: 'Router not found' }, { status: 404 })
    }

    await db.router.delete({
      where: { id: params.id }
    })

    // Log the router deletion
    await db.logEntry.create({
      data: {
        action: 'ROUTER_DELETED',
        details: `Router "${router.friendlyName}" deleted`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting router:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}