const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNightsCalculation() {
  try {
    const packageId = 'cmewubs960001svvhx7pbi70p';
    
    // Get package details
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        city: true
      }
    });
    
    console.log('Testing package:', pkg.name);
    console.log('Flight blocks:', pkg.flightBlockIds);
    
    // Get flight blocks
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
          const outbound = flights.find(f => 
            f.departureAirport.code !== pkg.city.airportCode
          ) || flights[0];
          const returnFlight = flights.find(f => 
            f.arrivalAirport.code !== pkg.city.airportCode
          ) || flights[1];
          
          // Calculate nights using arrival time for check-in and departure time for check-out
          const checkIn = new Date(outbound.arrivalTime);
          const checkOut = new Date(returnFlight.departureTime);
          const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get flight prices
          const outboundPrice = outbound.pricePerSeat / 100;
          const returnPrice = returnFlight.pricePerSeat / 100;
          const totalFlightPrice = outboundPrice + returnPrice;
          
          console.log(`\nFlight Block: ${blockGroupId}`);
          console.log(`  Outbound: ${outbound.flightNumber}`);
          console.log(`    Departure: ${outbound.departureTime}`);
          console.log(`    Arrival: ${outbound.arrivalTime}`);
          console.log(`    Price: €${outboundPrice}`);
          console.log(`  Return: ${returnFlight.flightNumber}`);
          console.log(`    Departure: ${returnFlight.departureTime}`);
          console.log(`    Arrival: ${returnFlight.arrivalTime}`);
          console.log(`    Price: €${returnPrice}`);
          console.log(`  Check-in: ${checkIn.toISOString()}`);
          console.log(`  Check-out: ${checkOut.toISOString()}`);
          console.log(`  Nights: ${nights}`);
          console.log(`  Total Flight Price: €${totalFlightPrice} per person`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNightsCalculation();