const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFlights() {
  try {
    const blockIds = ['BLOCK-1756420659794', 'BLOCK-1756465473877', 'BLOCK-1756723335108'];
    
    for (const blockId of blockIds) {
      const flights = await prisma.flight.findMany({
        where: { blockGroupId: blockId },
        orderBy: { departureTime: 'asc' }
      });
      
      console.log(`\n=== ${blockId} ===`);
      for (const flight of flights) {
        console.log(`Flight: ${flight.flightNumber}`);
        console.log(`  From: ${flight.departureAirportId} to ${flight.arrivalAirportId}`);
        console.log(`  Departure: ${flight.departureTime}`);
        console.log(`  Arrival: ${flight.arrivalTime}`);
        console.log(`  Price: €${flight.pricePerSeat / 100}`);
        console.log(`  Route Type: ${flight.routeType}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFlights();