import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const blockGroupId = 'BLOCK-1756821474188';
  
  // Simulate what the API should return
  const flights = await prisma.flight.findMany({
    where: {
      isBlockSeat: true,
      blockGroupId: blockGroupId
    },
    include: {
      airline: true,
      originCity: true,
      destinationCity: true,
      departureAirport: true,
      arrivalAirport: true
    },
    orderBy: {
      departureTime: 'asc'
    }
  });

  console.log(`Flights for blockGroupId ${blockGroupId}:`);
  flights.forEach(flight => {
    console.log({
      id: flight.id,
      flightNumber: flight.flightNumber,
      isReturn: flight.isReturn,
      route: `${flight.departureAirport.code} -> ${flight.arrivalAirport.code}`,
      departure: flight.departureTime,
      airline: flight.airline.name
    });
  });

  // Group flights as the API would
  const flightBlocks: any = {};
  
  flights.forEach(flight => {
    if (!flight.blockGroupId) return;
    
    if (!flightBlocks[flight.blockGroupId]) {
      flightBlocks[flight.blockGroupId] = {
        blockGroupId: flight.blockGroupId,
        outboundFlight: null,
        returnFlight: null
      };
    }

    const flightData = {
      id: flight.id,
      flightNumber: flight.flightNumber,
      airline: flight.airline.name,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      totalSeats: flight.totalSeats,
      availableSeats: flight.availableSeats,
      pricePerSeat: flight.pricePerSeat,
      originCity: flight.originCity.name,
      destinationCity: flight.destinationCity.name,
      departureAirport: `${flight.departureAirport.code} - ${flight.departureAirport.name}`,
      arrivalAirport: `${flight.arrivalAirport.code} - ${flight.arrivalAirport.name}`
    };

    if (flight.isReturn) {
      flightBlocks[flight.blockGroupId].returnFlight = flightData;
    } else {
      flightBlocks[flight.blockGroupId].outboundFlight = flightData;
    }
  });

  console.log('\nGrouped flight blocks:');
  console.log(JSON.stringify(flightBlocks, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());