import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 30000,
  expect: {
    timeout: 10000
  },

  projects: [
    // Desktop testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/*.spec.ts', '!**/mobile-responsive.spec.ts']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile-responsive.spec.ts', '**/auth.spec.ts', '**/booking.spec.ts']
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: ['**/mobile-responsive.spec.ts', '**/auth.spec.ts', '**/booking.spec.ts']
    },
    
    // Tablet testing
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: ['**/mobile-responsive.spec.ts', '**/booking.spec.ts']
    },
    
    // Business rules testing (desktop only)
    {
      name: 'business-rules',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/business-rules.spec.ts']
    },
    
    // Error handling testing (desktop only)
    {
      name: 'error-handling',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/error-handling.spec.ts']
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});