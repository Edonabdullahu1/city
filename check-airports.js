const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAirports() {
  try {
    // Get package details
    const pkg = await prisma.package.findUnique({
      where: { id: 'cmewubs960001svvhx7pbi70p' },
      include: {
        city: true
      }
    });
    
    console.log('Package city:', pkg.city.name);
    console.log('City airport code:', pkg.city.airportCode);
    
    // Get airports
    const airports = await prisma.airport.findMany({});
    console.log('\nAll airports:');
    airports.forEach(a => {
      console.log(`  ${a.code}: ${a.name} (${a.id})`);
    });
    
    // Check flight blocks
    const blockIds = ['BLOCK-1756420659794', 'BLOCK-1756465473877', 'BLOCK-1756723335108'];
    
    for (const blockId of blockIds) {
      const flights = await prisma.flight.findMany({
        where: { blockGroupId: blockId },
        include: {
          departureAirport: true,
          arrivalAirport: true
        },
        orderBy: { departureTime: 'asc' }
      });
      
      console.log(`\n${blockId}:`);
      flights.forEach(f => {
        console.log(`  ${f.flightNumber}: ${f.departureAirport.code} -> ${f.arrivalAirport.code}`);
        console.log(`    Depart: ${f.departureTime}`);
        console.log(`    Arrive: ${f.arrivalTime}`);
      });
      
      if (flights.length >= 2) {
        // Correct logic: outbound FROM the city TO destination
        const outbound = flights.find(f => 
          f.departureAirport.code === pkg.city.airportCode
        );
        const returnFlight = flights.find(f => 
          f.arrivalAirport.code === pkg.city.airportCode
        );
        
        console.log(`  Detected outbound: ${outbound?.flightNumber || 'NOT FOUND'}`);
        console.log(`  Detected return: ${returnFlight?.flightNumber || 'NOT FOUND'}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAirports();