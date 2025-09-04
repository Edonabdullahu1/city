# MXi Travel Agency Platform

A comprehensive travel agency web application for managing city break packages, including flights, hotels, transfers, and excursions.

## Features

- **Multi-Role System**: User, Agent, and Admin roles with specific permissions
- **Booking Management**: Complete booking system with MXi-XXXX reservation codes
- **Flight Search**: Integration with SerpAPI for dynamic flight searches
- **Hotel Management**: Flexible room selection and pricing
- **Document Generation**: PDF tickets, vouchers, and confirmations
- **Communication**: Email notifications via Mailgun, WhatsApp via n8n
- **Admin Dashboard**: Comprehensive reporting and analytics
- **Agent Portal**: Performance tracking and commission management

## Tech Stack

- **Frontend**: Next.js 15.5.2, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with JWT
- **External Services**: SerpAPI, Mailgun, n8n

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/city.git
cd city
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb travel_agency_db

# Run migrations
npx prisma migrate dev
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run development server:
```bash
npm run dev
```

## Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/travel_agency_db

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Email Service
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain

# WhatsApp
N8N_WEBHOOK_URL=your-n8n-webhook

# Flight Search
SERPAPI_KEY=your-serpapi-key
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Manual Deployment

```bash
# Build production
npm run build

# Start production server
npm start
```

## Project Structure

```
C:\git\city\
├── app\              # Next.js app directory
│   ├── api\         # API routes
│   ├── admin\       # Admin pages
│   ├── agent\       # Agent pages
│   └── bookings\    # Booking flows
├── components\      # React components
├── lib\            # Utilities and services
│   ├── services\   # Business logic
│   └── auth.ts     # Auth configuration
├── prisma\         # Database schema
└── public\         # Static assets
```

## Key Features

### Booking System
- Sequential MXi-XXXX reservation codes
- 3-hour soft booking holds
- Multi-step booking wizard
- Real-time availability checking

### Admin Features
- Booking management with CRUD operations
- Advanced reporting and analytics
- Agent performance tracking
- Revenue and commission calculations

### Agent Features
- Personal dashboard
- Booking creation and management
- Commission tracking
- Performance statistics

### Customer Features
- Search and book packages
- View booking history
- Download documents
- Receive notifications

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/session` - Get current session

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/[code]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `GET /api/bookings/search` - Search bookings

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/bookings` - Manage all bookings
- `GET /api/admin/reports` - Generate reports

### Flights & Hotels
- `GET /api/flights/search` - Search flights
- `GET /api/hotels/search` - Search hotels

## Testing

```bash
# Run E2E tests
npx playwright test

# Run specific test
npx playwright test tests/booking.spec.ts

# Open test UI
npx playwright test --ui
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please use GitHub Issues or contact support@mxitravel.com