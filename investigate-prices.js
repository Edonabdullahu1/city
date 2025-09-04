const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function investigatePricing() {
  try {
    const packageId = 'cmewubs960001svvhx7pbi70p';
    
    console.log('=== INVESTIGATING PRICING SYSTEM ISSUES ===\n');
    
    // 1. Get package details
    console.log('1. Package Details:');
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        departureFlight: true,
        returnFlight: true,
        hotel: true,
        transfer: true,
        city: true
      }
    });
    
    if (!pkg) {
      console.log('Package not found');
      return;
    }
    
    console.log(`Package: ${pkg.name}`);
    console.log(`City: ${pkg.city.name}`);
    console.log(`Nights: ${pkg.nights}`);
    console.log(`Flight Block IDs: ${JSON.stringify(pkg.flightBlockIds)}`);
    console.log(`Hotel IDs: ${JSON.stringify(pkg.hotelIds)}`);
    console.log(`Primary Hotel: ${pkg.hotel.name}\n`);
    
    // 2. Check flight blocks
    console.log('2. Flight Block Analysis:');
    if (pkg.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
      for (const blockGroupId of pkg.flightBlockIds) {
        const flights = await prisma.flight.findMany({
          where: { blockGroupId },
          include: {
            departureAirport: true,
            arrivalAirport: true
          },
          orderBy: { departureTime: 'asc' }
        });
        
        console.log(`\nBlock Group: ${blockGroupId}`);
        flights.forEach((flight, i) => {
          console.log(`  Flight ${i + 1}: ${flight.flightNumber}`);
          console.log(`    ${flight.departureAirport.code} -> ${flight.arrivalAirport.code}`);
          console.log(`    Price per seat: €${(flight.pricePerSeat / 100).toFixed(2)}`);
          console.log(`    Departure: ${flight.departureTime}`);
          console.log(`    Arrival: ${flight.arrivalTime}`);
        });
        
        if (flights.length >= 2) {
          const outbound = flights.find(f => f.arrivalAirport.code === 'SAW') || flights[0];
          const returnFlight = flights.find(f => f.departureAirport.code === 'SAW') || flights[1];
          const totalFlightPrice = (outbound.pricePerSeat + returnFlight.pricePerSeat) / 100;
          
          // Calculate nights for this flight block
          const checkIn = new Date(outbound.arrivalTime);
          const checkOut = new Date(returnFlight.departureTime);
          const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`  -> Total per person: €${totalFlightPrice.toFixed(2)} (${nights} nights)`);
        }
      }
    }
    
    // 3. Check package prices stored in database
    console.log('\n3. Stored Package Prices:');
    const prices = await prisma.packagePrice.findMany({
      where: { packageId },
      orderBy: [
        { hotelName: 'asc' },
        { adults: 'asc' },
        { children: 'asc' }
      ]
    });
    
    console.log(`Found ${prices.length} price variations:\n`);
    
    // Group by hotel to show the inconsistency
    const pricesByHotel = {};
    prices.forEach(price => {
      const hotelKey = price.hotelName || 'Unknown';
      if (!pricesByHotel[hotelKey]) {
        pricesByHotel[hotelKey] = [];
      }
      pricesByHotel[hotelKey].push(price);
    });
    
    for (const [hotelName, hotelPrices] of Object.entries(pricesByHotel)) {
      console.log(`Hotel: ${hotelName}`);
      hotelPrices.forEach(price => {
        console.log(`  ${price.adults}A/${price.children}C: Flight €${price.flightPrice}, Hotel €${price.hotelPrice}, Total €${price.totalPrice}`);
      });
      console.log();
    }
    
    // 4. Identify the issue
    console.log('4. ANALYSIS RESULTS:');
    const flightPricesUsed = [...new Set(prices.map(p => parseFloat(p.flightPrice)))];
    console.log(`Different flight prices found: ${flightPricesUsed.map(p => `€${p.toFixed(2)}`).join(', ')}`);
    
    if (flightPricesUsed.length > 1) {
      console.log('❌ ISSUE CONFIRMED: Flight prices vary by hotel when they should be constant!');
    } else {
      console.log('✅ Flight prices are consistent across hotels');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigatePricing();