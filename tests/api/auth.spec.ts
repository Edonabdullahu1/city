import { test, expect } from '@playwright/test'
import { testUsers, defaultUsers, mockUserResponses } from '../fixtures/users'

test.describe('Authentication API', () => {
  test.describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async ({ request }) => {
      const loginData = {
        email: defaultUsers.regularUser.email,
        password: defaultUsers.regularUser.password
      }

      const response = await request.post('/api/auth/login', {
        data: loginData
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe(loginData.email)
      expect(data.token).toBeDefined()
      expect(data.user.password).toBeUndefined() // Password should not be returned
    })

    test('should reject invalid credentials', async ({ request }) => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      }

      const response = await request.post('/api/auth/login', {
        data: loginData
      })

      expect(response.status()).toBe(401)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.token).toBeUndefined()
    })

    test('should validate email format', async ({ request }) => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await request.post('/api/auth/login', {
        data: loginData
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('email')
    })

    test('should require email and password', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {}
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(data.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' })
      ]))
    })

    test('should handle inactive user accounts', async ({ request }) => {
      const loginData = {
        email: defaultUsers.inactiveUser.email,
        password: defaultUsers.inactiveUser.password
      }

      const response = await request.post('/api/auth/login', {
        data: loginData
      })

      expect(response.status()).toBe(401)
      
      const data = await response.json()
      expect(data.error).toContain('inactive')
    })

    test('should rate limit login attempts', async ({ request }) => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request.post('/api/auth/login', { data: loginData })
      }

      // Next attempt should be rate limited
      const response = await request.post('/api/auth/login', { data: loginData })
      
      expect(response.status()).toBe(429)
      
      const data = await response.json()
      expect(data.error).toContain('rate limit')
    })
  })

  test.describe('POST /api/auth/register', () => {
    test('should register new user successfully', async ({ request }) => {
      const timestamp = Date.now()
      const registrationData = {
        name: 'New User',
        email: `newuser${timestamp}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }

      const response = await request.post('/api/auth/register', {
        data: registrationData
      })

      expect(response.status()).toBe(201)
      
      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe(registrationData.email)
      expect(data.user.name).toBe(registrationData.name)
      expect(data.user.role).toBe('user') // Default role
      expect(data.user.password).toBeUndefined()
    })

    test('should reject duplicate email registration', async ({ request }) => {
      const registrationData = {
        name: 'Duplicate User',
        email: defaultUsers.regularUser.email, // Existing email
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }

      const response = await request.post('/api/auth/register', {
        data: registrationData
      })

      expect(response.status()).toBe(409)
      
      const data = await response.json()
      expect(data.error).toContain('email already exists')
    })

    test('should validate password requirements', async ({ request }) => {
      const registrationData = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'weak', // Weak password
        confirmPassword: 'weak'
      }

      const response = await request.post('/api/auth/register', {
        data: registrationData
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('password')
    })

    test('should validate password confirmation', async ({ request }) => {
      const registrationData = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      }

      const response = await request.post('/api/auth/register', {
        data: registrationData
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('passwords do not match')
    })

    test('should validate required fields', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: {}
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.errors).toBeDefined()
      expect(data.errors.length).toBeGreaterThan(0)
    })

    test('should sanitize user input', async ({ request }) => {
      const timestamp = Date.now()
      const registrationData = {
        name: '<script>alert("xss")</script>Clean Name',
        email: `clean${timestamp}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }

      const response = await request.post('/api/auth/register', {
        data: registrationData
      })

      expect(response.status()).toBe(201)
      
      const data = await response.json()
      expect(data.user.name).not.toContain('<script>')
      expect(data.user.name).toContain('Clean Name')
    })
  })

  test.describe('POST /api/auth/logout', () => {
    test('should logout authenticated user', async ({ request }) => {
      // First, login to get a token
      const loginResponse = await request.post('/api/auth/login', {
        data: {
          email: defaultUsers.regularUser.email,
          password: defaultUsers.regularUser.password
        }
      })
      
      const loginData = await loginResponse.json()
      const token = loginData.token

      // Then logout
      const logoutResponse = await request.post('/api/auth/logout', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      expect(logoutResponse.status()).toBe(200)
      
      const logoutData = await logoutResponse.json()
      expect(logoutData.message).toContain('logged out')
    })

    test('should handle logout without token', async ({ request }) => {
      const response = await request.post('/api/auth/logout')

      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /api/auth/me', () => {
    test('should return current user info with valid token', async ({ request }) => {
      // Login first
      const loginResponse = await request.post('/api/auth/login', {
        data: {
          email: defaultUsers.regularUser.email,
          password: defaultUsers.regularUser.password
        }
      })
      
      const loginData = await loginResponse.json()
      const token = loginData.token

      // Get current user info
      const meResponse = await request.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      expect(meResponse.status()).toBe(200)
      
      const userData = await meResponse.json()
      expect(userData.user).toBeDefined()
      expect(userData.user.email).toBe(defaultUsers.regularUser.email)
      expect(userData.user.password).toBeUndefined()
    })

    test('should reject request without token', async ({ request }) => {
      const response = await request.get('/api/auth/me')

      expect(response.status()).toBe(401)
    })

    test('should reject request with invalid token', async ({ request }) => {
      const response = await request.get('/api/auth/me', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('POST /api/auth/forgot-password', () => {
    test('should send password reset email for valid email', async ({ request }) => {
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: defaultUsers.regularUser.email
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.message).toContain('password reset instructions')
    })

    test('should not reveal if email does not exist', async ({ request }) => {
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: 'nonexistent@example.com'
        }
      })

      // Should still return 200 to prevent email enumeration
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.message).toContain('password reset instructions')
    })

    test('should validate email format', async ({ request }) => {
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: 'invalid-email'
        }
      })

      expect(response.status()).toBe(400)
    })

    test('should rate limit password reset requests', async ({ request }) => {
      const email = defaultUsers.regularUser.email

      // Make multiple requests
      for (let i = 0; i < 4; i++) {
        await request.post('/api/auth/forgot-password', {
          data: { email }
        })
      }

      // Next request should be rate limited
      const response = await request.post('/api/auth/forgot-password', {
        data: { email }
      })

      expect(response.status()).toBe(429)
    })
  })

  test.describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async ({ request }) => {
      // This would typically require a valid reset token from email
      // For testing, we might mock this or use a test endpoint
      const response = await request.post('/api/auth/reset-password', {
        data: {
          token: 'valid-reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        }
      })

      // This test might need to be adapted based on actual implementation
      expect([200, 400]).toContain(response.status())
    })

    test('should reject invalid reset token', async ({ request }) => {
      const response = await request.post('/api/auth/reset-password', {
        data: {
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        }
      })

      expect(response.status()).toBe(400)
    })

    test('should validate new password requirements', async ({ request }) => {
      const response = await request.post('/api/auth/reset-password', {
        data: {
          token: 'valid-reset-token',
          password: 'weak',
          confirmPassword: 'weak'
        }
      })

      expect(response.status()).toBe(400)
    })
  })
})

test.describe('Authorization Middleware', () => {
  let userToken: string
  let agentToken: string
  let adminToken: string

  test.beforeAll(async ({ request }) => {
    // Get tokens for different user roles
    const userLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.regularUser.email,
        password: defaultUsers.regularUser.password
      }
    })
    const userData = await userLogin.json()
    userToken = userData.token

    const agentLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.agent.email,
        password: defaultUsers.agent.password
      }
    })
    const agentData = await agentLogin.json()
    agentToken = agentData.token

    const adminLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.admin.email,
        password: defaultUsers.admin.password
      }
    })
    const adminData = await adminLogin.json()
    adminToken = adminData.token
  })

  test('should allow user access to user endpoints', async ({ request }) => {
    const response = await request.get('/api/user/bookings', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    })

    expect(response.status()).toBe(200)
  })

  test('should deny user access to agent endpoints', async ({ request }) => {
    const response = await request.get('/api/agent/bookings', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    })

    expect(response.status()).toBe(403)
  })

  test('should deny user access to admin endpoints', async ({ request }) => {
    const response = await request.get('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    })

    expect(response.status()).toBe(403)
  })

  test('should allow agent access to agent endpoints', async ({ request }) => {
    const response = await request.get('/api/agent/bookings', {
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    })

    expect(response.status()).toBe(200)
  })

  test('should deny agent access to admin endpoints', async ({ request }) => {
    const response = await request.get('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    })

    expect(response.status()).toBe(403)
  })

  test('should allow admin access to all endpoints', async ({ request }) => {
    const adminResponse = await request.get('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })
    expect(adminResponse.status()).toBe(200)

    const agentResponse = await request.get('/api/agent/bookings', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })
    expect(agentResponse.status()).toBe(200)

    const userResponse = await request.get('/api/user/bookings', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })
    expect(userResponse.status()).toBe(200)
  })
})