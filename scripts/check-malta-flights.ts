import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // First, find Malta city
  const malta = await prisma.city.findFirst({
    where: { name: 'Malta' }
  });
  
  console.log('Malta city:', malta);
  
  if (malta) {
    // Check flights with Malta as destination or origin
    const flights = await prisma.flight.findMany({
      where: {
        isBlockSeat: true,
        blockGroupId: { not: null },
        OR: [
          { destinationCityId: malta.id },
          { originCityId: malta.id }
        ]
      },
      include: {
        originCity: true,
        destinationCity: true
      },
      orderBy: { departureTime: 'desc' }
    });
    
    console.log('\nFlights involving Malta:');
    flights.forEach(f => {
      console.log(`- ${f.flightNumber}: ${f.originCity.name} -> ${f.destinationCity.name}`);
      console.log(`  Block: ${f.blockGroupId}, Return: ${f.isReturn}`);
      console.log(`  Departure: ${f.departureTime}`);
      console.log(`  Price: €${f.pricePerSeat/100}`);
    });
    
    // Check the API endpoint
    console.log('\n\nTesting API endpoint with destinationCityId:', malta.id);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());