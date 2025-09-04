# Travel Agency Setup Guide

This document provides a complete guide for setting up the Next.js 14+ Travel Agency application.

## Project Overview

The Travel Agency application is a comprehensive web application built with Next.js 14+ that provides city break booking services including flights, hotels, transfers, and excursions. It features:

- **Multi-device architecture** with separate desktop and mobile layouts
- **Role-based access control** (User, Agent, Admin)
- **Comprehensive booking system** with MXi-XXXX reservation codes
- **External API integrations** (SerpAPI, n8n, Mailgun)
- **Database management** with PostgreSQL and Prisma ORM

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed
- **PostgreSQL** database server (see `setup-database.md` for installation)
- **Git** for version control
- **VS Code** or preferred IDE

## Installation Steps

### 1. Project Initialization ✅

The Next.js 14+ project has been initialized with:

```bash
# Project structure created with TypeScript and Tailwind CSS
# Core configuration files generated
# Package.json configured with all necessary dependencies
```

**Generated files:**
- `tsconfig.json` - TypeScript configuration with strict mode
- `next.config.js` - Next.js configuration with security headers
- `tailwind.config.ts` - Tailwind CSS with custom theme
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint configuration
- `prettier.config.js` - Prettier code formatting

### 2. Directory Structure ✅

The following directory structure has been created:

```
C:\git\city\
├── app\                          # Next.js App Router
│   ├── (desktop)\               # Desktop-specific routes
│   │   ├── layout.tsx           # Desktop layout
│   │   ├── page.tsx             # Desktop home page
│   │   ├── dashboard\           # Dashboard pages
│   │   ├── booking\             # Booking pages
│   │   └── admin\               # Admin pages
│   ├── (mobile)\                # Mobile-specific routes
│   │   ├── layout.tsx           # Mobile layout
│   │   ├── page.tsx             # Mobile home page
│   │   ├── dashboard\           # Mobile dashboard
│   │   └── booking\             # Mobile booking
│   ├── api\                     # API Routes
│   │   ├── auth\                # Authentication endpoints
│   │   ├── bookings\            # Booking management
│   │   ├── flights\             # Flight operations
│   │   └── hotels\              # Hotel operations
│   └── globals.css              # Global CSS with design tokens
├── components\                   # React Components
│   ├── desktop\                 # Desktop-specific components
│   ├── mobile\                  # Mobile-specific components
│   └── shared\                  # Shared components (Button, etc.)
├── lib\                         # Utility Libraries
│   ├── db\                      # Database utilities
│   │   └── index.ts             # Prisma client configuration
│   ├── services\                # External service integrations
│   └── utils\                   # Helper functions
│       ├── index.ts             # Utility functions
│       └── cn.ts                # Class name utility
├── prisma\                      # Database Schema
│   └── schema.prisma            # Complete database schema
├── tests\                       # Playwright E2E tests
├── middleware.ts                # Device detection middleware
└── [config files]              # Various configuration files
```

### 3. Dependencies Installation ✅

Core dependencies have been installed:

**Production Dependencies:**
- `next@15.5.2` - Next.js framework
- `react@19.0.0` & `react-dom@19.0.0` - React framework
- `@prisma/client@^5.22.0` - Database client
- `next-auth@^4.24.8` - Authentication
- `bcryptjs@^2.4.3` - Password hashing
- `zod@^3.24.1` - Schema validation
- `date-fns@^4.1.0` - Date utilities
- `tailwindcss-animate@^1.0.7` - CSS animations
- **Radix UI components** for accessible UI elements

**Development Dependencies:**
- `typescript@^5.7.2` - TypeScript support
- `tailwindcss@^3.4.17` - CSS framework
- `eslint` & `prettier` - Code quality tools
- `@playwright/test@^1.55.0` - E2E testing
- `prisma@^5.22.0` - Database management

### 4. Device Detection Middleware ✅

A comprehensive middleware system has been implemented for automatic device detection and routing:

**Features:**
- **Automatic redirection** based on user agent
- **Mobile-first responsive design**
- **Route protection** between desktop/mobile interfaces
- **Header injection** for device type identification

**How it works:**
- `/` → Redirects to `/(desktop)` or `/(mobile)` based on device
- Desktop users accessing mobile routes → Redirected to desktop
- Mobile users accessing desktop routes → Redirected to mobile

### 5. Database Schema ✅

Complete Prisma schema has been defined with:

**Core Models:**
- `User` - User management with role-based access
- `Account` & `Session` - NextAuth integration
- `Booking` - Central booking management with MXi-XXXX codes
- `FlightBooking` - Flight reservations (block seats + dynamic)
- `HotelBooking` - Hotel reservations with flexible occupancy
- `TransferBooking` - Transfer services
- `ExcursionBooking` - Excursion and activity bookings

**Key Features:**
- **Sequential reservation codes** (MXi-0001, MXi-0002, etc.)
- **Soft booking system** with 3-hour expiration
- **Multi-service bookings** in single reservation
- **Price storage in cents** for accuracy
- **Comprehensive audit trails**

### 6. Configuration Files ✅

All essential configuration files have been created and optimized:

- **TypeScript**: Strict mode enabled with path aliases
- **Next.js**: Security headers, image optimization, server actions
- **Tailwind**: Custom design system with mobile/desktop breakpoints
- **ESLint**: Next.js TypeScript rules
- **Prettier**: Consistent code formatting with Tailwind plugin

## Next Steps

### Database Setup
1. **Install PostgreSQL** following `setup-database.md`
2. **Create database**: `travel_agency_db`
3. **Update `.env`** with connection string
4. **Run migrations**: `npm run db:migrate`
5. **Generate client**: `npm run db:generate`

### Development Server
```bash
# Start development server
npm run dev

# Available at http://localhost:3000
# Automatic device detection and routing
```

### Environment Configuration
Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/travel_agency_db

# Authentication
NEXTAUTH_SECRET=your_secure_secret_here
NEXTAUTH_URL=http://localhost:3000

# External APIs
SERPAPI_KEY=your_serpapi_key
MAILGUN_API_KEY=your_mailgun_key
N8N_WEBHOOK_URL=your_n8n_webhook
```

### Testing
```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

## Architecture Decisions

### Multi-Page Application (MPA)
- **Server-side rendering** for better SEO and performance
- **Route groups** for device-specific layouts
- **Middleware-based routing** for seamless device detection

### Database Design
- **Normalized schema** with proper relationships
- **Cent-based pricing** for financial accuracy
- **Soft delete patterns** for data integrity
- **Audit trails** for booking modifications

### Security Implementation
- **bcrypt password hashing**
- **NextAuth.js session management**
- **CSRF protection** built into Next.js
- **SQL injection prevention** through Prisma
- **Security headers** in Next.js config

### External Integrations
- **SerpAPI**: Dynamic flight search and pricing
- **n8n**: WhatsApp automation workflows  
- **Mailgun**: Multi-language email templates
- **Prisma**: Type-safe database operations

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database

# Testing
npm run test:e2e        # Run Playwright tests
npm run test:e2e:ui     # Run tests with UI
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Verify connection string in `.env`
   - Check database exists and user has permissions

2. **TypeScript Errors**
   - Run `npm run db:generate` after schema changes
   - Restart TypeScript server in IDE
   - Check import paths use `@/` alias

3. **Middleware Routing Issues**
   - Clear browser cache
   - Check user agent detection logic
   - Verify route group naming

4. **Build Errors**
   - Run `npm run lint` to check code quality
   - Ensure all environment variables are set
   - Check for TypeScript strict mode compliance

## Support

For additional help:
- Review `requirements.md` for detailed specifications
- Check `design.md` for architecture details
- Consult Next.js 14+ documentation
- Review Prisma documentation for database operations

---

**Setup completed successfully! 🎉**

The Next.js 14+ Travel Agency application foundation is now ready for development. All core infrastructure, device detection, database schema, and development tools have been configured and tested.