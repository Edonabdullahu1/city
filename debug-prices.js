const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPrices() {
  const packageId = 'cmewubs960001svvhx7pbi70p';
  
  // Get all prices for 2 adults, 0 children
  const prices = await prisma.packagePrice.findMany({
    where: { 
      packageId,
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
  
  console.log('Database prices for 2 adults, 0 children:\n');
  
  // Group by flight block
  const byBlock = {};
  prices.forEach(p => {
    if (!byBlock[p.flightBlockId]) {
      byBlock[p.flightBlockId] = [];
    }
    byBlock[p.flightBlockId].push(p);
  });
  
  Object.entries(byBlock).forEach(([blockId, blockPrices]) => {
    console.log(`Flight Block: ${blockId}`);
    console.log(`  Nights: ${blockPrices[0].nights}`);
    console.log(`  Flight Price: €${blockPrices[0].flightPrice}`);
    console.log('  Hotels:');
    blockPrices.forEach(p => {
      console.log(`    ${p.hotelName}: Hotel €${p.hotelPrice}, Total €${p.totalPrice}`);
    });
    console.log();
  });
  
  await prisma.$disconnect();
}

debugPrices().catch(console.error);