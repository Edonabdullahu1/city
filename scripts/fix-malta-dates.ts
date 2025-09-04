import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing Malta flight dates...\n');
  
  // Get the flights
  const flights = await prisma.flight.findMany({
    where: { blockGroupId: 'BLOCK-1756989083186' },
    include: {
      originCity: true,
      destinationCity: true
    },
    orderBy: { departureTime: 'asc' }
  });
  
  console.log('Current flights:');
  flights.forEach(f => {
    console.log(`- ${f.flightNumber}: ${f.originCity.name} -> ${f.destinationCity.name}`);
    console.log(`  Date: ${f.departureTime}`);
    console.log(`  isReturn: ${f.isReturn}`);
  });
  
  // Find the Malta -> Skopje flight (return flight)
  const returnFlight = flights.find(f => f.originCity.name === 'Malta' && f.destinationCity.name === 'Skopje');
  
  if (returnFlight) {
    // This flight is currently May 17, 2025, but should be Oct 17, 2025
    const correctDepartureTime = new Date('2025-10-17T14:00:00.000Z');
    const correctArrivalTime = new Date('2025-10-17T15:00:00.000Z');
    
    console.log('\nUpdating return flight:');
    console.log('From:', returnFlight.departureTime);
    console.log('To:', correctDepartureTime);
    
    const updated = await prisma.flight.update({
      where: { id: returnFlight.id },
      data: {
        departureTime: correctDepartureTime,
        arrivalTime: correctArrivalTime
      }
    });
    
    console.log('\nFlight updated successfully!');
    
    // Verify the nights calculation
    const outbound = flights.find(f => f.originCity.name === 'Skopje' && f.destinationCity.name === 'Malta');
    if (outbound) {
      const nights = Math.floor((correctDepartureTime.getTime() - outbound.departureTime.getTime()) / (1000 * 60 * 60 * 24));
      console.log('\nNew package details:');
      console.log('Outbound:', new Date(outbound.departureTime).toDateString());
      console.log('Return:', correctDepartureTime.toDateString());
      console.log('Nights:', nights);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());