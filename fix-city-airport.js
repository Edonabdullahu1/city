const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCityAirport() {
  try {
    // Update Istanbul city to have SAW as its airport code
    const istanbul = await prisma.city.findFirst({
      where: { name: 'Istanbul' }
    });
    
    if (istanbul) {
      await prisma.city.update({
        where: { id: istanbul.id },
        data: { airportCode: 'SAW' }
      });
      console.log('Updated Istanbul airport code to SAW');
    }
    
    // Now fix the calculate-prices logic
    console.log('\nThe correct flight detection logic for Istanbul packages:');
    console.log('- Outbound: Flight arriving at SAW (Istanbul) - e.g., PRN -> SAW');
    console.log('- Return: Flight departing from SAW (Istanbul) - e.g., SAW -> PRN');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCityAirport();