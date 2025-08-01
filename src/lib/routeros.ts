import { RouterOSAPI } from 'node-routeros'
import { Router } from '@prisma/client'

export interface RouterOSUser {
  id: string
  name: string
  password: string
  service: string
  profile: string
  callerId: string
  disabled: boolean
  comment: string
}

export interface RouterOSResult {
  success: boolean
  data?: any
  error?: string
  suggestions?: string[]
}

export class RouterOSService {
  private connection: RouterOSAPI | null = null
  private connectionTimeout: number = 15000 // 15 seconds timeout

  async connect(router: Router): Promise<RouterOSResult> {
    try {
      console.log('RouterOSService: Connecting to', router.address, 'on port', router.port)
      
      // Validate router configuration
      if (!router.address || !router.apiUsername || !router.apiPassword) {
        return {
          success: false,
          error: 'Missing router configuration',
          suggestions: [
            'Check router IP address',
            'Check API username',
            'Check API password'
          ]
        }
      }

      // Create connection with timeout
      this.connection = new RouterOSAPI({
        host: router.address,
        user: router.apiUsername,
        password: router.apiPassword,
        port: router.port,
        timeout: this.connectionTimeout
      })

      // Set up connection timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection timeout after ${this.connectionTimeout}ms`))
        }, this.connectionTimeout)
      })

      // Connect with timeout
      await Promise.race([
        this.connection.connect(),
        timeoutPromise
      ])

      console.log('RouterOSService: Successfully connected to', router.address)
      
      // Test basic connectivity with a simple command
      try {
        const identity = await this.connection.write('/system/identity/print')
        console.log('RouterOSService: Router identity:', identity[0]?.name || 'Unknown')
      } catch (testError) {
        console.warn('RouterOSService: Basic command test failed:', testError)
      }

      return { success: true }
    } catch (error) {
      console.error('RouterOSService: Connection failed to', router.address, ':', error)
      
      // Provide specific error messages and suggestions
      let errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      let suggestions: string[] = []

      if (errorMessage.includes('timeout')) {
        suggestions = [
          'Check if the router is running and accessible',
          'Check if the router IP address is correct',
          'Check if there is a firewall blocking the connection',
          'Check if the API service is enabled on the router',
          'Try pinging the router from this server'
        ]
      } else if (errorMessage.includes('ECONNREFUSED')) {
        suggestions = [
          'Check if the API service is enabled on the router',
          'Check if the port number is correct',
          'Check if the router is running'
        ]
      } else if (errorMessage.includes('authentication')) {
        suggestions = [
          'Check if the API username is correct',
          'Check if the API password is correct',
          'Check if the user has API permissions'
        ]
      } else {
        suggestions = [
          'Check network connectivity',
          'Check router configuration',
          'Check firewall settings',
          'Verify API service is enabled'
        ]
      }

      return { 
        success: false, 
        error: errorMessage,
        suggestions
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
  }

  async testConnection(router: Router): Promise<RouterOSResult> {
    console.log('RouterOSService: Testing connection to', router.address)
    
    try {
      const result = await this.connect(router)
      console.log('RouterOSService: Connect result:', result)
      
      if (result.success) {
        await this.disconnect()
        console.log('RouterOSService: Connection test successful')
        return { 
          success: true,
          message: 'Successfully connected to RouterOS device'
        }
      }
      
      return result
    } catch (error) {
      console.error('RouterOSService: Connection test error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error',
        suggestions: [
          'Check network connectivity',
          'Check router configuration',
          'Verify API service is enabled'
        ]
      }
    }
  }

  async fetchUsers(router: Router): Promise<RouterOSResult> {
    try {
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { 
          success: false, 
          error: 'No connection established',
          suggestions: ['Check router connection', 'Try reconnecting']
        }
      }

      console.log('RouterOSService: Fetching PPPoE users from', router.address)
      const users = await this.connection.write('/ppp/secret/print')
      console.log('RouterOSService: Found', users.length, 'PPPoE users')
      
      await this.disconnect()

      const formattedUsers: RouterOSUser[] = users.map((user: any) => ({
        id: user['.id'],
        name: user.name,
        password: user.password,
        service: user.service,
        profile: user.profile,
        callerId: user['caller-id'],
        disabled: user.disabled === 'true',
        comment: user.comment || '',
      }))

      return { 
        success: true, 
        data: formattedUsers,
        message: `Successfully fetched ${formattedUsers.length} users`
      }
    } catch (error) {
      await this.disconnect()
      console.error('RouterOSService: Error fetching users:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching users',
        suggestions: [
          'Check if PPPoE service is enabled on the router',
          'Check if user has permission to access PPPoE secrets',
          'Verify router connection'
        ]
      }
    }
  }

  async createUser(router: Router, username: string, password: string, speedPlan?: any): Promise<RouterOSResult> {
    try {
      console.log(`RouterOSService: Creating user "${username}" on router ${router.address}`)
      
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { 
          success: false, 
          error: 'No connection established',
          suggestions: ['Check router connection', 'Try reconnecting']
        }
      }

      console.log(`RouterOSService: Adding PPPoE secret for user "${username}"`)
      
      // Build the command parameters
      const params = [
        `=name=${username}`,
        `=password=${password}`,
        '=service=pppoe',
      ]

      // Add speed plan if provided
      if (speedPlan) {
        console.log(`RouterOSService: Applying speed plan "${speedPlan.name}" with ${speedPlan.downloadSpeed}/${speedPlan.uploadSpeed} Kbps`)
        
        // For RouterOS, we need to create or use a queue tree for speed limiting
        // First, let's create a simple approach using rate-limit in the PPPoE secret
        // Note: This is a basic implementation. For more advanced speed control,
        // you would need to create queue trees and handle them separately.
        
        // Add rate limit parameters if supported
        if (speedPlan.downloadSpeed && speedPlan.uploadSpeed) {
          params.push(`=limit-at=${speedPlan.uploadSpeed}k/${speedPlan.downloadSpeed}k`)
          params.push(`=max-limit=${speedPlan.uploadSpeed}k/${speedPlan.downloadSpeed}k`)
        }
      } else {
        params.push('=profile=default')
      }

      await this.connection.write('/ppp/secret/add', params)

      console.log(`RouterOSService: Successfully created user "${username}" on RouterOS`)
      await this.disconnect()

      return { 
        success: true,
        message: `Successfully created user "${username}" on RouterOS device${speedPlan ? ` with speed plan "${speedPlan.name}"` : ''}`
      }
    } catch (error) {
      await this.disconnect()
      console.error(`RouterOSService: Error creating user "${username}":`, error)
      
      let errorMessage = error instanceof Error ? error.message : 'Unknown error creating user'
      let suggestions: string[] = []

      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        suggestions = [
          'Check if the username already exists on the router',
          'Try using a different username',
          'Check the router for existing PPPoE secrets'
        ]
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        suggestions = [
          'Check if the API user has permission to create PPPoE secrets',
          'Verify user permissions on the router',
          'Check if PPPoE service is enabled'
        ]
      } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
        suggestions = [
          'Check if the username format is valid',
          'Verify password requirements',
          'Check for special characters in username or password'
        ]
      } else {
        suggestions = [
          'Check if PPPoE service is enabled on the router',
          'Verify router connection',
          'Check router configuration and permissions'
        ]
      }

      return { 
        success: false, 
        error: errorMessage,
        suggestions
      }
    }
  }

  async disableUser(router: Router, username: string): Promise<RouterOSResult> {
    try {
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { success: false, error: 'No connection established' }
      }

      // First find the user ID
      const users = await this.connection.write('/ppp/secret/print', [
        `?name=${username}`,
      ])

      if (users.length === 0) {
        await this.disconnect()
        return { success: false, error: 'User not found' }
      }

      const userId = users[0]['.id']

      // Disable the user
      await this.connection.write('/ppp/secret/set', [
        `=.id=${userId}`,
        '=disabled=true',
      ])

      await this.disconnect()

      return { success: true }
    } catch (error) {
      await this.disconnect()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error disabling user' 
      }
    }
  }

  async enableUser(router: Router, username: string): Promise<RouterOSResult> {
    try {
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { success: false, error: 'No connection established' }
      }

      // First find the user ID
      const users = await this.connection.write('/ppp/secret/print', [
        `?name=${username}`,
      ])

      if (users.length === 0) {
        await this.disconnect()
        return { success: false, error: 'User not found' }
      }

      const userId = users[0]['.id']

      // Enable the user
      await this.connection.write('/ppp/secret/set', [
        `=.id=${userId}`,
        '=disabled=false',
      ])

      await this.disconnect()

      return { success: true }
    } catch (error) {
      await this.disconnect()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error enabling user' 
      }
    }
  }

  async updateUserPassword(router: Router, username: string, newPassword: string): Promise<RouterOSResult> {
    try {
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { success: false, error: 'No connection established' }
      }

      // First find the user ID
      const users = await this.connection.write('/ppp/secret/print', [
        `?name=${username}`,
      ])

      if (users.length === 0) {
        await this.disconnect()
        return { success: false, error: 'User not found' }
      }

      const userId = users[0]['.id']

      // Update password
      await this.connection.write('/ppp/secret/set', [
        `=.id=${userId}`,
        `=password=${newPassword}`,
      ])

      await this.disconnect()

      return { success: true }
    } catch (error) {
      await this.disconnect()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error updating password' 
      }
    }
  }
}

export const routerOSService = new RouterOSService()