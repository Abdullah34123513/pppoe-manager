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
    const routerId = searchParams.get('routerId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (routerId) {
      where.routerId = routerId
    }
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.username = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const [users, total] = await Promise.all([
      db.pppoeUser.findMany({
        where,
        include: {
          router: {
            select: {
              id: true,
              friendlyName: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.pppoeUser.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching PPPoE users:', error)
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
    const { routerId, username, password } = body

    if (!routerId || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if router exists
    const router = await db.router.findUnique({
      where: { id: routerId }
    })

    if (!router) {
      return NextResponse.json({ error: 'Router not found' }, { status: 404 })
    }

    // Check if user already exists on this router
    const existingUser = await db.pppoeUser.findFirst({
      where: {
        routerId,
        username
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists on this router' }, { status: 400 })
    }

    // Calculate expiry date (30 days from now)
    const expiryAt = new Date()
    expiryAt.setDate(expiryAt.getDate() + 30)

    const user = await db.pppoeUser.create({
      data: {
        routerId,
        username,
        password,
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiryAt,
        source: 'MANUAL'
      },
      include: {
        router: {
          select: {
            id: true,
            friendlyName: true
          }
        }
      }
    })

    // Log the user creation
    await db.logEntry.create({
      data: {
        action: 'PPPOE_USER_CREATED',
        routerId,
        pppoeUserId: user.id,
        details: `PPPoE user "${username}" created on router "${router.friendlyName}"`
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating PPPoE user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}