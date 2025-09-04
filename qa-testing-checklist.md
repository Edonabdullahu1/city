# QA Testing Checklist
## Travel Agency Application - Quick Reference

**Last Updated:** September 4, 2025  
**Version:** 1.0

---

## Pre-Testing Setup Checklist

### Environment Preparation
- [ ] Kill all existing Node.js processes
- [ ] Clear Next.js cache (`rm -rf .next`)
- [ ] Verify PostgreSQL is running on port 5432
- [ ] Check environment variables are correctly set
- [ ] Ensure NEXTAUTH_URL matches server port (3000)
- [ ] Start development server (`npm run dev`)
- [ ] Verify server responds to `curl http://localhost:3000`

### Test Infrastructure
- [ ] Test database is isolated from production
- [ ] Mock services are configured for external APIs
- [ ] Test user accounts exist (user, agent, admin roles)
- [ ] Playwright browsers are installed
- [ ] Mobile device emulators are available

---

## Daily Testing Workflow

### 1. Smoke Tests (5 minutes)
Run these tests daily to ensure basic functionality:

```bash
# Basic connectivity
npx playwright test tests/example.spec.ts

# Authentication flow
npx playwright test tests/auth.spec.ts --headed

# Core booking flow
npx playwright test tests/booking.spec.ts --headed --timeout 60000
```

**Expected Results:**
- [ ] Landing page loads within 3 seconds
- [ ] User can sign in successfully
- [ ] Basic booking flow completes without errors

### 2. Business Rules Validation (15 minutes)
Run weekly or after any pricing/booking logic changes:

```bash
# Business logic tests
npx playwright test tests/business-rules.spec.ts --headed

# Focus on critical areas
npx playwright test --grep "reservation code generation"
npx playwright test --grep "price calculation"
npx playwright test --grep "inventory management"
```

**Critical Validations:**
- [ ] MXi-XXXX codes generate sequentially
- [ ] Flight prices represent complete round-trip cost
- [ ] Children (2-11) pay full price, infants (0-1) fly free
- [ ] Hotel per-night calculations are accurate
- [ ] Inventory prevents overbooking

### 3. Mobile Testing (10 minutes)
Run before any UI changes:

```bash
# Mobile responsive tests
npx playwright test tests/mobile-responsive.spec.ts --project=mobile-chrome
npx playwright test tests/mobile-responsive.spec.ts --project=mobile-safari
npx playwright test tests/mobile-responsive.spec.ts --project=tablet
```

**Mobile Checklist:**
- [ ] Touch targets are minimum 44px
- [ ] Forms work with virtual keyboards
- [ ] Navigation adapts to screen size
- [ ] Booking flow completes on mobile devices

---

## Pre-Deployment Testing

### Full Test Suite Execution
Run complete test suite before any release:

```bash
# Run all tests across all browsers
npx playwright test --reporter=html

# Run specific critical areas
npx playwright test --grep "critical|booking|payment"

# Run mobile-specific tests
npx playwright test --project=mobile-chrome --project=mobile-safari
```

### Manual Testing Checklist

#### Authentication & User Management
- [ ] User registration with email verification
- [ ] Password reset flow works
- [ ] Role-based access (user/agent/admin) enforced
- [ ] Session timeout handling
- [ ] Unauthorized access blocked

#### Booking Flow End-to-End
- [ ] Flight search returns relevant results
- [ ] Hotel search filters work correctly
- [ ] Transfer options display properly
- [ ] Excursion selection functions
- [ ] Price calculations are accurate
- [ ] Reservation code generates (MXi-XXXX format)
- [ ] Booking confirmation email sent
- [ ] WhatsApp notification delivered (if configured)

#### Payment and Documentation
- [ ] Payment instructions display correctly
- [ ] Bank transfer details are accurate
- [ ] PDF vouchers generate successfully
- [ ] Booking confirmation downloads
- [ ] Modification requests work (agent role)
- [ ] Cancellation process functions

#### Admin Functions
- [ ] Hotel management (add/edit/pricing)
- [ ] Flight management (block seats)
- [ ] Transfer and excursion management
- [ ] User role management
- [ ] Report generation works
- [ ] Email template editing

---

## Error Scenario Testing

### Input Validation
- [ ] Invalid email formats rejected
- [ ] Weak passwords rejected
- [ ] Past travel dates prevented
- [ ] Invalid passenger data blocked
- [ ] File upload size limits enforced

### API Error Handling
- [ ] Flight search failures show user-friendly errors
- [ ] Hotel search timeouts handled gracefully
- [ ] Booking creation failures provide clear messages
- [ ] Payment verification errors are informative
- [ ] External service failures don't crash app

### Edge Cases
- [ ] Concurrent booking attempts handled
- [ ] Session expiration redirects properly
- [ ] Network connectivity issues managed
- [ ] Database transaction failures rollback cleanly
- [ ] Large file uploads handled appropriately

---

## Performance Testing

### Load Testing Checklist
- [ ] 10 concurrent users (normal load)
- [ ] 50 concurrent users (peak load)
- [ ] 100+ concurrent users (stress test)
- [ ] Database connection pool doesn't exhaust
- [ ] Response times within acceptable limits

### Performance Benchmarks
Test these critical operations:

| Operation | Target Time | Test Command |
|-----------|-------------|--------------|
| Page Load | < 3s | `curl -w "%{time_total}" http://localhost:3000` |
| Flight Search | < 5s | Manual test with browser dev tools |
| Booking Creation | < 10s | `npx playwright test --grep "booking creation"` |
| PDF Generation | < 15s | Test document download manually |

---

## Browser Compatibility

### Desktop Testing
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (if on Mac)
- [ ] Edge (Windows environments)

### Mobile Testing
- [ ] iOS Safari (iPhone 12/13/14)
- [ ] Android Chrome (Samsung Galaxy S21+)
- [ ] iPad Pro (tablet interface)

### Cross-Browser Test Command
```bash
# Run across all configured browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

---

## Security Testing

### Authentication Security
- [ ] Password brute force protection active
- [ ] Account lockout after failed attempts
- [ ] Session fixation prevention
- [ ] JWT token manipulation blocked

### Input Security
- [ ] SQL injection prevention tested
- [ ] XSS attack prevention verified
- [ ] File upload security validated
- [ ] Command injection blocked

### API Security
- [ ] Endpoint authorization enforced
- [ ] Rate limiting active
- [ ] CSRF protection enabled
- [ ] Sensitive data not exposed in errors

---

## Troubleshooting Common Issues

### Server Won't Start
```bash
# Kill existing processes
pkill -f node

# Clear cache
rm -rf .next node_modules/.cache

# Reinstall dependencies
npm install

# Start fresh
npm run dev
```

### Tests Timing Out
```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Run with headed browser for debugging
npx playwright test --headed --timeout 60000

# Run single test for debugging
npx playwright test tests/auth.spec.ts --headed --debug
```

### Database Connection Issues
```bash
# Check PostgreSQL status
netstat -an | grep 5432

# Reset database connections
npm run db:push

# Seed test data
npm run db:seed
```

### Mobile Tests Failing
```bash
# Update browser versions
npx playwright install

# Check device configurations
npx playwright test --list --project=mobile-chrome

# Run with debugging
npx playwright test tests/mobile-responsive.spec.ts --debug --project=mobile-chrome
```

---

## Quick Commands Reference

### Essential Test Commands
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run with UI
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test by name
npx playwright test --grep "should sign in with valid credentials"

# Generate test report
npx playwright test --reporter=html
```

### Development Commands
```bash
# Start development server
npm run dev

# Build application
npm run build

# Database commands
npm run db:push
npm run db:seed
npm run db:migrate

# Linting and formatting
npm run lint
```

---

## Success Indicators

### Green Light (Ready to Deploy)
- [ ] All smoke tests pass
- [ ] Core business logic validated
- [ ] Mobile experience functional
- [ ] Error handling graceful
- [ ] Performance within benchmarks
- [ ] Security tests pass

### Yellow Light (Proceed with Caution)
- [ ] Some non-critical tests fail
- [ ] Performance slightly below targets
- [ ] Minor UI inconsistencies
- [ ] Non-blocking error messages

### Red Light (DO NOT Deploy)
- [ ] Authentication failures
- [ ] Booking creation broken
- [ ] Payment flow non-functional
- [ ] Data integrity issues
- [ ] Security vulnerabilities
- [ ] Server performance problems

---

**Remember:** Always test locally before pushing changes, and run the full test suite before any production deployment.

**Emergency Contact:** Refer to `qa-comprehensive-report.md` for detailed analysis and `qa-implementation-roadmap.md` for long-term improvements.