import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRecalculate() {
  const packageId = 'cmewubs960001svvhx7pbi70p';
  
  // Get package details
  const pkg = await prisma.package.findUnique({
    where: { id: packageId }
  });
  
  console.log('Package:', pkg?.name);
  console.log('Profit Margin:', pkg?.profitMargin, '%');
  console.log('Service Charge:', pkg?.serviceCharge);
  
  // Get package prices
  const prices = await prisma.packagePrice.findMany({
    where: { packageId: packageId },
    take: 5,
    orderBy: { adults: 'asc' }
  });
  
  console.log('\nCurrent Prices (first 5):');
  
  prices.forEach(price => {
    const baseCost = Number(price.flightPrice) + Number(price.hotelPrice) + Number(price.transferPrice);
    console.log(`  ${price.adults} Adults, ${price.children} Children:`);
    console.log(`    Flight: €${price.flightPrice}, Hotel: €${price.hotelPrice}, Transfer: €${price.transferPrice}`);
    console.log(`    Base Cost: €${baseCost}`);
    console.log(`    Total Price: €${price.totalPrice}`);
    console.log(`    Profit: €${Number(price.totalPrice) - baseCost}`);
    console.log(`    Profit %: ${baseCost > 0 ? ((Number(price.totalPrice) - baseCost) / baseCost * 100).toFixed(1) : '0.0'}%`);
  });
  
  // Now let's recalculate with 0% profit margin
  console.log('\n--- Recalculating with 0% profit margin ---\n');
  
  // Update profit margin to 0
  await prisma.package.update({
    where: { id: packageId },
    data: { profitMargin: 0 }
  });
  
  // Get hotel pricing for reference
  const hotelPrice = await prisma.hotelPrice.findFirst({
    where: {
      hotel: {
        packages: {
          some: { id: packageId }
        }
      }
    }
  });
  
  console.log('Hotel pricing reference:');
  console.log('  Single room:', hotelPrice?.single);
  console.log('  Double room:', hotelPrice?.double);
  console.log('  Kids payment:', hotelPrice?.paymentKids);
  
  await prisma.$disconnect();
}

testRecalculate().catch(console.error);