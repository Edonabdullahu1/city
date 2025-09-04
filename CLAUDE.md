# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive travel agency web application designed for tour operators to sell city break packages. The application manages flight bookings (guaranteed block seats and dynamic flights via Google Flights API), hotel reservations, transfers, excursions, and provides role-based access for users, agents, and administrators.

## Technology Stack

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT tokens
- **Testing**: Playwright for E2E testing
- **External APIs**: SerpAPI (Google Flights), n8n (WhatsApp), Mailgun (Email)
- **MCP Servers**: PostgreSQL, Filesystem, GitHub, Puppeteer, Sequential Thinking, Memory

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (defaults to port 3000)
npm run dev

# Run E2E tests
npx playwright test

# Run specific test
npx playwright test tests/example.spec.ts

# Open Playwright UI
npx playwright test --ui
```

## Project Architecture

### Directory Structure
```
C:\git\city\
├── agents\              # Agent configuration files for multi-agent coordination
├── node_modules\        # NPM dependencies
├── tests\              # Playwright E2E test files
├── package.json        # Project dependencies and scripts
├── playwright.config.ts # Playwright test configuration
├── requirements.md     # Full project requirements (14 main requirements)
├── design.md          # System design and architecture documentation
├── claude_mcp_config.json # MCP server configuration
└── fix-mcp-config.ps1  # PowerShell script for Windows MCP configuration fixes
```

### Key Architectural Components

**Multi-Page Application (MPA) Architecture:**
- Server-side rendering with Next.js
- Separate file structures for desktop and mobile UI
- Device detection at middleware level

**Core Systems:**
1. **Authentication System**: Role-based access (user/agent/admin)
2. **Booking Management**: Soft booking with 3-hour holds, reservation codes (MXi-XXXX format)
3. **Flight Management**: Guaranteed block seats + dynamic SerpAPI integration
4. **Hotel Management**: Flexible occupancy, blackout dates, per-night pricing
5. **Document Generation**: PDFs for tickets, vouchers, confirmations
6. **Communication**: Multi-language email templates, WhatsApp via n8n

**Database Schema Highlights:**
- Sequential reservation codes (MXi-0001, MXi-0002, etc.)
- Service-specific booking numbers for flights, hotels, transfers, excursions
- User roles: user (default), agent, admin
- Booking statuses: soft, confirmed, paid, cancelled
- Multi-language support: English, Albanian, Macedonian

## Agent Dispatch Protocol

For complex, multi-domain tasks requiring specialized expertise, this project uses the Agent Organizer system found in the `/agents` directory.

When encountering tasks that involve:
- Multiple technology domains (frontend + backend + database)
- Complex architectural decisions
- Cross-functional requirements (code + testing + documentation)
- System-wide changes or major feature implementations

Consider using the Agent Organizer to assemble and coordinate specialized AI agents for optimal results. The `agents/agent-organizer.md` contains the master orchestration agent that can analyze requirements and recommend appropriate specialist agents.

## Testing Strategy

- **Unit Tests**: 70% - Service layer, utilities, API endpoints
- **Integration Tests**: 20% - API workflows, database transactions, external services
- **E2E Tests**: 10% - User workflows, role-based access, multi-device testing

Current test setup uses Playwright with configuration for Chrome, Firefox, and Safari testing.

## Security Considerations

- JWT tokens with secure httpOnly cookies
- Password hashing with bcrypt
- SQL injection prevention through parameterized queries
- CSRF protection for state-changing operations
- Input validation and sanitization
- API rate limiting
- Environment variable management for sensitive data

## MCP Server Integration

The project includes configuration for multiple MCP servers:
- **PostgreSQL**: Database operations and queries (see `setup-database.md` for installation)
- **Filesystem**: File system access within project directory
- **GitHub**: Repository integration
- **Puppeteer**: Browser automation for PDF generation
- **Sequential Thinking**: Complex reasoning tasks
- **Memory**: Context persistence across sessions

### MCP Configuration
- Local project configuration: `.mcp.json` (project-specific servers)
- All MCP packages are installed in `package.json`
- PostgreSQL connection: Update in `.mcp.json` after database setup
- Environment variables: Copy `.env.example` to `.env` and configure

### PostgreSQL Setup Required
Before using the PostgreSQL MCP server:
1. Install PostgreSQL (see `setup-database.md` for detailed instructions)
2. Create the `travel_agency_db` database
3. Update the connection string in `.mcp.json` with your credentials
4. Test connection: `npx @modelcontextprotocol/server-postgres "your-connection-string"`

## Important Implementation Notes

1. **Responsive Design**: Maintain separate desktop/mobile components in dedicated directories
2. **Reservation System**: Use atomic database operations for MXi-XXXX code generation
3. **Soft Bookings**: Implement automatic 3-hour expiration with cleanup jobs
4. **Payment Processing**: Wire transfer only - no online payment integration
5. **Modifications**: No self-service - all changes through agent intervention
6. **WhatsApp Integration**: Use n8n workflows for automated messaging
7. **Document Generation**: Use Puppeteer or PDFKit for voucher creation
8. **Multi-language**: Implement i18n for UI and document generation
9. **Flight Pricing Model**: 
   - The `pricePerSeat` field in the database represents the COMPLETE ROUND TRIP price per person
   - Example: €120 (stored as 12000 cents) = full return ticket price including both outbound and return flights
   - This price is duplicated in both flight records (outbound and return) for consistency
   - When calculating: use the price from ONE flight record only, not the sum of both
   - Children aged 2-11 pay full flight price, infants 0-1 fly free

## Next Steps for Implementation

Based on the requirements and design documents:
1. Set up Next.js project structure with TypeScript
2. Configure PostgreSQL database with Prisma
3. Implement authentication system with NextAuth.js
4. Create core booking management system
5. Integrate external APIs (SerpAPI, n8n, Mailgun)
6. Develop responsive UI with separate desktop/mobile components
7. Implement document generation system
8. Add comprehensive test coverage