import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFlightBlocks() {
  try {
    console.log('Starting to seed flight blocks...');

    // First, ensure we have an airline
    let airline = await prisma.airline.findFirst({
      where: { iataCode: 'OS' }
    });

    if (!airline) {
      console.log('Creating Austrian Airlines...');
      airline = await prisma.airline.create({
        data: {
          name: 'Austrian Airlines',
          iataCode: 'OS',
          active: true
        }
      });
    }

    // Get cities to create flights between them
    const cities = await prisma.city.findMany({
      include: { country: true }
    });

    if (cities.length < 2) {
      console.log('Not enough cities to create flight blocks. Need at least 2 cities.');
      return;
    }

    // Create airports for cities if they don't exist
    const airports: { [key: string]: any } = {};
    for (const city of cities) {
      let airport = await prisma.airport.findFirst({
        where: { cityId: city.id }
      });

      if (!airport) {
        const airportCode = city.name.substring(0, 3).toUpperCase();
        console.log(`Creating airport for ${city.name}...`);
        airport = await prisma.airport.create({
          data: {
            code: airportCode,
            name: `${city.name} International Airport`,
            cityId: city.id,
            active: true
          }
        });
      }
      airports[city.id] = airport;
    }

    // Assuming first city is origin (e.g., Skopje) and others are destinations
    const originCity = cities[0];
    const destinationCities = cities.slice(1, 4); // Take up to 3 destination cities

    console.log(`Creating flight blocks from ${originCity.name} to destinations...`);

    // Use timestamp to ensure unique flight numbers
    const timestamp = Date.now().toString().slice(-6);
    let flightCounter = 1;
    
    for (const destCity of destinationCities) {
      // Create multiple flight blocks for each destination
      for (let blockNum = 1; blockNum <= 3; blockNum++) {
        const blockGroupId = `BLK-${originCity.name.substring(0, 3).toUpperCase()}-${destCity.name.substring(0, 3).toUpperCase()}-${blockNum}`;
        
        // Check if this block already exists
        const existingBlock = await prisma.flight.findFirst({
          where: { blockGroupId }
        });

        if (existingBlock) {
          console.log(`Flight block ${blockGroupId} already exists, skipping...`);
          continue;
        }
        
        // Calculate dates for the block
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + (blockNum * 7)); // Each block is a week apart
        
        const outboundDate = new Date(baseDate);
        outboundDate.setHours(10, 0, 0, 0);
        
        const returnDate = new Date(baseDate);
        returnDate.setDate(returnDate.getDate() + 7); // 7-day package
        returnDate.setHours(18, 0, 0, 0);

        // Create outbound flight
        const outboundFlight = await prisma.flight.create({
          data: {
            flightNumber: `OS${timestamp}-${flightCounter++}`,
            airlineId: airline.id,
            originCityId: originCity.id,
            destinationCityId: destCity.id,
            departureAirportId: airports[originCity.id].id,
            arrivalAirportId: airports[destCity.id].id,
            departureTime: outboundDate,
            arrivalTime: new Date(outboundDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours flight
            totalSeats: 50,
            availableSeats: 50,
            pricePerSeat: (150 + (blockNum * 10)) * 100, // Convert to cents
            isBlockSeat: true,
            blockGroupId: blockGroupId,
            isReturn: false
          }
        });

        // Create return flight
        const returnFlight = await prisma.flight.create({
          data: {
            flightNumber: `OS${timestamp}-${flightCounter++}`,
            airlineId: airline.id,
            originCityId: destCity.id,
            destinationCityId: originCity.id,
            departureAirportId: airports[destCity.id].id,
            arrivalAirportId: airports[originCity.id].id,
            departureTime: returnDate,
            arrivalTime: new Date(returnDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours flight
            totalSeats: 50,
            availableSeats: 50,
            pricePerSeat: (150 + (blockNum * 10)) * 100, // Convert to cents
            isBlockSeat: true,
            blockGroupId: blockGroupId,
            isReturn: true
          }
        });

        console.log(`Created flight block ${blockGroupId}:`);
        console.log(`  - Outbound: ${outboundFlight.flightNumber} on ${outboundDate.toLocaleDateString()}`);
        console.log(`  - Return: ${returnFlight.flightNumber} on ${returnDate.toLocaleDateString()}`);
      }
    }

    console.log('Flight blocks seeded successfully!');
  } catch (error) {
    console.error('Error seeding flight blocks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedFlightBlocks();