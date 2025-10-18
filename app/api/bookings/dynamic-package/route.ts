import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, ValidationError } from '@/lib/utils/errorHandler';
import { z } from 'zod';
import { BookingService } from '@/lib/services/bookingService';
import { sendWelcomeEmail, sendConfirmationEmail } from '@/lib/email';
import { bookingRateLimit, withRateLimit } from '@/lib/middleware/rateLimiter';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { kiwiService } from '@/lib/services/kiwiService';

/**
 * Dynamic Package Booking API
 *
 * Creates bookings for packages built from:
 * - Kiwi.com round-trip flight combos
 * - Selected hotels in destination city
 * - Custom passenger configuration
 */

const dynamicPackageSchema = z.object({
  // Kiwi.com booking token (REQUIRED for flight booking)
  bookingToken: z.string().min(1, 'Booking token is required'),

  // Flight data
  outboundFlight: z.object({
    airline: z.string(),
    flightNumber: z.string(),
    origin: z.string(),
    destination: z.string(),
    departureTime: z.string(),
    arrivalTime: z.string(),
    duration: z.string()
  }),
  returnFlight: z.object({
    airline: z.string(),
    flightNumber: z.string(),
    origin: z.string(),
    destination: z.string(),
    departureTime: z.string(),
    arrivalTime: z.string(),
    duration: z.string()
  }),
  flightPrice: z.number().min(0),

  // Hotel data
  hotelId: z.string(),
  checkIn: z.string(), // ISO date string
  checkOut: z.string(), // ISO date string

  // Travelers
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(6),
  childAges: z.array(z.number().min(0).max(11)).optional().default([]),

  // Customer info
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    password: z.union([z.string().min(6), z.literal('')]).optional()
  }),

  // Passenger details (for Kiwi.com booking)
  passengers: z.array(z.object({
    title: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(), // ISO date string
    passportNumber: z.string().optional(), // Optional at booking stage
    passportExpiry: z.string().optional(), // Optional at booking stage
    category: z.enum(['adult', 'child', 'infant'])
  })),

  // Pricing
  totalPrice: z.number().min(0)
});

const dynamicPackageHandler = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate input
  const validatedInput = dynamicPackageSchema.safeParse(body);
  if (!validatedInput.success) {
    console.error('[DYNAMIC PACKAGE] Validation failed:', JSON.stringify(validatedInput.error.flatten(), null, 2));
    console.error('[DYNAMIC PACKAGE] Received body:', JSON.stringify(body, null, 2));
    throw new ValidationError('Invalid dynamic package data', validatedInput.error.flatten().fieldErrors);
  }

  const {
    bookingToken,
    outboundFlight,
    returnFlight,
    flightPrice,
    hotelId,
    checkIn,
    checkOut,
    adults,
    children,
    childAges,
    customer,
    passengers,
    totalPrice
  } = validatedInput.data;

  console.log(`[DYNAMIC PACKAGE] Processing booking for ${customer.email}`);
  console.log(`[DYNAMIC PACKAGE] Flights: ${outboundFlight.flightNumber}/${returnFlight.flightNumber}`);
  console.log(`[DYNAMIC PACKAGE] Travelers: ${adults} adults, ${children} children`);

  // STEP 1: Skip Kiwi.com booking for now - create SOFT booking instead
  console.log('[DYNAMIC PACKAGE] Skipping Kiwi.com flight booking - creating SOFT booking');

  // STEP 2: Create/Find User
  let userId: string;
  const customerEmail = customer.email;
  const customerPhone = customer.phone;
  const customerName = `${customer.firstName} ${customer.lastName}`;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: customerEmail }
    });

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[DYNAMIC PACKAGE] Using existing user: ${customerEmail} (ID: ${existingUser.id})`);
    } else {
      const hashedPassword = customer.password
        ? await bcrypt.hash(customer.password, 10)
        : '';

      const newUser = await prisma.user.create({
        data: {
          email: customerEmail,
          firstName: customer.firstName,
          lastName: customer.lastName,
          password: hashedPassword,
          phone: customerPhone || null,
          role: 'USER'
        }
      });
      userId = newUser.id;
      console.log(`[DYNAMIC PACKAGE] Created new user: ${newUser.email} (ID: ${newUser.id})`);

      // Send welcome email (non-blocking)
      sendWelcomeEmail({
        to: newUser.email,
        customerName: `${newUser.firstName} ${newUser.lastName}`,
        customerEmail: newUser.email,
      }).catch(err => console.error('[EMAIL] Welcome email failed:', err));
    }
  } catch (error) {
    console.error('[DYNAMIC PACKAGE] User creation failed:', error);
    throw new Error('Failed to create user account');
  }

  // STEP 3: Get hotel details
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: { city: true }
  });

  if (!hotel) {
    throw new Error('Hotel not found');
  }

  // Calculate dates and pricing
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate flight cost (prices from frontend are in EUROS)
  const flightPricePerPerson = flightPrice;
  let totalFlightCost = flightPricePerPerson * adults;

  // Add children flight costs (ages 2-11 pay full, 0-1 free)
  for (let i = 0; i < children && i < childAges.length; i++) {
    const age = childAges[i];
    if (age >= 2 && age <= 11) {
      totalFlightCost += flightPricePerPerson;
    }
  }

  // Hotel cost is total - flight cost
  const totalHotelCost = totalPrice - totalFlightCost;
  const pricePerNight = nights > 0 ? Math.round(totalHotelCost / nights) : 0;

  // Convert all prices from EUROS to CENTS for database storage
  const totalFlightCostCents = Math.round(totalFlightCost * 100);
  const totalHotelCostCents = Math.round(totalHotelCost * 100);
  const pricePerNightCents = Math.round(pricePerNight * 100);
  const totalPriceCents = Math.round(totalPrice * 100);

  // STEP 4: Create booking in database with Kiwi.com confirmation
  const flightBookings = [
    {
      flightNumber: outboundFlight.flightNumber,
      origin: outboundFlight.origin,
      destination: outboundFlight.destination,
      departureDate: new Date(outboundFlight.departureTime),
      arrivalDate: new Date(outboundFlight.arrivalTime),
      passengers: adults + children,
      class: 'Economy',
      price: Math.round(totalFlightCostCents / 2) // In cents, split between outbound and return
    },
    {
      flightNumber: returnFlight.flightNumber,
      origin: returnFlight.origin,
      destination: returnFlight.destination,
      departureDate: new Date(returnFlight.departureTime),
      arrivalDate: new Date(returnFlight.arrivalTime),
      passengers: adults + children,
      class: 'Economy',
      price: Math.round(totalFlightCostCents / 2) // In cents, split between outbound and return
    }
  ];

  const hotelBookings = [
    {
      hotelId: hotel.id,
      hotelName: hotel.name, // FIX: Add hotel name
      location: hotel.address || hotel.city?.name || '', // FIX: Add hotel location
      roomType: 'Standard',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      occupancy: adults + children,
      nights: nights,
      pricePerNight: pricePerNightCents, // In cents
      totalPrice: totalHotelCostCents // In cents
    }
  ];

  // Prepare passenger details for database
  const adultsData = passengers.filter(p => p.category === 'adult').map((p, idx) => ({
    title: p.title,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    passportNumber: p.passportNumber,
    email: idx === 0 ? customerEmail : ''
  }));

  const childrenData = passengers.filter(p => p.category === 'child').map(p => ({
    title: p.title,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    passportNumber: p.passportNumber
  }));

  const infantsData = passengers.filter(p => p.category === 'infant').map(p => ({
    title: p.title,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    passportNumber: p.passportNumber
  }));

  const passengerDetails = {
    adults: adultsData,
    children: childrenData,
    infants: infantsData
  };

  // Create SOFT booking (flight not yet booked with Kiwi.com)
  const booking = await BookingService.createSoftBooking({
    userId,
    packageId: null,
    selectedHotelId: hotel.id,
    flightBookings,
    hotelBookings,
    adults,
    children,
    infants: infantsData.length,
    totalAmount: totalPriceCents, // FIX: Use cents instead of euros
    currency: 'EUR',
    customerName,
    customerEmail,
    customerPhone,
    checkInDate,
    checkOutDate,
    passengerDetails,
    notes: `Kiwi.com Dynamic Package - Pending Flight Confirmation\nBooking Token: ${bookingToken}\nOutbound: ${outboundFlight.flightNumber} (${outboundFlight.origin} → ${outboundFlight.destination})\nReturn: ${returnFlight.flightNumber} (${returnFlight.origin} → ${returnFlight.destination})\nTotal Passengers: ${adults + children}\nFlight Price (per person): €${flightPricePerPerson}\nTotal Flight Cost: €${totalFlightCost}\nTotal Package Price: €${totalPrice}` // FIX: Add complete notes with booking token
  });

  console.log(`[DYNAMIC PACKAGE] Created SOFT booking ${booking.reservationCode} for ${customerEmail}`);

  // Send confirmation email (non-blocking)
  sendConfirmationEmail({
    to: customerEmail,
    bookingCode: booking.reservationCode,
    customerName: customerName,
    checkInDate: checkInDate.toISOString(),
    checkOutDate: checkOutDate.toISOString(),
    destination: hotel.city?.name || outboundFlight.destination,
    totalAmount: totalPrice,
  }).catch(err => console.error('[EMAIL] Confirmation email failed:', err));

  // Return success with booking code for redirect
  return NextResponse.json(
    {
      success: true,
      message: 'Booking created successfully - Awaiting flight confirmation',
      bookingCode: booking.reservationCode,
      status: 'soft',
      expiresAt: booking.expiresAt
    },
    { status: 201 }
  );
});

// Apply rate limiting: Max 3 booking attempts per 5 minutes
export const POST = withRateLimit(bookingRateLimit, dynamicPackageHandler);
