import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get Cyprus package
  const pkg = await prisma.package.findUnique({
    where: { slug: 'city-break-cyprus' },
    select: {
      name: true,
      flightBlockIds: true
    }
  });
  
  console.log('Package:', pkg?.name);
  console.log('Flight Block IDs:', pkg?.flightBlockIds);
  
  // Get the actual flight blocks
  if (pkg?.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
    for (const blockId of pkg.flightBlockIds) {
      const flights = await prisma.flight.findMany({
        where: { blockGroupId: blockId as string },
        select: {
          blockGroupId: true,
          flightNumber: true,
          pricePerSeat: true,
          isReturn: true,
          departureAirport: { select: { code: true } },
          arrivalAirport: { select: { code: true } }
        },
        orderBy: { isReturn: 'asc' }
      });
      
      console.log(`\nBlock ${blockId}:`);
      flights.forEach(f => {
        const direction = f.isReturn ? 'Return' : 'Outbound';
        console.log(`  ${direction}: ${f.flightNumber} (${f.departureAirport.code}-${f.arrivalAirport.code}) - €${f.pricePerSeat/100} per person`);
      });
      console.log(`  Total round trip cost per person: €${flights[0]?.pricePerSeat/100}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());