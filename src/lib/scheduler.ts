import { PrismaClient } from '@prisma/client'
import { routerOSService } from './routeros'
import { PPPoEStatus } from '@prisma/client'

const db = new PrismaClient()

export class ExpirationScheduler {
  private intervalId: NodeJS.Timeout | null = null

  start() {
    // Run every hour
    this.intervalId = setInterval(async () => {
      await this.checkExpiredUsers()
    }, 60 * 60 * 1000) // 1 hour

    // Also run immediately on start
    this.checkExpiredUsers()
    
    console.log('Expiration scheduler started')
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Expiration scheduler stopped')
    }
  }

  private async checkExpiredUsers() {
    try {
      console.log('Checking for expired users...')
      
      const now = new Date()
      
      // Find all active users that have expired
      const expiredUsers = await db.pPPoEUser.findMany({
        where: {
          status: PPPoEStatus.ACTIVE,
          expiryAt: {
            lt: now
          }
        },
        include: {
          router: true
        }
      })

      if (expiredUsers.length === 0) {
        console.log('No expired users found')
        return
      }

      console.log(`Found ${expiredUsers.length} expired users`)

      for (const user of expiredUsers) {
        try {
          // Disable user on router
          const result = await routerOSService.disableUser(user.router, user.username)
          
          if (result.success) {
            // Update user status in database
            await db.pPPoEUser.update({
              where: { id: user.id },
              data: {
                status: PPPoEStatus.EXPIRED
              }
            })

            // Log the auto-disable
            await db.logEntry.create({
              data: {
                action: 'PPPOE_USER_AUTO_DISABLED',
                routerId: user.routerId,
                pppoeUserId: user.id,
                details: `User "${user.username}" automatically disabled due to expiration`
              }
            })

            console.log(`Auto-disabled user ${user.username} on router ${user.router.friendlyName}`)
          } else {
            // Log the failure
            await db.logEntry.create({
              data: {
                action: 'PPPOE_USER_AUTO_DISABLE_FAILED',
                routerId: user.routerId,
                pppoeUserId: user.id,
                details: `Failed to auto-disable user "${user.username}" on router: ${result.error}`
              }
            })

            console.error(`Failed to auto-disable user ${user.username}: ${result.error}`)
          }
        } catch (error) {
          console.error(`Error processing expired user ${user.username}:`, error)
          
          // Log the error
          await db.logEntry.create({
            data: {
              action: 'PPPOE_USER_AUTO_DISABLE_ERROR',
              routerId: user.routerId,
              pppoeUserId: user.id,
              details: `Error processing expired user "${user.username}": ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          })
        }
      }

      console.log(`Completed processing ${expiredUsers.length} expired users`)
    } catch (error) {
      console.error('Error in expiration scheduler:', error)
      
      // Log the scheduler error
      await db.logEntry.create({
        data: {
          action: 'EXPIRATION_SCHEDULER_ERROR',
          details: `Scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      })
    }
  }
}

export const expirationScheduler = new ExpirationScheduler()