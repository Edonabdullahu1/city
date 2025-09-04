const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  try {
    const prices = await prisma.packagePrice.findMany({
      where: { packageId: 'cmewubs960001svvhx7pbi70p' },
      take: 5
    });
    
    console.log('Sample prices from database:');
    prices.forEach(p => {
      console.log({
        adults: p.adults,
        children: p.children,
        flightBlockId: p.flightBlockId,
        nights: p.nights,
        flightPrice: p.flightPrice.toString(),
        hotelName: p.hotelName
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrices();