import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixChildPricing() {
  console.log('🔧 Fixing child pricing in package prices...');

  try {
    // Find the test package
    const testPackage = await prisma.package.findFirst({
      where: { slug: '123' }
    });

    if (!testPackage) {
      console.log('❌ Test package with slug "123" not found');
      return;
    }

    console.log(`✅ Found package: ${testPackage.name}`);

    // Update existing package prices to have proper child pricing
    // The pattern is: children add cost to flights and hotels
    // For hotels: each child adds approximately 50% of adult hotel cost
    
    // Get all package prices for this package
    const packagePrices = await prisma.packagePrice.findMany({
      where: { packageId: testPackage.id }
    });

    for (const price of packagePrices) {
      if (price.children > 0) {
        // Calculate new hotel price with child costs
        // Base hotel price for adults
        const baseHotelPrice = 100 * price.adults;
        // Add 50 per child for hotel (50% of adult rate)
        const childHotelCost = 50 * price.children;
        const newHotelPrice = baseHotelPrice + childHotelCost;
        
        // Update the price
        const updated = await prisma.packagePrice.update({
          where: { id: price.id },
          data: {
            hotelPrice: newHotelPrice,
            totalPrice: Number(price.flightPrice) + newHotelPrice + Number(price.transferPrice)
          }
        });
        
        console.log(`✅ Updated price for ${price.adults} adults, ${price.children} children:`);
        console.log(`   Hotel: ${price.hotelPrice} → ${newHotelPrice}`);
        console.log(`   Total: ${price.totalPrice} → ${updated.totalPrice}`);
      }
    }

    console.log('✅ Child pricing fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing child pricing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixChildPricing();