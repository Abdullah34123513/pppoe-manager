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
      where: { id: params.id },
      include: {
        pppoeUsers: true
      }
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
    const existingUsers = await db.pppoeUser.findMany({
      where: { routerId: params.id }
    })

    const existingUsernames = new Set(existingUsers.map(u => u.username))
    const routerosUsernames = new Set(routerosUsers.map(u => u.name))

    // Find users to add (exist in RouterOS but not in DB)
    const usersToAdd = routerosUsers.filter(u => !existingUsernames.has(u.name))

    // Find users to update (exist in both but status might differ)
    const usersToUpdate = routerosUsers.filter(u => existingUsernames.has(u.name))

    // Add new users
    for (const user of usersToAdd) {
      await db.pppoeUser.create({
        data: {
          routerId: params.id,
          username: user.name,
          password: user.password,
          status: user.disabled ? PPPoEStatus.DISABLED : PPPoEStatus.ACTIVE,
          source: 'IMPORTED',
          importedAt: new Date(),
        }
      })
    }

    // Update existing users
    for (const user of usersToUpdate) {
      const existingUser = existingUsers.find(u => u.username === user.name)
      if (existingUser) {
        await db.pppoeUser.update({
          where: { id: existingUser.id },
          data: {
            status: user.disabled ? PPPoEStatus.DISABLED : existingUser.status,
            password: user.password || existingUser.password,
          }
        })
      }
    }

    // Update router status
    await db.router.update({
      where: { id: params.id },
      data: {
        status: RouterStatus.ONLINE,
        lastCheckedAt: new Date()
      }
    })

    // Log the resync operation
    await db.logEntry.create({
      data: {
        action: 'ROUTER_RESYNC',
        routerId: router.id,
        details: `Resync completed: ${usersToAdd.length} new users imported, ${usersToUpdate.length} users updated`
      }
    })

    return NextResponse.json({ 
      success: true,
      usersAdded: usersToAdd.length,
      usersUpdated: usersToUpdate.length
    })
  } catch (error) {
    console.error('Error resyncing router:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}