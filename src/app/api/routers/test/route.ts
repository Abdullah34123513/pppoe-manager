import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { routerOSService } from '@/lib/routeros'

export async function POST(request: NextRequest) {
  try {
    console.log('Test connection request received')
    
    // Check for session
    const session = await getServerSession(authOptions)
    console.log('Session check result:', session ? 'Authenticated' : 'Not authenticated')
    
    if (!session) {
      console.log('Unauthorized test connection attempt - no session found')
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 })
    }

    // Check if the session has the required user information
    if (!session.user || !session.user.id) {
      console.log('Invalid session - missing user information')
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Test connection body:', body)
    
    const { friendlyName, address, apiUsername, apiPassword, port } = body

    if (!address || !apiUsername || !apiPassword) {
      console.log('Missing required fields:', { address, apiUsername, apiPassword })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create a temporary router object for testing
    const tempRouter = {
      id: 'temp',
      friendlyName,
      address,
      apiUsername,
      apiPassword,
      port: port || 8728,
      lastCheckedAt: null,
      status: 'OFFLINE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log('Testing connection to:', { address, port, apiUsername })

    const result = await routerOSService.testConnection(tempRouter)
    
    console.log('Connection test result:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error testing router connection:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}