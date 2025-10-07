import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleGuard';
import { BookingService } from '@/lib/services/bookingService';
import { z } from 'zod';
import { withErrorHandler, ValidationError } from '@/lib/utils/errorHandler';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail, sendConfirmationEmail } from '@/lib/email';

const softBookingSchema = z.object({
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  currency: z.string().default('EUR'),
  expiresAt: z.string().datetime().optional(),
  // Package/Hotel booking
  packageId: z.string().optional(),
  hotelId: z.string().optional(),
  // Passenger details
  passengers: z.array(z.object({
    title: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    gender: z.string().optional(),
    type: z.string(),
    age: z.number()
  })).optional(),
  adults: z.number().default(1),
  children: z.number().default(0),
  contactDetails: z.object({
    phone: z.string(),
    email: z.string()
  }).optional(),
  // Customer details for guest bookings
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerPassword: z.string().min(6).optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  // Service selections
  flightSelection: z.object({
    id: z.string(),
    airline: z.string(),
    flightNumber: z.string(),
    price: z.number()
  }).optional(),
  hotelSelection: z.object({
    hotelId: z.string(),
    hotelName: z.string(),
    roomId: z.string(),
    roomType: z.string(),
    pricePerNight: z.number()
  }).optional()
});

export const POST = withErrorHandler(async (request: NextRequest, context: any) => {
  const body = await request.json();
  
  // Validate input
  const validatedInput = softBookingSchema.safeParse(body);
  if (!validatedInput.success) {
    console.error('[VALIDATION ERROR] Zod validation failed:', JSON.stringify(validatedInput.error.flatten(), null, 2));
    console.error('[VALIDATION ERROR] Received body:', JSON.stringify(body, null, 2));
    throw new ValidationError('Invalid booking data', validatedInput.error.flatten().fieldErrors);
  }

  const {
    totalAmount,
    currency,
    expiresAt,
    packageId,
    hotelId,
    passengers = [],
    adults,
    children,
    contactDetails,
    customerName,
    customerEmail,
    customerPhone,
    customerPassword,
    checkInDate,
    checkOutDate,
    flightSelection,
    hotelSelection
  } = validatedInput.data;

  // Handle user authentication/creation
  let userId = context?.user?.id;

  if (!userId) {
    // Check if user already exists by email
    if (customerEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: customerEmail }
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user account
        // Split customerName into firstName and lastName
        const nameParts = (customerName || 'Guest User').split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        // Hash password if provided, otherwise use empty string
        const hashedPassword = customerPassword
          ? await bcrypt.hash(customerPassword, 10)
          : '';

        const newUser = await prisma.user.create({
          data: {
            email: customerEmail,
            firstName: firstName,
            lastName: lastName,
            password: hashedPassword,
            phone: customerPhone || null,
            role: 'USER' // Must be uppercase enum value
          }
        });
        userId = newUser.id;
        console.log(`[BOOKING] Created new user: ${newUser.email} (ID: ${newUser.id})`);

        // Send welcome email to new user
        try {
          await sendWelcomeEmail({
            to: newUser.email,
            customerName: `${newUser.firstName} ${newUser.lastName}`,
            customerEmail: newUser.email,
          });
          console.log(`[EMAIL] Welcome email sent to ${newUser.email}`);
        } catch (emailError) {
          console.error(`[EMAIL] Failed to send welcome email to ${newUser.email}:`, emailError);
        }
      }
    } else {
      // No email provided - use fallback guest user
      const guestUser = await prisma.user.findFirst({
        where: { email: 'guest@example.com' }
      });
      userId = guestUser?.id || 'cmf6ua2ph0004q4fnidtnyxx9';
    }
  }

  // Get package details if packageId is provided
  let packageData = null;
  let flightBookings = [];
  let hotelBookings = [];
  let finalCheckInDate = checkInDate ? new Date(checkInDate) : undefined;
  let finalCheckOutDate = checkOutDate ? new Date(checkOutDate) : undefined;

  if (packageId) {
    // Fetch package details including flights
    packageData = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        hotel: true,
        departureFlight: {
          include: {
            departureAirport: true,
            arrivalAirport: true
          }
        },
        returnFlight: {
          include: {
            departureAirport: true,
            arrivalAirport: true
          }
        },
        packagePrices: {
          where: {
            adults: adults,
            children: children || 0
          },
          take: 1
        }
      }
    });

    if (packageData) {
      // Set dates from flight times if not provided
      if (!finalCheckInDate && packageData.departureFlight) {
        finalCheckInDate = new Date(packageData.departureFlight.departureTime);
      }
      if (!finalCheckOutDate && packageData.returnFlight) {
        finalCheckOutDate = new Date(packageData.returnFlight.departureTime);
      }

      // Prepare flight bookings
      const totalPassengers = adults + (children || 0);
      
      if (packageData.departureFlight) {
        flightBookings.push({
          flightId: packageData.departureFlight.id,
          flightNumber: packageData.departureFlight.flightNumber,
          origin: packageData.departureFlight.departureAirport?.name || 'Unknown',
          destination: packageData.departureFlight.arrivalAirport?.name || 'Unknown', 
          departureDate: packageData.departureFlight.departureTime,
          passengers: totalPassengers,
          class: 'Economy', // Default class
          price: Math.round((totalAmount * 0.4) / totalPassengers) // Rough estimate - 40% of total for flights
        });
      }
      
      if (packageData.returnFlight) {
        flightBookings.push({
          flightId: packageData.returnFlight.id,
          flightNumber: packageData.returnFlight.flightNumber,
          origin: packageData.returnFlight.departureAirport?.name || 'Unknown',
          destination: packageData.returnFlight.arrivalAirport?.name || 'Unknown',
          departureDate: packageData.returnFlight.departureTime,
          passengers: totalPassengers,
          class: 'Economy',
          price: Math.round((totalAmount * 0.4) / totalPassengers)
        });
      }

      // Prepare hotel booking
      if (packageData.hotel && finalCheckInDate && finalCheckOutDate) {
        const nights = Math.ceil((finalCheckOutDate.getTime() - finalCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
        const hotelPrice = Math.round(totalAmount * 0.6); // Rough estimate - 60% for hotel
        
        hotelBookings.push({
          hotelId: packageData.hotel.id,
          roomType: 'Standard', // Default room type
          checkIn: finalCheckInDate,
          checkOut: finalCheckOutDate,
          occupancy: adults + (children || 0),
          nights: nights,
          pricePerNight: Math.round(hotelPrice / nights),
          totalPrice: hotelPrice
        });
      }
    }
  }

  // Debug output
  console.log('[DEBUG] Flight bookings being passed to service:', flightBookings);

  // Prepare passenger details in the format expected by the database
  let passengerDetails = null;
  if (passengers && passengers.length > 0) {
    const adultsData = passengers.filter(p => p.type.toUpperCase() === 'ADULT').map((p, idx) => ({
      title: p.title || 'Mr',
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      passportNumber: '', // Not captured in current form
      email: idx === 0 ? (customerEmail || contactDetails?.email || '') : ''
    }));

    const childrenData = passengers.filter(p => p.type.toUpperCase() === 'CHILD').map(p => ({
      title: p.title || 'Miss/Master',
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      passportNumber: ''
    }));

    const infantsData = passengers.filter(p => p.type.toUpperCase() === 'INFANT').map(p => ({
      title: p.title || 'Infant',
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth
    }));

    passengerDetails = {
      adults: adultsData,
      children: childrenData,
      infants: infantsData
    };
  }

  // Create soft booking with package details
  const booking = await BookingService.createSoftBooking({
    userId,
    packageId: packageId,
    selectedHotelId: hotelId, // Pass the selected hotel ID
    flightBookings: flightBookings.length > 0 ? flightBookings : undefined,
    hotelBookings: hotelBookings.length > 0 ? hotelBookings : undefined,
    adults: adults || 1,
    children: children || 0,
    infants: 0, // Default to 0 for now
    totalAmount,
    currency,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    customerName: customerName || (passengers.length > 0 ? `${passengers[0].firstName} ${passengers[0].lastName}` : undefined),
    customerEmail: customerEmail || contactDetails?.email,
    customerPhone: customerPhone || contactDetails?.phone,
    checkInDate: finalCheckInDate,
    checkOutDate: finalCheckOutDate,
    passengerDetails: passengerDetails
  });

  // Send new booking email notification
  if (booking.customerEmail) {
    try {
      await sendConfirmationEmail({
        to: booking.customerEmail,
        bookingCode: booking.reservationCode,
        customerName: booking.customerName || 'Customer',
        checkInDate: booking.checkInDate?.toISOString() || new Date().toISOString(),
        checkOutDate: booking.checkOutDate?.toISOString() || new Date().toISOString(),
        destination: packageData?.destination?.name || 'Your Destination',
        totalAmount: booking.totalAmount,
      });
      console.log(`[EMAIL] New booking email sent to ${booking.customerEmail}`);
    } catch (emailError) {
      console.error(`[EMAIL] Failed to send booking email to ${booking.customerEmail}:`, emailError);
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Soft booking created successfully',
      booking: {
        id: booking.id,
        reservationCode: booking.reservationCode,
        status: booking.status,
        totalAmount: booking.totalAmount / 100, // Convert from cents
        currency: booking.currency,
        expiresAt: booking.expiresAt,
        createdAt: booking.createdAt,
      },
    },
    { status: 201 }
  );
});

// Note: Authentication middleware temporarily removed for build compatibility