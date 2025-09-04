import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check Malta package prices
  const packagePrices = await prisma.packagePrice.findMany({
    where: {
      package: {
        slug: 'malta-gateaway'
      },
      adults: 2,
      children: 0
    },
    select: {
      id: true,
      adults: true,
      children: true,
      totalPrice: true,
      flightPrice: true,
      hotelPrice: true,
      hotelName: true,
      flightBlockId: true
    }
  });
  
  console.log('Malta Package Prices for 2 adults:');
  console.log('=====================================');
  packagePrices.forEach(price => {
    console.log(`Hotel: ${price.hotelName}`);
    console.log(`  Total Price: €${price.totalPrice}`);
    console.log(`  Flight Price: €${price.flightPrice || 0}`);
    console.log(`  Hotel Price: €${price.hotelPrice || 0}`);
    console.log(`  Flight Block ID: ${price.flightBlockId || 'N/A'}`);
    console.log('---');
  });

  // Also check flight blocks for Malta
  const maltaFlights = await prisma.flight.findMany({
    where: {
      OR: [
        { departureAirportId: { in: ['cmf5d433f04ho139znwse1lpu'] } }, // Malta airport
        { arrivalAirportId: { in: ['cmf5d433f04ho139znwse1lpu'] } }
      ]
    },
    select: {
      id: true,
      flightNumber: true,
      pricePerSeat: true,
      departureAirportId: true,
      arrivalAirportId: true,
      departureTime: true,
      blockGroupId: true
    },
    orderBy: { departureTime: 'asc' }
  });

  console.log('\nMalta Flights:');
  console.log('====================');
  maltaFlights.forEach(flight => {
    const price = flight.pricePerSeat / 100; // Convert from cents
    console.log(`${flight.flightNumber}: €${price} - Block: ${flight.blockGroupId || 'N/A'}`);
    console.log(`  Departure: ${flight.departureTime}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());