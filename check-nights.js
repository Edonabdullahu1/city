const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  const prices = await prisma.packagePrice.findMany({
    where: { 
      packageId: 'cmewubs960001svvhx7pbi70p',
      adults: 2,
      children: 0
    },
    select: {
      flightBlockId: true,
      nights: true,
      flightPrice: true,
      hotelPrice: true,
      totalPrice: true,
      hotelName: true
    },
    orderBy: [
      { flightBlockId: 'asc' },
      { hotelName: 'asc' }
    ]
  });
  
  console.log('Prices in database for 2 adults, 0 children:');
  prices.forEach(p => {
    console.log(`Block: ${p.flightBlockId}, Hotel: ${p.hotelName}, Nights: ${p.nights}, Flight: €${p.flightPrice}, Hotel: €${p.hotelPrice}, Total: €${p.totalPrice}`);
  });
  
  // Group by flight block to see the pattern
  const byBlock = {};
  prices.forEach(p => {
    if (!byBlock[p.flightBlockId]) {
      byBlock[p.flightBlockId] = { nights: p.nights, flightPrice: p.flightPrice, hotels: [] };
    }
    byBlock[p.flightBlockId].hotels.push(p.hotelName);
  });
  
  console.log('\nSummary by flight block:');
  Object.entries(byBlock).forEach(([blockId, info]) => {
    console.log(`Block ${blockId}: ${info.nights} nights, Flight €${info.flightPrice}, Hotels: ${info.hotels.join(', ')}`);
  });
  
  await prisma.$disconnect();
}

checkPrices().catch(console.error);