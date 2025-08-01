import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { routerOSService } from '@/lib/routeros'

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

    // Create the router with initial OFFLINE status
    const router = await db.router.create({
      data: {
        friendlyName,
        address,
        apiUsername,
        apiPassword,
        port: port || 8728,
        status: 'OFFLINE'
      }
    })

    // Test the connection and update status
    try {
      const testResult = await routerOSService.testConnection(router)
      
      // Update router status based on test result
      await db.router.update({
        where: { id: router.id },
        data: {
          status: testResult.success ? 'ONLINE' : 'OFFLINE',
          lastCheckedAt: new Date()
        }
      })

      // Log the router creation and connection test
      await db.logEntry.create({
        data: {
          action: 'ROUTER_CREATED',
          routerId: router.id,
          details: `Router "${friendlyName}" created. Connection test ${testResult.success ? 'successful' : 'failed'}: ${testResult.error || 'Connected'}`
        }
      })

      return NextResponse.json({
        ...router,
        status: testResult.success ? 'ONLINE' : 'OFFLINE',
        lastCheckedAt: new Date()
      })
    } catch (testError) {
      console.error('Connection test failed during router creation:', testError)
      
      // Log the router creation even if connection test fails
      await db.logEntry.create({
        data: {
          action: 'ROUTER_CREATED',
          routerId: router.id,
          details: `Router "${friendlyName}" created. Connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`
        }
      })

      // Return router with OFFLINE status
      return NextResponse.json(router)
    }
  } catch (error) {
    console.error('Error creating router:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}