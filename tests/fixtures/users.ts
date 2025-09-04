export interface TestUser {
  id?: string
  name: string
  email: string
  password: string
  role: 'user' | 'agent' | 'admin'
  createdAt?: Date
  isActive?: boolean
}

export const testUsers: TestUser[] = [
  // Regular Users
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  },

  // Agents
  {
    name: 'Alice Agent',
    email: 'alice.agent@example.com',
    password: 'password123',
    role: 'agent',
    isActive: true
  },
  {
    name: 'Mike Agent',
    email: 'mike.agent@example.com',
    password: 'password123',
    role: 'agent',
    isActive: true
  },

  // Admins
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    isActive: true
  },
  {
    name: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'password123',
    role: 'admin',
    isActive: true
  },

  // Inactive/Test Users
  {
    name: 'Inactive User',
    email: 'inactive@example.com',
    password: 'password123',
    role: 'user',
    isActive: false
  }
]

// Default users for specific test scenarios
export const defaultUsers = {
  regularUser: testUsers.find(u => u.email === 'john.doe@example.com')!,
  agent: testUsers.find(u => u.email === 'alice.agent@example.com')!,
  admin: testUsers.find(u => u.email === 'admin@example.com')!,
  inactiveUser: testUsers.find(u => u.email === 'inactive@example.com')!
}

// User factory functions
export class UserFactory {
  private static counter = 0

  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    this.counter++
    const timestamp = Date.now()
    
    return {
      name: `Test User ${this.counter}`,
      email: `testuser${timestamp}${this.counter}@example.com`,
      password: 'TestPassword123!',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      ...overrides
    }
  }

  static createAgent(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'agent',
      name: `Agent ${this.counter}`,
      ...overrides
    })
  }

  static createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'admin',
      name: `Admin ${this.counter}`,
      ...overrides
    })
  }

  static createMultipleUsers(count: number, role: 'user' | 'agent' | 'admin' = 'user'): TestUser[] {
    return Array.from({ length: count }, () => {
      switch (role) {
        case 'agent':
          return this.createAgent()
        case 'admin':
          return this.createAdmin()
        default:
          return this.createUser()
      }
    })
  }

  static reset() {
    this.counter = 0
  }
}

// User credentials for authentication
export const userCredentials = {
  validUser: {
    email: 'john.doe@example.com',
    password: 'password123'
  },
  validAgent: {
    email: 'alice.agent@example.com',
    password: 'password123'
  },
  validAdmin: {
    email: 'admin@example.com',
    password: 'password123'
  },
  invalidUser: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  }
}

// User permissions mapping
export const userPermissions = {
  user: [
    'view_own_bookings',
    'create_booking',
    'modify_own_booking',
    'cancel_own_booking',
    'view_own_profile',
    'update_own_profile'
  ],
  agent: [
    'view_own_bookings',
    'create_booking',
    'modify_own_booking',
    'cancel_own_booking',
    'view_own_profile',
    'update_own_profile',
    'view_customer_bookings',
    'create_customer_booking',
    'modify_customer_booking',
    'cancel_customer_booking',
    'view_agent_dashboard',
    'contact_customers',
    'generate_reports'
  ],
  admin: [
    'view_own_bookings',
    'create_booking',
    'modify_own_booking',
    'cancel_own_booking',
    'view_own_profile',
    'update_own_profile',
    'view_customer_bookings',
    'create_customer_booking',
    'modify_customer_booking',
    'cancel_customer_booking',
    'view_agent_dashboard',
    'contact_customers',
    'generate_reports',
    'view_all_bookings',
    'modify_any_booking',
    'cancel_any_booking',
    'refund_bookings',
    'view_admin_dashboard',
    'manage_users',
    'manage_agents',
    'system_settings',
    'view_analytics',
    'manage_packages',
    'manage_destinations'
  ]
}

export function getUserPermissions(role: 'user' | 'agent' | 'admin'): string[] {
  return userPermissions[role] || []
}

export function hasPermission(userRole: 'user' | 'agent' | 'admin', permission: string): boolean {
  return getUserPermissions(userRole).includes(permission)
}

// Mock user data for API responses
export const mockUserResponses = {
  loginSuccess: (user: TestUser) => ({
    user: {
      id: user.id || '1',
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    },
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }),
  
  loginError: {
    error: 'Invalid credentials',
    code: 'INVALID_CREDENTIALS'
  },
  
  registrationSuccess: (user: TestUser) => ({
    user: {
      id: Date.now().toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    message: 'User registered successfully'
  }),
  
  registrationError: {
    error: 'Email already exists',
    code: 'EMAIL_EXISTS'
  }
}

// Password validation patterns
export const passwordValidation = {
  valid: [
    'Password123!',
    'MySecureP@ss',
    'Test123456!',
    'ComplexPassword1@'
  ],
  invalid: [
    'password', // No uppercase, numbers, or symbols
    '12345678', // Only numbers
    'PASSWORD', // Only uppercase
    'Pass123', // Too short
    'password123' // No symbols or uppercase
  ]
}

// Email validation patterns
export const emailValidation = {
  valid: [
    'user@example.com',
    'test.email@domain.co.uk',
    'user+tag@example.org',
    'user123@test-domain.com'
  ],
  invalid: [
    'invalid-email',
    'user@',
    '@domain.com',
    'user..email@domain.com',
    'user@domain',
    'user space@domain.com'
  ]
}