import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAvailableSeats() {
  console.log('Fixing available seats for flights...');

  // Get all flights with 0 available seats
  const flights = await prisma.flight.findMany({
    where: {
      availableSeats: 0,
      totalSeats: { gt: 0 }
    },
    include: {
      bookings: {
        include: {
          booking: true
        }
      }
    }
  });

  console.log(`Found ${flights.length} flights with 0 available seats`);

  for (const flight of flights) {
    // Calculate actual booked seats
    const bookedSeats = flight.bookings
      .filter(fb => ['SOFT', 'CONFIRMED', 'PAID'].includes(fb.booking.status))
      .reduce((sum, fb) => sum + fb.passengers, 0);

    const availableSeats = flight.totalSeats - bookedSeats;

    console.log(`Flight ${flight.flightNumber}: totalSeats=${flight.totalSeats}, booked=${bookedSeats}, setting available=${availableSeats}`);

    // Update the flight
    await prisma.flight.update({
      where: { id: flight.id },
      data: { availableSeats }
    });
  }

  console.log('Done!');
}

fixAvailableSeats()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
