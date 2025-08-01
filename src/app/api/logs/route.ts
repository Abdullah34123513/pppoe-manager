import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const action = searchParams.get('action')
    const routerId = searchParams.get('routerId')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (action) {
      where.action = action
    }
    
    if (routerId) {
      where.routerId = routerId
    }

    const [logs, total] = await Promise.all([
      db.logEntry.findMany({
        where,
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
        skip,
        take: limit
      }),
      db.logEntry.count({ where })
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}