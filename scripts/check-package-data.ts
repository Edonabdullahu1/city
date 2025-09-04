import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Cyprus package and check its stored data
  const cyprusPackage = await prisma.package.findFirst({
    where: {
      name: { contains: 'Cyprus' }
    },
    select: {
      id: true,
      name: true,
      flightBlockIds: true,
      hotelIds: true,
      departureFlightId: true,
      returnFlightId: true,
      departureFlight: {
        select: {
          id: true,
          flightNumber: true,
          blockGroupId: true
        }
      },
      returnFlight: {
        select: {
          id: true,
          flightNumber: true,
          blockGroupId: true
        }
      }
    }
  });

  console.log('Cyprus Package Data:');
  console.log(JSON.stringify(cyprusPackage, null, 2));

  // Check if the flightBlockIds contains Istanbul flight block IDs
  if (cyprusPackage?.flightBlockIds) {
    console.log('\nChecking flight blocks from flightBlockIds:');
    const blockIds = cyprusPackage.flightBlockIds as any;
    
    for (const blockId of blockIds) {
      // Try to find flights with this blockGroupId
      const flights = await prisma.flight.findMany({
        where: {
          blockGroupId: blockId
        },
        select: {
          id: true,
          flightNumber: true,
          blockGroupId: true,
          departureAirportId: true,
          arrivalAirportId: true
        }
      });
      
      console.log(`\nBlock Group ID: ${blockId}`);
      flights.forEach(flight => {
        console.log(`  - ${flight.flightNumber}: ${flight.departureAirportId} -> ${flight.arrivalAirportId}`);
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());