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
    const userCounts = await db.pppoeUser.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const userStats = {
      total: 0,
      active: 0,
      expired: 0,
      disabled: 0
    }

    userCounts.forEach(count => {
      userStats.total += count._count.status
      switch (count.status) {
        case PPPoEStatus.ACTIVE:
          userStats.active = count._count.status
          break
        case PPPoEStatus.EXPIRED:
          userStats.expired = count._count.status
          break
        case PPPoEStatus.DISABLED:
          userStats.disabled = count._count.status
          break
      }
    })

    // Get router counts by status
    const routerCounts = await db.router.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const routerStats = {
      total: 0,
      online: 0,
      offline: 0,
      error: 0
    }

    routerCounts.forEach(count => {
      routerStats.total += count._count.status
      switch (count.status) {
        case RouterStatus.ONLINE:
          routerStats.online = count._count.status
          break
        case RouterStatus.OFFLINE:
          routerStats.offline = count._count.status
          break
        case RouterStatus.ERROR:
          routerStats.error = count._count.status
          break
      }
    })

    // Get users expiring soon (within 3 days)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const expiringSoon = await db.pppoeUser.count({
      where: {
        status: PPPoEStatus.ACTIVE,
        expiryAt: {
          lte: threeDaysFromNow,
          gte: new Date()
        }
      }
    })

    // Get users without expiry dates
    const usersWithoutExpiry = await db.pppoeUser.count({
      where: {
        expiryAt: null
      }
    })

    // Get recent alerts (last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const recentAlerts = await db.logEntry.findMany({
      where: {
        timestamp: {
          gte: oneDayAgo
        },
        OR: [
          {
            action: {
              contains: 'FAILED'
            }
          },
          {
            action: {
              contains: 'ERROR'
            }
          }
        ]
      },
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

    // Get recent auto-disables (last 24 hours)
    const recentAutoDisables = await db.logEntry.findMany({
      where: {
        timestamp: {
          gte: oneDayAgo
        },
        action: 'PPPOE_USER_AUTO_DISABLED'
      },
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

    return NextResponse.json({
      userStats,
      routerStats,
      expiringSoon,
      usersWithoutExpiry,
      recentAlerts,
      recentAutoDisables
    })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}