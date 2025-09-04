const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalRecalculate() {
  const packageId = 'cmewubs960001svvhx7pbi70p';
  
  try {
    console.log('Final recalculation with corrected flight detection...\n');
    
    // Get package details
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        departureFlight: true,
        returnFlight: true,
        hotel: {
          include: {
            hotelPrices: true
          }
        },
        transfer: true,
        city: true
      }
    });

    // Delete existing pre-calculated prices
    await prisma.packagePrice.deleteMany({
      where: { packageId }
    });

    const calculatedPrices = [];
    
    // Get flight blocks
    let flightBlocks = [];
    if (pkg.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
      const blockGroupIds = pkg.flightBlockIds;
      for (const blockGroupId of blockGroupIds) {
        const flights = await prisma.flight.findMany({
          where: { blockGroupId },
          include: {
            departureAirport: true,
            arrivalAirport: true
          },
          orderBy: { departureTime: 'asc' }
        });
        
        if (flights.length >= 2) {
          // For Istanbul packages, the destination airport is SAW
          const destinationAirportCode = 'SAW';
          
          const outbound = flights.find(f => 
            f.arrivalAirport.code === destinationAirportCode
          ) || flights[0];
          const returnFlight = flights.find(f => 
            f.departureAirport.code === destinationAirportCode
          ) || flights[1];
          
          flightBlocks.push({
            blockGroupId,
            outbound,
            return: returnFlight
          });
        }
      }
    }

    // Define occupancy variations
    const occupancies = [
      { adults: 1, children: 0, childAges: '' },
      { adults: 1, children: 1, childAges: '5' },
      { adults: 2, children: 0, childAges: '' },
      { adults: 2, children: 1, childAges: '5' },
      { adults: 2, children: 2, childAges: '5,10' },
      { adults: 3, children: 0, childAges: '' },
    ];

    console.log(`Processing ${flightBlocks.length} flight blocks...`);
    
    // Process each flight block
    for (const flightBlock of flightBlocks) {
      // Calculate nights using arrival time for check-in and departure time for check-out
      const checkIn = new Date(flightBlock.outbound.arrivalTime);
      const checkOut = new Date(flightBlock.return.departureTime);
      const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get actual flight prices from the flight block
      // Use only the outbound price as it represents the round-trip price per person
      const flightPricePerPerson = flightBlock.outbound.pricePerSeat / 100;
      
      console.log(`\nFlight Block ${flightBlock.blockGroupId}:`);
      console.log(`  €${flightPricePerPerson} per person (round trip), ${nights} nights`);
      console.log(`  Outbound: ${flightBlock.outbound.flightNumber}`);
      console.log(`  Return: ${flightBlock.return.flightNumber}`);
    
      // Get all hotel IDs from the package
      const hotelIds = pkg.hotelIds || [pkg.hotelId];
      
      // Fetch all hotels
      const hotels = await prisma.hotel.findMany({
        where: {
          id: { in: hotelIds }
        },
        include: {
          hotelPrices: {
            where: {
              fromDate: { lte: checkIn },
              tillDate: { gte: checkOut }
            }
          }
        }
      });

      // For each hotel
      for (const hotel of hotels) {
        if (hotel.hotelPrices.length === 0) {
          console.log(`  Skipping hotel ${hotel.name} - no prices`);
          continue;
        }

        let priceCount = 0;
        
        // For each occupancy variation
        for (const occupancy of occupancies) {
          // Calculate actual flight prices
          const totalFlightPrice = flightPricePerPerson * (occupancy.adults + occupancy.children);

          // Get hotel price for the date range
          const hotelPrice = hotel.hotelPrices[0];
          
          // Calculate hotel cost based on occupancy
          let hotelCost = 0;
          let roomType = 'Standard';
          
          if (occupancy.adults === 1) {
            hotelCost = Number(hotelPrice.single) * nights;
            roomType = 'Single';
          } else if (occupancy.adults === 2) {
            hotelCost = Number(hotelPrice.double) * nights;
            roomType = 'Double';
          } else if (occupancy.adults === 3) {
            hotelCost = (Number(hotelPrice.double) + Number(hotelPrice.extraBed)) * nights;
            roomType = 'Triple';
          }

          // Calculate children costs
          if (occupancy.children > 0 && occupancy.childAges) {
            const ages = occupancy.childAges.split(',').map(a => parseInt(a));
            
            ages.forEach(age => {
              const ageRange = hotelPrice.payingKidsAge || '';
              const [minAge, maxAge] = ageRange.split('-').map(a => parseInt(a) || 0);
              
              if (age >= minAge && age <= maxAge && minAge > 0) {
                const childPricePerNight = Number(hotelPrice.paymentKids);
                hotelCost += childPricePerNight * nights;
              } else if (age > maxAge) {
                const extraBedPrice = Number(hotelPrice.extraBed);
                hotelCost += extraBedPrice * nights;
              }
            });
          }

          // Transfer cost
          let transferCost = 0;
          if (pkg.includesTransfer && pkg.transfer) {
            transferCost = (pkg.transfer.price / 100) * (occupancy.adults + occupancy.children);
          }

          // Service charge and profit margin
          const serviceCharge = Number(pkg.serviceCharge) || 0;
          const profitMargin = pkg.profitMargin !== null && pkg.profitMargin !== undefined ? Number(pkg.profitMargin) : 20;

          // Calculate total
          const subtotal = totalFlightPrice + hotelCost + transferCost + serviceCharge;
          const profitAmount = subtotal * (profitMargin / 100);
          const totalPrice = subtotal + profitAmount;

          calculatedPrices.push({
            packageId,
            adults: occupancy.adults,
            children: occupancy.children,
            childAges: occupancy.childAges,
            flightPrice: totalFlightPrice,
            hotelPrice: hotelCost,
            transferPrice: transferCost,
            totalPrice,
            hotelBoard: hotelPrice.board,
            roomType: `${roomType} (${hotelPrice.board})`,
            hotelName: hotel.name,
            flightBlockId: flightBlock.blockGroupId,
            nights: nights
          });
          
          priceCount++;
        }
        
        console.log(`  Hotel ${hotel.name}: ${priceCount} prices calculated`);
      }
    }

    // Bulk create all price variations
    if (calculatedPrices.length > 0) {
      await prisma.packagePrice.createMany({
        data: calculatedPrices.map(price => ({
          packageId: price.packageId,
          adults: price.adults,
          children: price.children,
          childAges: price.childAges,
          flightPrice: price.flightPrice,
          hotelPrice: price.hotelPrice,
          transferPrice: price.transferPrice,
          totalPrice: price.totalPrice,
          hotelBoard: price.hotelBoard,
          roomType: price.roomType,
          hotelName: price.hotelName,
          flightBlockId: price.flightBlockId,
          nights: price.nights
        }))
      });
      
      console.log(`\n✅ Successfully calculated ${calculatedPrices.length} price variations`);
      
      // Show sample prices for 2 adults
      const samplePrices = calculatedPrices.filter(p => p.adults === 2 && p.children === 0);
      console.log('\nSample prices for 2 adults:');
      samplePrices.forEach(price => {
        console.log(`  ${price.hotelName}: €${price.totalPrice.toFixed(2)}`);
        console.log(`    Flight: €${price.flightPrice}, Hotel: €${price.hotelPrice}, Transfer: €${price.transferPrice}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalRecalculate();