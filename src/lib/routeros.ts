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
}

export class RouterOSService {
  private connection: RouterOSAPI | null = null

  async connect(router: Router): Promise<RouterOSResult> {
    try {
      this.connection = new RouterOSAPI({
        host: router.address,
        user: router.apiUsername,
        password: router.apiPassword,
        port: router.port,
      })

      await this.connection.connect()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error' 
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
    try {
      const result = await this.connect(router)
      if (result.success) {
        await this.disconnect()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error' 
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
        return { success: false, error: 'No connection established' }
      }

      const users = await this.connection.write('/ppp/secret/print')
      
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

      return { success: true, data: formattedUsers }
    } catch (error) {
      await this.disconnect()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching users' 
      }
    }
  }

  async createUser(router: Router, username: string, password: string): Promise<RouterOSResult> {
    try {
      const connectResult = await this.connect(router)
      if (!connectResult.success) {
        return connectResult
      }

      if (!this.connection) {
        return { success: false, error: 'No connection established' }
      }

      await this.connection.write('/ppp/secret/add', [
        `=name=${username}`,
        `=password=${password}`,
        '=service=pppoe',
        '=profile=default',
      ])

      await this.disconnect()

      return { success: true }
    } catch (error) {
      await this.disconnect()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error creating user' 
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