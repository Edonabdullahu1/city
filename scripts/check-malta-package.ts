import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check Malta package
  const maltaPackage = await prisma.package.findFirst({
    where: { 
      name: { contains: 'Malta' }
    },
    include: {
      departureFlight: {
        include: {
          originCity: true,
          destinationCity: true
        }
      },
      returnFlight: {
        include: {
          originCity: true,
          destinationCity: true
        }
      },
      city: true
    }
  });
  
  if (maltaPackage) {
    console.log('\n=== MALTA PACKAGE ===');
    console.log('Name:', maltaPackage.name);
    console.log('City:', maltaPackage.city.name);
    console.log('Flight Block IDs:', maltaPackage.flightBlockIds);
    
    console.log('\nDEPARTURE FLIGHT:');
    if (maltaPackage.departureFlight) {
      console.log('- Flight:', maltaPackage.departureFlight.flightNumber);
      console.log('- Route:', maltaPackage.departureFlight.originCity.name, '->', maltaPackage.departureFlight.destinationCity.name);
      console.log('- Time:', maltaPackage.departureFlight.departureTime);
      console.log('- Is Return?:', maltaPackage.departureFlight.isReturn);
    }
    
    console.log('\nRETURN FLIGHT:');
    if (maltaPackage.returnFlight) {
      console.log('- Flight:', maltaPackage.returnFlight.flightNumber);
      console.log('- Route:', maltaPackage.returnFlight.originCity.name, '->', maltaPackage.returnFlight.destinationCity.name);
      console.log('- Time:', maltaPackage.returnFlight.departureTime);
      console.log('- Is Return?:', maltaPackage.returnFlight.isReturn);
    }
    
    // Check the actual flight blocks
    if (maltaPackage.flightBlockIds && Array.isArray(maltaPackage.flightBlockIds) && maltaPackage.flightBlockIds.length > 0) {
      console.log('\n=== FLIGHT BLOCKS ===');
      for (const blockId of maltaPackage.flightBlockIds as string[]) {
        const flights = await prisma.flight.findMany({
          where: { blockGroupId: blockId },
          include: {
            originCity: true,
            destinationCity: true
          },
          orderBy: { departureTime: 'asc' }
        });
        
        console.log('\nBlock:', blockId);
        flights.forEach(f => {
          console.log(`- ${f.flightNumber}: ${f.originCity.name} -> ${f.destinationCity.name}`);
          console.log(`  Time: ${f.departureTime}`);
          console.log(`  Is Return: ${f.isReturn}`);
        });
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());