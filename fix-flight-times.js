const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFlightTimes() {
  try {
    // Fix BLOCK-1756420659794 (2 nights: Aug 31 - Sep 2)
    // Outbound flight
    await prisma.flight.update({
      where: { id: 'PC342-659794' },
      data: {
        departureTime: new Date('2025-08-31T10:00:00'),
        arrivalTime: new Date('2025-08-31T13:00:00') // 3 hour flight
      }
    });
    
    // Return flight
    await prisma.flight.update({
      where: { id: 'PC341-659794' },
      data: {
        departureTime: new Date('2025-09-02T14:00:00'),
        arrivalTime: new Date('2025-09-02T17:00:00') // 3 hour flight
      }
    });
    
    console.log('Fixed BLOCK-1756420659794 (2 nights)');
    
    // Fix BLOCK-1756465473877 (2 nights: Sep 26 - Sep 28)
    // Outbound flight
    await prisma.flight.update({
      where: { id: 'PC342-473877' },
      data: {
        departureTime: new Date('2025-09-26T10:00:00'),
        arrivalTime: new Date('2025-09-26T13:00:00') // 3 hour flight
      }
    });
    
    // Return flight
    await prisma.flight.update({
      where: { id: 'PC341-473877' },
      data: {
        departureTime: new Date('2025-09-28T14:00:00'),
        arrivalTime: new Date('2025-09-28T17:00:00') // 3 hour flight
      }
    });
    
    console.log('Fixed BLOCK-1756465473877 (2 nights)');
    
    // Fix BLOCK-1756723335108 (3 nights: Sep 22 - Sep 25)
    // Outbound flight
    await prisma.flight.update({
      where: { id: 'PC342-335108' },
      data: {
        departureTime: new Date('2025-09-22T10:00:00'),
        arrivalTime: new Date('2025-09-22T13:00:00') // 3 hour flight
      }
    });
    
    // Return flight
    await prisma.flight.update({
      where: { id: 'PC341-335108' },
      data: {
        departureTime: new Date('2025-09-25T14:00:00'),
        arrivalTime: new Date('2025-09-25T17:00:00') // 3 hour flight
      }
    });
    
    console.log('Fixed BLOCK-1756723335108 (3 nights)');
    
    // Now test the nights calculation
    console.log('\n=== Testing nights calculation after fix ===');
    
    const blocks = [
      { id: 'BLOCK-1756420659794', expected: 2 },
      { id: 'BLOCK-1756465473877', expected: 2 },
      { id: 'BLOCK-1756723335108', expected: 3 }
    ];
    
    for (const block of blocks) {
      const flights = await prisma.flight.findMany({
        where: { blockGroupId: block.id },
        orderBy: { departureTime: 'asc' }
      });
      
      if (flights.length >= 2) {
        const outbound = flights[0];
        const returnFlight = flights[1];
        
        const checkIn = new Date(outbound.arrivalTime);
        const checkOut = new Date(returnFlight.departureTime);
        const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`${block.id}: ${nights} nights (expected: ${block.expected})`);
        console.log(`  Check-in: ${checkIn.toISOString()}`);
        console.log(`  Check-out: ${checkOut.toISOString()}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFlightTimes();