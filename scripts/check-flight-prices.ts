import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const flights = await prisma.flight.findMany({
    where: {
      blockGroupId: {
        in: ['BLOCK-1756465473877', 'BLOCK-1756420659794', 'BLOCK-1756723335108']
      }
    },
    select: {
      id: true,
      flightNumber: true,
      pricePerSeat: true,
      blockGroupId: true,
      isReturn: true,
      departureAirport: { select: { code: true } },
      arrivalAirport: { select: { code: true } }
    },
    orderBy: [
      { blockGroupId: 'asc' },
      { departureTime: 'asc' }
    ]
  });
  
  console.log('Flight prices in database:');
  flights.forEach(flight => {
    console.log(`${flight.blockGroupId} - ${flight.flightNumber} (${flight.departureAirport.code}-${flight.arrivalAirport.code}): €${flight.pricePerSeat} cents = €${flight.pricePerSeat/100} euros`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());