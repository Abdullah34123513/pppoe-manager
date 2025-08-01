import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PPPoEStatus, RouterStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user counts by status
    const userCounts = await db.pPPoEUser.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const totalUsers = await db.pPPoEUser.count()
    const activeUsers = userCounts.find(u => u.status === PPPoEStatus.ACTIVE)?._count.status || 0
    const expiredUsers = userCounts.find(u => u.status === PPPoEStatus.EXPIRED)?._count.status || 0
    const disabledUsers = userCounts.find(u => u.status === PPPoEStatus.DISABLED)?._count.status || 0

    // Get router counts by status
    const routerCounts = await db.router.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const totalRouters = await db.router.count()
    const onlineRouters = routerCounts.find(r => r.status === RouterStatus.ONLINE)?._count.status || 0
    const offlineRouters = routerCounts.find(r => r.status === RouterStatus.OFFLINE)?._count.status || 0
    const errorRouters = routerCounts.find(r => r.status === RouterStatus.ERROR)?._count.status || 0

    // Get users expiring soon (within 3 days)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const expiringSoon = await db.pPPoEUser.count({
      where: {
        status: PPPoEStatus.ACTIVE,
        expiryAt: {
          lte: threeDaysFromNow,
          gte: new Date()
        }
      }
    })

    // Get users without expiry dates
    const usersWithoutExpiry = await db.pPPoEUser.count({
      where: {
        expiryAt: null
      }
    })

    // Get recent logs (last 10)
    const recentLogs = await db.logEntry.findMany({
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true
          }
        },
        pppoeUser: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    // Get recent auto-disables (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentAutoDisables = await db.logEntry.count({
      where: {
        action: 'PPPOE_USER_AUTO_DISABLED',
        timestamp: {
          gte: sevenDaysAgo
        }
      }
    })

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        expired: expiredUsers,
        disabled: disabledUsers,
        expiringSoon,
        withoutExpiry: usersWithoutExpiry
      },
      routers: {
        total: totalRouters,
        online: onlineRouters,
        offline: offlineRouters,
        error: errorRouters
      },
      alerts: {
        recentAutoDisables,
        usersWithoutExpiry,
        offlineRouters,
        errorRouters
      },
      recentLogs
    })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}