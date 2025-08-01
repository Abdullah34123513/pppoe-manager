import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { routerOSService } from '@/lib/routeros'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { friendlyName, address, apiUsername, apiPassword, port, routerId } = body

    if (!friendlyName || !address || !apiUsername || !apiPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create a temporary router object for testing
    const testRouter = {
      id: routerId || 'test',
      friendlyName,
      address,
      apiUsername,
      apiPassword,
      port: port || 8728,
      status: 'OFFLINE' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Test the connection
    const testResult = await routerOSService.testConnection(testRouter)

    // If this is testing an existing router, update its status in the database
    if (routerId) {
      try {
        await db.router.update({
          where: { id: routerId },
          data: {
            status: testResult.success ? 'ONLINE' : 'OFFLINE',
            lastCheckedAt: new Date()
          }
        })

        // Log the connection test
        await db.logEntry.create({
          data: {
            action: testResult.success ? 'ROUTER_CONNECTION_SUCCESS' : 'ROUTER_CONNECTION_FAILED',
            routerId: routerId,
            details: `Connection test ${testResult.success ? 'successful' : 'failed'}: ${testResult.error || 'Connected'}`
          }
        })
      } catch (updateError) {
        console.error('Failed to update router status:', updateError)
        // Don't fail the test if the update fails
      }
    }

    return NextResponse.json(testResult)
  } catch (error) {
    console.error('Error testing router connection:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}