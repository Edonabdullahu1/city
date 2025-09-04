# Design Document

## Overview

The Travel Agency Web Application is a comprehensive booking platform designed for tour operators to manage and sell city break packages. The system follows a multi-page application (MPA) architecture using Next.js with server-side rendering, ensuring optimal SEO and performance. The application supports three user roles (user, agent, admin) with distinct interfaces and capabilities, integrates with external APIs for flight data, and provides comprehensive booking management with document generation and multi-channel communication.

## Architecture

### High-Level Architecture

The application follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Desktop UI    │  │    Mobile UI    │                  │
│  │   (Separate     │  │   (Separate     │                  │
│  │    Files)       │  │    Files)       │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js)                    │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   REST APIs     │  │   Server        │                  │
│  │   (/api/*)      │  │   Actions       │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │    Services     │  │   Validators    │                  │
│  │   (Booking,     │  │   (Data         │                  │
│  │   Payment, etc) │  │   Validation)   │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Data Access Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Repositories  │  │   External      │                  │
│  │   (Database     │  │   API Clients   │                  │
│  │    Access)      │  │   (SerpAPI)     │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   PostgreSQL    │  │   External      │                  │
│  │   Database      │  │   Services      │                  │
│  │                 │  │   (n8n, Email)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Next.js API Routes with Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT tokens
- **Styling**: Tailwind CSS with responsive design
- **External APIs**: SerpAPI for Google Flights integration
- **Automation**: n8n for WhatsApp messaging workflows
- **Email**: Mailgun API with customizable templates
- **Document Generation**: PDFKit or Puppeteer for voucher generation
- **Internationalization**: next-i18next for multi-language support

### Responsive Design Strategy

The application implements a dual-file approach for responsive design:

```
src/
├── components/
│   ├── desktop/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── BookingForm.tsx
│   ├── mobile/
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   └── BookingForm.tsx
│   └── shared/
│       ├── Button.tsx
│       └── Modal.tsx
├── pages/
│   ├── desktop/
│   │   ├── dashboard.tsx
│   │   └── booking.tsx
│   └── mobile/
│       ├── dashboard.tsx
│       └── booking.tsx
```

Device detection occurs at the middleware level, routing users to appropriate component sets while maintaining shared business logic.

## Components and Interfaces

### Core Components

#### 1. Authentication System
- **UserAuthService**: Handles login, registration, and role-based access
- **RoleGuard**: Middleware component for protecting routes based on user roles
- **SessionManager**: Manages user sessions and token refresh

#### 2. Booking Management System
- **PackageBuilder**: Combines flights, hotels, and extras into packages
- **SoftBookingManager**: Handles 3-hour reservation holds
- **BookingProcessor**: Converts soft bookings to confirmed bookings
- **ReservationCodeGenerator**: Generates unique MXi-XXXX codes for each reservation
- **ServiceBookingManager**: Manages individual booking numbers for flights, hotels, transfers, and excursions
- **InventoryManager**: Tracks seat availability and hotel capacity

#### 3. Flight Management System
- **GuaranteedFlightService**: Manages pre-purchased block seats
- **DynamicFlightService**: Integrates with SerpAPI for real-time flight data
- **FlightSearchEngine**: Combines guaranteed and dynamic flight options

#### 4. Hotel Management System
- **HotelService**: Manages hotel inventory and availability
- **RoomConfigurationManager**: Handles flexible occupancy (single/double/triple)
- **BlackoutDateManager**: Manages hotel availability restrictions

#### 5. Document Generation System
- **VoucherGenerator**: Creates flight tickets, hotel vouchers, transfer vouchers
- **EmailTemplateEngine**: Manages multi-language email templates
- **DocumentDeliveryService**: Handles email distribution of documents

#### 6. Communication System
- **EmailService**: Sends transactional and marketing emails
- **WhatsAppIntegration**: Interfaces with n8n for WhatsApp messaging
- **NotificationManager**: Coordinates multi-channel communications

### API Interfaces

#### Authentication APIs
```typescript
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/session
```

#### Booking APIs
```typescript
POST /api/bookings/soft-book
PUT  /api/bookings/{id}/confirm
GET  /api/bookings/user/{userId}
PUT  /api/bookings/{id}/modify
DELETE /api/bookings/{id}/cancel
```

#### Inventory APIs
```typescript
GET  /api/flights/guaranteed
GET  /api/flights/dynamic/search
GET  /api/hotels/availability
GET  /api/transfers
GET  /api/excursions
```

#### Admin APIs
```typescript
POST /api/admin/flights
PUT  /api/admin/hotels/{id}
GET  /api/admin/reports/sales
POST /api/admin/users/create-agent
```

## Data Models

### Core Entities

#### User Entity
```typescript
interface User {
  id: string
  email: string
  password: string (hashed)
  firstName: string
  lastName: string
  phone: string
  role: 'user' | 'agent' | 'admin'
  language: 'en' | 'al' | 'mk'
  createdAt: Date
  updatedAt: Date
}
```

#### Booking Entity
```typescript
interface Booking {
  id: string
  reservationCode: string // Format: MXi-0001, MXi-0002, etc.
  userId: string
  agentId?: string
  status: 'soft' | 'confirmed' | 'paid' | 'cancelled'
  totalPrice: number
  currency: string
  expiresAt?: Date (for soft bookings)
  createdAt: Date
  updatedAt: Date
  
  // Related entities with service booking numbers
  flight: Flight & { bookingNumber?: string }
  hotel: Hotel & { bookingNumber?: string }
  transfers: (Transfer & { bookingNumber?: string })[]
  excursions: (Excursion & { bookingNumber?: string })[]
  passengers: Passenger[]
}
```

#### Flight Entity
```typescript
interface Flight {
  id: string
  type: 'guaranteed' | 'dynamic'
  flightNumber: string
  departureCity: string
  arrivalCity: string
  departureDate: Date
  arrivalDate: Date
  departureTime: string
  arrivalTime: string
  totalSeats?: number (for guaranteed flights)
  availableSeats?: number (for guaranteed flights)
  price: number
  currency: string
}
```

#### Hotel Entity
```typescript
interface Hotel {
  id: string
  name: string
  city: string
  description: string
  images: string[]
  pricePerNight: number
  currency: string
  maxOccupancy: number
  childrenPolicy: string
  blackoutDates: Date[]
  createdAt: Date
  updatedAt: Date
}
```

### Database Schema Design

The PostgreSQL database uses the following key relationships:

```sql
-- Core tables with relationships
Users (1) -> (N) Bookings
Agents (1) -> (N) Bookings (assigned)
Bookings (1) -> (1) Flights
Bookings (1) -> (1) Hotels
Bookings (1) -> (N) Transfers
Bookings (1) -> (N) Excursions
Bookings (1) -> (N) Passengers

-- Inventory management
Flights (1) -> (N) BookingFlights
Hotels (1) -> (N) BookingHotels

-- Communication tracking
Bookings (1) -> (N) EmailLogs
Bookings (1) -> (N) WhatsAppLogs

-- Reservation code sequence
ReservationSequence (tracks next available MXi number)
```

### Reservation Code and Service Booking System

#### Reservation Code Generation
- **Format**: MXi-XXXX (e.g., MXi-0001, MXi-0002)
- **Auto-increment**: Sequential numbering starting from MXi-0001
- **Uniqueness**: Database constraint ensures no duplicates
- **Generation**: Atomic operation using database sequence

#### Service Booking Numbers
Each service within a reservation has its own booking number:
- **Flight Booking Number**: Manually entered by agent/admin (e.g., airline confirmation code)
- **Hotel Booking Number**: Manually entered by agent/admin (e.g., hotel confirmation code)
- **Transfer Booking Number**: Manually entered by agent/admin (e.g., transfer company reference)
- **Excursion Booking Number**: Manually entered by agent/admin (e.g., tour operator reference)

#### Database Implementation
```sql
-- Reservation sequence table
CREATE TABLE reservation_sequence (
  id SERIAL PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0
);

-- Service booking numbers in related tables
ALTER TABLE booking_flights ADD COLUMN booking_number VARCHAR(100);
ALTER TABLE booking_hotels ADD COLUMN booking_number VARCHAR(100);
ALTER TABLE booking_transfers ADD COLUMN booking_number VARCHAR(100);
ALTER TABLE booking_excursions ADD COLUMN booking_number VARCHAR(100);
```

## Error Handling

### Error Classification

1. **Validation Errors**: Input validation failures, business rule violations
2. **Authentication Errors**: Login failures, unauthorized access attempts
3. **External API Errors**: SerpAPI failures, n8n communication issues
4. **Database Errors**: Connection failures, constraint violations
5. **Business Logic Errors**: Booking conflicts, inventory shortages

### Error Handling Strategy

```typescript
// Centralized error handling middleware
class ErrorHandler {
  static handle(error: Error, context: string) {
    // Log error with context
    logger.error(`${context}: ${error.message}`, error.stack)
    
    // Classify error type
    const errorType = this.classifyError(error)
    
    // Return appropriate response
    return this.formatErrorResponse(errorType, error)
  }
}

// API error responses
interface APIError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}
```

### Specific Error Scenarios

- **Soft Booking Expiration**: Automatic cleanup with user notification
- **Seat Availability Conflicts**: Real-time inventory checking with fallback options
- **Payment Processing Failures**: Clear instructions for wire transfer completion
- **External API Timeouts**: Graceful degradation with cached data when possible

## Testing Strategy

### Testing Pyramid

#### Unit Tests (70%)
- **Service Layer**: Business logic validation
- **Utility Functions**: Data transformation and validation
- **API Endpoints**: Request/response handling
- **Database Repositories**: Data access layer testing

#### Integration Tests (20%)
- **API Integration**: End-to-end API workflow testing
- **Database Integration**: Complex query and transaction testing
- **External Service Integration**: SerpAPI and n8n integration testing

#### End-to-End Tests (10%)
- **User Workflows**: Complete booking process testing
- **Role-based Access**: Permission and authorization testing
- **Multi-device Testing**: Desktop and mobile interface testing

### Testing Tools and Framework

```typescript
// Testing stack
- Jest: Unit and integration testing
- Supertest: API endpoint testing
- Playwright: End-to-end testing
- Testing Library: Component testing
- MSW: API mocking for tests

// Example test structure
describe('BookingService', () => {
  describe('createSoftBooking', () => {
    it('should create soft booking with 3-hour expiration', async () => {
      // Test implementation
    })
    
    it('should validate seat availability', async () => {
      // Test implementation
    })
  })
})
```

### Test Data Management

- **Database Seeding**: Consistent test data setup
- **Mock Services**: External API simulation
- **Test Isolation**: Each test runs with clean state
- **Performance Testing**: Load testing for booking scenarios

## Security Considerations

### Authentication and Authorization
- JWT tokens with secure httpOnly cookies
- Role-based access control (RBAC) implementation
- Session management with automatic expiration
- Password hashing using bcrypt with salt rounds

### Data Protection
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- XSS protection with Content Security Policy
- CSRF protection for state-changing operations

### API Security
- Rate limiting on all endpoints
- Request size limits
- API key management for external services
- Audit logging for sensitive operations

### Infrastructure Security
- Environment variable management
- Database connection encryption
- HTTPS enforcement
- Regular security dependency updates

This design provides a solid foundation for implementing the travel agency web application with all the specified requirements while maintaining scalability, security, and maintainability.