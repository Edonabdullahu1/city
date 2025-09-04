import { Page, expect } from '@playwright/test'

export class AuthHelper {
  constructor(private page: Page) {}

  async loginAs(userType: 'user' | 'agent' | 'admin', options?: { skipDashboard?: boolean }) {
    const credentials = this.getCredentials(userType)
    
    await this.page.goto('/login')
    await this.page.fill('input[type="email"]', credentials.email)
    await this.page.fill('input[type="password"]', credentials.password)
    await this.page.click('button[type="submit"]')
    
    if (!options?.skipDashboard) {
      await this.page.waitForURL('/dashboard')
    }
  }

  async logout() {
    // Desktop logout
    if (await this.page.locator('[data-testid="user-menu-button"]').isVisible()) {
      await this.page.click('[data-testid="user-menu-button"]')
      await this.page.click('button:has-text("Sign Out")')
    } else {
      // Mobile logout - access through profile
      await this.page.click('text=Profile')
      await this.page.click('button:has-text("Sign Out")')
    }
    
    await this.page.waitForURL('/')
  }

  async register(userData: {
    name: string
    email: string
    password: string
    role?: 'user' | 'agent' | 'admin'
  }) {
    await this.page.goto('/register')
    
    await this.page.fill('input[name="name"]', userData.name)
    await this.page.fill('input[type="email"]', userData.email)
    await this.page.fill('input[type="password"]', userData.password)
    await this.page.fill('input[name="confirmPassword"]', userData.password)
    
    // If role selection is available
    if (userData.role && await this.page.locator('select[name="role"]').isVisible()) {
      await this.page.selectOption('select[name="role"]', userData.role)
    }
    
    await this.page.click('button[type="submit"]')
  }

  async expectAuthenticatedState() {
    // Should not see login/signup buttons
    await expect(this.page.locator('text=Sign In')).not.toBeVisible()
    await expect(this.page.locator('text=Sign Up')).not.toBeVisible()
    
    // Should see user menu or profile link
    const userMenuExists = await this.page.locator('[data-testid="user-menu-button"]').isVisible()
    const profileLinkExists = await this.page.locator('text=Profile').isVisible()
    
    expect(userMenuExists || profileLinkExists).toBe(true)
  }

  async expectUnauthenticatedState() {
    // Should see login/signup buttons
    await expect(this.page.locator('text=Sign In')).toBeVisible()
    
    // Should not see user menu
    await expect(this.page.locator('[data-testid="user-menu-button"]')).not.toBeVisible()
  }

  async expectRole(expectedRole: 'user' | 'agent' | 'admin') {
    await this.page.goto('/')
    
    if (await this.page.locator('[data-testid="user-menu-button"]').isVisible()) {
      // Desktop: Click user menu to see role
      await this.page.click('[data-testid="user-menu-button"]')
      
      switch (expectedRole) {
        case 'agent':
          await expect(this.page.locator('text=Agent Dashboard')).toBeVisible()
          break
        case 'admin':
          await expect(this.page.locator('text=Admin Panel')).toBeVisible()
          break
        case 'user':
          await expect(this.page.locator('text=Profile Settings')).toBeVisible()
          await expect(this.page.locator('text=Agent Dashboard')).not.toBeVisible()
          await expect(this.page.locator('text=Admin Panel')).not.toBeVisible()
          break
      }
      
      // Close menu
      await this.page.keyboard.press('Escape')
    } else {
      // Mobile: Check navigation
      switch (expectedRole) {
        case 'agent':
          await expect(this.page.locator('text=Agent')).toBeVisible()
          break
        case 'admin':
          await expect(this.page.locator('text=Admin')).toBeVisible()
          break
        case 'user':
          await expect(this.page.locator('text=Profile')).toBeVisible()
          await expect(this.page.locator('text=Agent')).not.toBeVisible()
          await expect(this.page.locator('text=Admin')).not.toBeVisible()
          break
      }
    }
  }

  private getCredentials(userType: 'user' | 'agent' | 'admin') {
    const credentials = {
      user: {
        email: 'testuser@example.com',
        password: 'password123'
      },
      agent: {
        email: 'agent@example.com',
        password: 'password123'
      },
      admin: {
        email: 'admin@example.com',
        password: 'password123'
      }
    }
    
    return credentials[userType]
  }

  async createTestUser(options: {
    email?: string
    name?: string
    role?: 'user' | 'agent' | 'admin'
  } = {}) {
    const timestamp = Date.now()
    const userData = {
      name: options.name || `Test User ${timestamp}`,
      email: options.email || `test${timestamp}@example.com`,
      password: 'TestPassword123!',
      role: options.role || 'user'
    }
    
    await this.register(userData)
    return userData
  }

  async resetPassword(email: string) {
    await this.page.goto('/forgot-password')
    await this.page.fill('input[type="email"]', email)
    await this.page.click('button[type="submit"]')
    
    await expect(this.page.locator('text=Password reset instructions sent')).toBeVisible()
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.page.goto('/profile')
    
    // Navigate to password change section
    await this.page.click('text=Change Password')
    
    await this.page.fill('input[name="currentPassword"]', currentPassword)
    await this.page.fill('input[name="newPassword"]', newPassword)
    await this.page.fill('input[name="confirmPassword"]', newPassword)
    
    await this.page.click('button:has-text("Update Password")')
    
    await expect(this.page.locator('text=Password updated successfully')).toBeVisible()
  }
}

// Session management helper
export class SessionHelper {
  constructor(private page: Page) {}

  async preserveSession() {
    // Get current session data
    const sessionData = await this.page.evaluate(() => {
      return {
        localStorage: JSON.stringify(localStorage),
        sessionStorage: JSON.stringify(sessionStorage),
        cookies: document.cookie
      }
    })
    
    return sessionData
  }

  async restoreSession(sessionData: any) {
    // Restore session data
    await this.page.evaluate((data) => {
      // Restore localStorage
      const localStorageData = JSON.parse(data.localStorage)
      for (const key in localStorageData) {
        localStorage.setItem(key, localStorageData[key])
      }
      
      // Restore sessionStorage
      const sessionStorageData = JSON.parse(data.sessionStorage)
      for (const key in sessionStorageData) {
        sessionStorage.setItem(key, sessionStorageData[key])
      }
    }, sessionData)
    
    // Restore cookies
    const cookies = sessionData.cookies.split(';').map((cookie: string) => {
      const [name, value] = cookie.trim().split('=')
      return { name, value, domain: 'localhost' }
    })
    
    await this.page.context().addCookies(cookies)
  }

  async clearSession() {
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    await this.page.context().clearCookies()
  }
}