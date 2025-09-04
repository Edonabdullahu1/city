const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Get hotels
    const hotels = await prisma.hotel.findMany({
      include: {
        city: true,
        rooms: true,
        hotelPrices: true
      }
    });
    console.log('=== HOTELS ===');
    console.log(`Found ${hotels.length} hotels`);
    hotels.forEach(hotel => {
      console.log(`\n${hotel.name} (${hotel.city.name}):`);
      console.log(`  Rooms: ${hotel.rooms.length}`);
      console.log(`  Price entries: ${hotel.hotelPrices.length}`);
      hotel.rooms.forEach(room => {
        console.log(`    - ${room.type}: ${room.basePrice/100}€ (capacity: ${room.capacity})`);
      });
    });

    // Get flight blocks
    const flightBlocks = await prisma.flight.findMany({
      where: {
        isBlockSeat: true,
        totalSeats: { gt: 0 }
      },
      include: {
        airline: true,
        originCity: true,
        destinationCity: true
      },
      orderBy: {
        departureTime: 'asc'
      }
    });
    
    console.log('\n=== FLIGHT BLOCKS ===');
    console.log(`Found ${flightBlocks.length} flight blocks`);
    
    // Group by blockGroupId
    const groups = new Map();
    flightBlocks.forEach(flight => {
      if (flight.blockGroupId) {
        if (!groups.has(flight.blockGroupId)) {
          groups.set(flight.blockGroupId, []);
        }
        groups.get(flight.blockGroupId).push(flight);
      }
    });
    
    console.log(`Found ${groups.size} flight block groups`);
    groups.forEach((flights, groupId) => {
      console.log(`\nGroup ${groupId}:`);
      flights.forEach(flight => {
        console.log(`  ${flight.isReturn ? 'RETURN' : 'OUTBOUND'}: ${flight.flightNumber}`);
        console.log(`    ${flight.originCity.name} → ${flight.destinationCity.name}`);
        console.log(`    Price: ${flight.pricePerSeat/100}€ per seat`);
        console.log(`    Seats: ${flight.availableSeats}/${flight.totalSeats}`);
      });
    });

    // Get transfers
    const transfers = await prisma.transfer.findMany({
      include: {
        fromCity: true,
        toCity: true
      }
    });
    
    console.log('\n=== TRANSFERS ===');
    console.log(`Found ${transfers.length} transfers`);
    transfers.forEach(transfer => {
      console.log(`  ${transfer.vehicleType} (${transfer.fromType} → ${transfer.toType}): ${transfer.fromCity.name} → ${transfer.toCity.name} - ${transfer.price/100}€`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();