import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Istanbul packages
  const istanbulPackages = await prisma.package.findMany({
    where: {
      city: {
        slug: 'istanbul'
      }
    },
    include: {
      city: true,
      packagePrices: true,
      departureFlight: true,
      returnFlight: true,
      hotel: true
    }
  });

  console.log('Istanbul Packages Found:', istanbulPackages.length);
  
  for (const pkg of istanbulPackages) {
    console.log('\n=================================');
    console.log(`Package: ${pkg.name}`);
    console.log(`Base Price: €${pkg.basePrice}`);
    console.log(`Service Charge: €${pkg.serviceCharge || 0}`);
    console.log(`Profit Margin: ${pkg.profitMargin || 0}%`);
    console.log(`Hotel: ${pkg.hotel?.name}`);
    
    if (pkg.packagePrices && pkg.packagePrices.length > 0) {
      console.log('\nPre-calculated Prices:');
      const sortedPrices = pkg.packagePrices.sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice));
      
      console.log('Lowest Price:', sortedPrices[0]);
      console.log('Minimum Total Price: €' + Math.min(...pkg.packagePrices.map(p => Number(p.totalPrice))));
      
      // Show first 5 prices
      sortedPrices.slice(0, 5).forEach(price => {
        console.log(`  - ${price.adults} adults, ${price.children} children: €${price.totalPrice} (Hotel: ${price.hotelName})`);
      });
    } else {
      console.log('No pre-calculated prices found');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());