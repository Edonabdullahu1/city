const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
  // Check current prices
  const prices = await prisma.packagePrice.findMany({
    where: { 
      packageId: 'cmewubs960001svvhx7pbi70p',
      adults: 1
    },
    orderBy: { children: 'asc' }
  });
  
  console.log('Current prices for 1 Adult:');
  prices.forEach(p => {
    console.log(`  ${p.adults} Adult, ${p.children} Children (${p.childAges}):`);
    console.log(`    Flight: €${p.flightPrice}`);
    console.log(`    Hotel: €${p.hotelPrice}`);
    console.log(`    Total: €${p.totalPrice}`);
  });
  
  // Check hotel prices
  const hotelPrices = await prisma.hotelPrice.findMany({
    where: {
      hotel: {
        packages: {
          some: { id: 'cmewubs960001svvhx7pbi70p' }
        }
      }
    },
    take: 1
  });
  
  if (hotelPrices[0]) {
    console.log('\nHotel pricing reference:');
    console.log('  Single:', hotelPrices[0].single.toString());
    console.log('  Double:', hotelPrices[0].double.toString());
    console.log('  PayingKidsAge:', hotelPrices[0].payingKidsAge);
    console.log('  PaymentKids:', hotelPrices[0].paymentKids.toString());
  }
  
  await prisma.$disconnect();
}

checkPrices().catch(console.error);