import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const routers = await db.router.findMany({
      include: {
        _count: {
          select: { pppoeUsers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(routers)
  } catch (error) {
    console.error('Error fetching routers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { friendlyName, address, apiUsername, apiPassword, port } = body

    if (!friendlyName || !address || !apiUsername || !apiPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const router = await db.router.create({
      data: {
        friendlyName,
        address,
        apiUsername,
        apiPassword,
        port: port || 8728,
      }
    })

    // Log the router creation
    await db.logEntry.create({
      data: {
        action: 'ROUTER_CREATED',
        routerId: router.id,
        details: `Router "${friendlyName}" created`
      }
    })

    return NextResponse.json(router)
  } catch (error) {
    console.error('Error creating router:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}