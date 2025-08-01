import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PPPoEStatus } from '@prisma/client'

interface ImportUser {
  username: string
  password?: string
  status: PPPoEStatus
  expiryAt?: string
  service?: string
  profile?: string
  callerId?: string
  comment?: string
}

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
    const { users }: { users: ImportUser[] } = body

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid users data' }, { status: 400 })
    }

    const router = await db.router.findUnique({
      where: { id: params.id }
    })

    if (!router) {
      return NextResponse.json({ error: 'Router not found' }, { status: 404 })
    }

    const importedUsers = []
    const skippedUsers = []

    for (const user of users) {
      // Skip users without expiry dates
      if (!user.expiryAt) {
        skippedUsers.push(user.username)
        continue
      }

      // Check if user already exists
      const existingUser = await db.pPPoEUser.findFirst({
        where: {
          routerId: params.id,
          username: user.username
        }
      })

      if (existingUser) {
        skippedUsers.push(user.username)
        continue
      }

      // Create the user
      const createdUser = await db.pPPoEUser.create({
        data: {
          routerId: params.id,
          username: user.username,
          password: user.password,
          status: user.status,
          activatedAt: new Date(),
          expiryAt: new Date(user.expiryAt),
          source: 'IMPORTED',
          importedAt: new Date()
        }
      })

      // Record expiry adjustment
      await db.expiryAdjustment.create({
        data: {
          pppoeUserId: createdUser.id,
          previousExpiry: null,
          newExpiry: new Date(user.expiryAt),
          type: 'IMPORT_SET'
        }
      })

      importedUsers.push(createdUser)
    }

    // Log the import completion
    await db.logEntry.create({
      data: {
        action: 'ROUTER_IMPORT_USERS_COMPLETED',
        routerId: router.id,
        details: `Import completed: ${importedUsers.length} users imported, ${skippedUsers.length} users skipped`
      }
    })

    return NextResponse.json({
      success: true,
      importedCount: importedUsers.length,
      skippedCount: skippedUsers.length,
      importedUsers,
      skippedUsers
    })
  } catch (error) {
    console.error('Error saving imported users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}