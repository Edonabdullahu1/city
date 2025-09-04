import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get Cyprus package ID
  const cyprusPackage = await prisma.package.findFirst({
    where: {
      name: { contains: 'Cyprus' }
    }
  });

  if (!cyprusPackage) {
    console.log('Cyprus package not found');
    return;
  }

  console.log('Cyprus Package ID:', cyprusPackage.id);

  // Simulate what the package API returns
  const packageData = await prisma.package.findUnique({
    where: { id: cyprusPackage.id },
    include: {
      city: true,
      hotel: true,
      room: true,
      departureFlight: {
        include: {
          airline: true,
          departureAirport: true,
          arrivalAirport: true,
          originCity: true,
          destinationCity: true
        }
      },
      returnFlight: {
        include: {
          airline: true,
          departureAirport: true,
          arrivalAirport: true,
          originCity: true,
          destinationCity: true
        }
      },
      transfer: true,
      excursions: {
        include: {
          excursion: true
        }
      }
    }
  });

  console.log('\nPackage data from API:');
  console.log({
    name: packageData?.name,
    flightBlockIds: packageData?.flightBlockIds,
    departureFlight: {
      id: packageData?.departureFlight?.id,
      flightNumber: packageData?.departureFlight?.flightNumber,
      blockGroupId: packageData?.departureFlight?.blockGroupId
    },
    returnFlight: {
      id: packageData?.returnFlight?.id,
      flightNumber: packageData?.returnFlight?.flightNumber,
      blockGroupId: packageData?.returnFlight?.blockGroupId
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());