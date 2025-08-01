import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { routerOSService } from '@/lib/routeros'
import { RouterStatus, PPPoEStatus } from '@prisma/client'

export async function POST(
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

    // Fetch users from RouterOS
    const result = await routerOSService.fetchUsers(router)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const routerosUsers = result.data

    // Get existing users from database
    const existingUsers = await db.pPPoEUser.findMany({
      where: { routerId: params.id }
    })

    const existingUsernames = new Set(existingUsers.map(u => u.username))

    // Only return users that don't already exist in our database
    const newUsers = routerosUsers.filter(u => !existingUsernames.has(u.name))

    // Format the response
    const formattedUsers = newUsers.map(user => ({
      username: user.name,
      password: user.password,
      status: user.disabled ? PPPoEStatus.DISABLED : PPPoEStatus.ACTIVE,
      service: user.service,
      profile: user.profile,
      callerId: user.callerId,
      comment: user.comment
    }))

    // Update router status
    await db.router.update({
      where: { id: params.id },
      data: {
        status: RouterStatus.ONLINE,
        lastCheckedAt: new Date()
      }
    })

    // Log the import operation
    await db.logEntry.create({
      data: {
        action: 'ROUTER_IMPORT_USERS',
        routerId: router.id,
        details: `Import scan completed: ${formattedUsers.length} new users found`
      }
    })

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalFound: routerosUsers.length,
      newUsers: formattedUsers.length
    })
  } catch (error) {
    console.error('Error importing users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}