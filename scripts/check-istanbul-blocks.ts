import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get Istanbul package
  const pkg = await prisma.package.findUnique({
    where: { slug: '123' },
    select: {
      name: true,
      flightBlockIds: true
    }
  });
  
  console.log('Package:', pkg?.name);
  console.log('Flight Block IDs:', pkg?.flightBlockIds);
  
  // Get the actual flight blocks in the order they appear in the database
  if (pkg?.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
    console.log('\nFlight blocks in flightBlockIds order:');
    for (const blockId of pkg.flightBlockIds) {
      const flights = await prisma.flight.findMany({
        where: { blockGroupId: blockId as string },
        select: {
          blockGroupId: true,
          flightNumber: true,
          pricePerSeat: true,
          departureTime: true,
          isReturn: true,
          departureAirport: { select: { code: true } },
          arrivalAirport: { select: { code: true } }
        },
        orderBy: { isReturn: 'asc' }
      });
      
      if (flights.length > 0) {
        const outbound = flights.find(f => !f.isReturn);
        console.log(`${blockId}:`);
        console.log(`  Date: ${new Date(outbound?.departureTime!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
        console.log(`  Price per person: €${outbound?.pricePerSeat! / 100}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());