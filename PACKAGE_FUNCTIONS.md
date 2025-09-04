# Package System Functions Overview

## 1. Core Purpose
The package system manages all-inclusive travel packages combining flights, hotels, and transfers for city break destinations.

## 2. Main Package Page Functions (`/packages/[slug]/page.tsx`)

### A. Data Fetching
```typescript
// Fetches package details from API
useEffect(() => {
  fetch(`/api/public/packages/${slug}`)
    .then(res => res.json())
    .then(data => setPackageData(data))
}, [slug])

// Fetches available flight blocks
useEffect(() => {
  fetch(`/api/public/flight-blocks?packageId=${packageData.id}`)
    .then(res => res.json())
    .then(data => setFlightBlocks(data))
}, [packageData.id])
```

### B. Price Calculation
```typescript
// Real-time price calculation based on selections
const priceResult = calculateRealTimePrice({
  adults: selectedOccupancy.adults,
  children: selectedOccupancy.children,
  childAges: childAges,
  flightBlock: selectedFlightBlock,
  hotel: selectedHotel,
  nights: nights,
  travelDate: departureDateForPricing
});
```

### C. User Selections Management
- **Occupancy Selection**: Adults and children counters
- **Flight Block Selection**: Choose departure/return dates
- **Hotel Selection**: Pick from available hotels
- **Child Age Management**: Specify ages for child pricing

### D. Booking Flow
```typescript
const handleBooking = () => {
  const bookingData = {
    packageId: packageData.id,
    adults: selectedOccupancy.adults,
    children: selectedOccupancy.children,
    childAges: childAges,
    flightBlockId: selectedFlightBlock.blockGroupId,
    hotelId: selectedHotel.id,
    totalPrice: selectedPrice.totalPrice
  };
  // Navigate to booking page with data
  router.push('/booking?data=' + encodeURIComponent(JSON.stringify(bookingData)));
};
```

## 3. API Endpoints

### A. Public Package Endpoint (`/api/public/packages/[slug]/route.ts`)
```typescript
GET /api/public/packages/[slug]
// Returns:
- Package details
- Available hotels with pricing
- Flight information
- Pre-calculated prices for different occupancies
```

### B. Flight Blocks Endpoint (`/api/public/flight-blocks/route.ts`)
```typescript
GET /api/public/flight-blocks?packageId=xxx
// Returns:
- Available flight blocks (date combinations)
- Pricing per seat
- Availability status
```

### C. Admin Package Management (`/api/admin/packages/route.ts`)
```typescript
POST /api/admin/packages    // Create new package
PUT /api/admin/packages/:id  // Update package
DELETE /api/admin/packages/:id // Delete package
GET /api/admin/packages      // List all packages
```

## 4. Pricing Logic Functions

### A. Child Pricing Rules
```typescript
// Flight pricing for children
if (age <= 1) {
  // Infants (0-1): Free flight
} else if (age >= 2 && age <= 11) {
  // Children (2-11): Full flight price
}

// Hotel pricing for children
if (age <= 1) {
  // Infants (0-1): Free accommodation
} else if (age >= 2 && age <= 6) {
  // First child 2-6: Free at hotel
  // Additional children 2-6: Pay child rate
} else if (age >= 7 && age <= 11) {
  // Children 7-11: Pay child rate
}
```

### B. Room Allocation Logic
```typescript
if (adults === 1) {
  // Single room
  hotelPrice = hotelPriceData.single * nights;
} else if (adults === 2) {
  // Double room
  hotelPrice = hotelPriceData.double * nights;
} else if (adults === 3) {
  // Double + extra bed
  hotelPrice = (hotelPriceData.double + hotelPriceData.extraBed) * nights;
} else if (adults === 4) {
  // Two double rooms or family room
  hotelPrice = (hotelPriceData.double * 2) * nights;
}
```

## 5. Display Components

### A. Package Header
- Package name and location
- Duration and featured status
- Hero image

### B. Date Selection
- Flight blocks with outbound/return dates
- Price per block
- Visual selection indicator

### C. Hotel Selection
- Hotel cards with images
- Star ratings
- Price per hotel option
- Room type and board basis

### D. Price Breakdown
- Flight cost
- Hotel cost (per night × nights)
- Transfer cost (if applicable)
- Total package price

### E. Booking Summary
- Selected dates
- Selected hotel
- Occupancy details
- Final price
- "Book Now" action

## 6. Key Features

1. **Dynamic Pricing**: Prices update in real-time based on selections
2. **Multi-Hotel Options**: Choose from different hotels
3. **Flexible Dates**: Multiple departure date options
4. **Child-Friendly**: Age-based pricing for children
5. **Transparent Pricing**: Clear breakdown of all costs
6. **Availability Checking**: Shows only available options
7. **Responsive Design**: Works on desktop and mobile
8. **Multi-language Support**: Prepared for internationalization

## 7. Database Schema

### Package Table
```sql
- id (Primary Key)
- name
- slug (URL-friendly)
- description
- duration
- basePrice
- featured
- active
- cityId (Foreign Key)
- defaultHotelId (Foreign Key)
- departureFlightId (Foreign Key)
- returnFlightId (Foreign Key)
```

### PackagePrice Table
```sql
- id (Primary Key)
- packageId (Foreign Key)
- adults
- children
- flightPrice
- hotelPrice
- transferPrice
- totalPrice
- hotelName
- flightBlockId
```

### Flight Table
```sql
- id (Primary Key)
- flightNumber
- pricePerSeat (in cents)
- departureTime
- arrivalTime
- blockGroupId
```

### Hotel Table
```sql
- id (Primary Key)
- name
- rating
- cityId (Foreign Key)
- primaryImage
```

### HotelPrice Table
```sql
- id (Primary Key)
- hotelId (Foreign Key)
- single (price)
- double (price)
- extraBed (price)
- paymentKids (child price)
- board (BB/HB/FB/AI)
- fromDate
- tillDate
```

## 8. Business Logic

1. **Soft Booking**: 3-hour hold before payment required
2. **Reservation Codes**: Format MXi-XXXX (sequential)
3. **Payment**: Wire transfer only
4. **Modifications**: Through agent only (no self-service)
5. **Confirmation**: Email and WhatsApp notifications
6. **Documents**: PDF generation for tickets/vouchers

## 9. Integration Points

- **SerpAPI**: Dynamic flight search (future)
- **Mailgun**: Email notifications
- **n8n**: WhatsApp messaging
- **Puppeteer**: PDF generation
- **NextAuth**: Authentication
- **Prisma**: Database ORM

This package system provides a complete solution for selling city break travel packages with transparent pricing and flexible options.