const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generatePriceTable() {
  try {
    // Fetch data
    const hotels = await prisma.hotel.findMany({
      include: {
        city: true,
        hotelPrices: true
      }
    });

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

    // Group flights by blockGroupId
    const flightGroups = new Map();
    flightBlocks.forEach(flight => {
      if (flight.blockGroupId) {
        if (!flightGroups.has(flight.blockGroupId)) {
          flightGroups.set(flight.blockGroupId, { outbound: null, return: null });
        }
        if (flight.isReturn) {
          flightGroups.get(flight.blockGroupId).return = flight;
        } else {
          flightGroups.get(flight.blockGroupId).outbound = flight;
        }
      }
    });

    // Configuration
    const nights = 3; // 3 nights stay
    const includeTransfer = false; // Not including transfer based on user input
    
    const occupancyConfigs = [
      { label: '1 Adult', adults: 1, children: 0 },
      { label: '1 Adult, 1 Child (5)', adults: 1, children: 1 },
      { label: '2 Adults', adults: 2, children: 0 },
      { label: '2 Adults, 1 Child (5)', adults: 2, children: 1 },
      { label: '2 Adults, 2 Children (5,10)', adults: 2, children: 2 },
      { label: '3 Adults', adults: 3, children: 0 }
    ];

    console.log('=== PRE-CALCULATED PRICES TABLE ===');
    console.log(`Based on ${nights} nights stay`);
    console.log('Flight Price: €120 per person return (€240 total per person)');
    console.log('');

    // Create table header
    console.log('Hotel Name\t\tOccupancy\t\t\tFlight\t\tHotel\t\tTransfer\tTotal\t\tRoom Type');
    console.log('='.repeat(120));

    // For each flight group
    flightGroups.forEach((flights, groupId) => {
      if (!flights.outbound || !flights.return) return;
      
      const flightPricePerPerson = 120; // €120 return per person as specified
      
      console.log(`\nFlight Block: ${flights.outbound.originCity.name} → ${flights.outbound.destinationCity.name}`);
      console.log('-'.repeat(120));
      
      // For each hotel
      hotels.forEach(hotel => {
        console.log(`\n${hotel.name}:`);
        
        // For each occupancy configuration
        occupancyConfigs.forEach(config => {
          const totalPeople = config.adults + config.children;
          
          // Calculate flight cost
          const flightCost = totalPeople * flightPricePerPerson;
          
          // Calculate hotel cost based on occupancy
          let hotelCost = 0;
          let roomType = '';
          
          // Determine room type and cost based on occupancy
          if (config.adults === 1 && config.children === 0) {
            roomType = 'Single (BB)';
            hotelCost = 100 * nights;
          } else if (config.adults === 1 && config.children === 1) {
            roomType = 'Single (BB)';
            hotelCost = 100 * nights;
          } else if (config.adults === 2 && config.children === 0) {
            roomType = 'Double (BB)';
            hotelCost = 160 * nights;
          } else if (config.adults === 2 && config.children === 1) {
            roomType = 'Double (BB)';
            hotelCost = 160 * nights;
          } else if (config.adults === 2 && config.children === 2) {
            roomType = 'Family (BB)';
            hotelCost = 220 * nights;
          } else if (config.adults === 3) {
            roomType = 'Triple (BB)';
            hotelCost = 260 * nights;
          }
          
          // Check if hotel has actual pricing data
          if (hotel.hotelPrices && hotel.hotelPrices.length > 0) {
            const price = hotel.hotelPrices[0]; // Use first price entry
            
            if (config.adults === 1) {
              hotelCost = parseFloat(price.single) * nights;
            } else if (config.adults === 2) {
              hotelCost = parseFloat(price.double) * nights;
            } else if (config.adults === 3) {
              // Triple room = double + extra bed
              hotelCost = (parseFloat(price.double) + parseFloat(price.extraBed)) * nights;
            }
            
            // Add child costs
            if (config.children > 0) {
              hotelCost += parseFloat(price.paymentKids) * config.children * nights;
            }
          }
          
          // Calculate transfer cost (if included)
          let transferCost = 0;
          if (includeTransfer) {
            if (totalPeople <= 3) {
              transferCost = 50 * 2; // Private car, round trip
            } else if (totalPeople <= 7) {
              transferCost = 75 * 2; // Minivan, round trip
            } else {
              transferCost = 100 * 2; // Minibus, round trip
            }
          }
          
          const totalCost = flightCost + hotelCost + transferCost;
          
          // Format output
          const hotelName = hotel.name.padEnd(20);
          const occupancy = config.label.padEnd(30);
          const flight = `€${flightCost.toFixed(2)}`.padEnd(12);
          const hotelPrice = `€${hotelCost.toFixed(2)}`.padEnd(12);
          const transfer = includeTransfer ? `€${transferCost.toFixed(2)}`.padEnd(12) : '€0.00'.padEnd(12);
          const total = `€${totalCost.toFixed(2)}`.padEnd(12);
          
          console.log(`${hotelName}\t${occupancy}\t${flight}\t${hotelPrice}\t${transfer}\t${total}\t${roomType}`);
        });
      });
    });

    // Generate correct table based on user's requirements
    console.log('\n\n=== CORRECTED PRICE TABLE (As Per Requirements) ===');
    console.log('Flight: €120 per person RETURN');
    console.log('Nights: 3');
    console.log('');
    console.log('| Hotel       | Occupancy                   | Flight | Hotel | Total |');
    console.log('|-------------|-----------------------------|---------|---------|---------|}');
    
    hotels.forEach((hotel, hotelIndex) => {
      occupancyConfigs.forEach(config => {
        const totalPeople = config.adults + config.children;
        const flightCost = totalPeople * 120; // €120 return per person
        
        let hotelCost = 0;
        let roomType = '';
        
        // Use correct pricing structure
        if (config.adults === 1 && config.children === 0) {
          roomType = 'Single (BB)';
          hotelCost = 100 * nights;
        } else if (config.adults === 1 && config.children === 1) {
          roomType = 'Single (BB)';
          hotelCost = 100 * nights;
        } else if (config.adults === 2 && config.children === 0) {
          roomType = 'Double (BB)';
          hotelCost = 160 * nights;
        } else if (config.adults === 2 && config.children === 1) {
          roomType = 'Double (BB)';
          hotelCost = 160 * nights;
        } else if (config.adults === 2 && config.children === 2) {
          roomType = 'Double (BB)';
          hotelCost = 220 * nights;
        } else if (config.adults === 3) {
          roomType = 'Triple (BB)';
          hotelCost = 260 * nights;
        }
        
        const totalCost = flightCost + hotelCost;
        
        // Format hotel name (replace spaces with hyphens for consistency)
        const hotelDisplayName = hotel.name.replace(/\s+/g, '-').padEnd(12);
        const occupancy = config.label.padEnd(28);
        const flight = `€${flightCost}`.padEnd(8);
        const hotelPrice = `€${hotelCost}`.padEnd(8);
        const total = `€${totalCost}`.padEnd(8);
        
        console.log(`| ${hotelDisplayName}| ${occupancy}| ${flight}| ${hotelPrice}| ${total}|`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePriceTable();