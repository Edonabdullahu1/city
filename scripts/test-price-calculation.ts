import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Copy of price calculation functions for testing
function calculateDisplayPrice(
  packagePrices: Array<{ adults: number; children: number; totalPrice: number | string }>,
  basePrice?: number
): number {
  // Find the lowest price for 2 adults, 0 children (standard double occupancy)
  const doubleOccupancyPrices = packagePrices.filter(
    p => p.adults === 2 && p.children === 0
  );

  let minPrice: number;

  if (doubleOccupancyPrices.length > 0) {
    // Get the lowest double occupancy price
    const lowestDoublePrice = Math.min(
      ...doubleOccupancyPrices.map(p => Number(p.totalPrice))
    );
    // Divide by 2 to get per person price
    minPrice = lowestDoublePrice / 2;
  } else if (packagePrices.length > 0) {
    // Fallback: if no double occupancy, use any 2-adult price or calculate from available prices
    const twoAdultPrices = packagePrices.filter(p => p.adults === 2);
    if (twoAdultPrices.length > 0) {
      const lowestTwoAdultPrice = Math.min(
        ...twoAdultPrices.map(p => Number(p.totalPrice))
      );
      minPrice = lowestTwoAdultPrice / 2;
    } else {
      // Last resort: use the absolute minimum and adjust
      const absoluteMin = Math.min(...packagePrices.map(p => Number(p.totalPrice)));
      const firstPrice = packagePrices.find(p => Number(p.totalPrice) === absoluteMin);
      if (firstPrice && firstPrice.adults > 0) {
        // Adjust for double occupancy estimate
        minPrice = (absoluteMin / firstPrice.adults) * 1.1; // Add 10% for double occupancy estimate
      } else {
        minPrice = absoluteMin;
      }
    }
  } else if (basePrice) {
    // Use base price as fallback
    minPrice = basePrice / 2;
  } else {
    // Default fallback
    minPrice = 299;
  }

  // Round to nearest 9
  return roundToNearestNine(minPrice);
}

function roundToNearestNine(price: number): number {
  // Round to nearest integer first
  const rounded = Math.round(price);
  
  // Get the last digit
  const lastDigit = rounded % 10;
  
  // Calculate adjustment needed
  let adjustment: number;
  if (lastDigit === 9) {
    adjustment = 0; // Already ends in 9
  } else if (lastDigit < 4) {
    adjustment = 9 - lastDigit - 10; // Round down to previous 9
  } else {
    adjustment = 9 - lastDigit; // Round up to next 9
  }
  
  const result = rounded + adjustment;
  
  // Ensure we don't go below 99
  return Math.max(99, result);
}

async function main() {
  // Test rounding function
  console.log('Testing roundToNearestNine:');
  const testPrices = [264, 267, 195, 220, 244, 150, 99, 305, 132];
  testPrices.forEach(price => {
    console.log(`  ${price} -> ${roundToNearestNine(price)}`);
  });

  console.log('\n=================================');
  
  // Find Istanbul package and test calculation
  const istanbulPackage = await prisma.package.findFirst({
    where: {
      city: {
        slug: 'istanbul'
      }
    },
    include: {
      packagePrices: true
    }
  });

  if (istanbulPackage) {
    console.log('Istanbul Package Price Calculation:');
    console.log('Package:', istanbulPackage.name);
    
    // Find double occupancy prices
    const doubleOccupancy = istanbulPackage.packagePrices.filter(
      p => p.adults === 2 && p.children === 0
    );
    
    if (doubleOccupancy.length > 0) {
      const lowestDouble = Math.min(...doubleOccupancy.map(p => Number(p.totalPrice)));
      console.log(`\nLowest 2-adult total price: €${lowestDouble}`);
      console.log(`Per person (raw): €${lowestDouble / 2}`);
      
      // Show the hotel for this price
      const lowestPriceEntry = doubleOccupancy.find(p => Number(p.totalPrice) === lowestDouble);
      console.log(`Hotel for lowest price: ${lowestPriceEntry?.hotelName}`);
      console.log(`Flight: €${lowestPriceEntry?.flightPrice}, Hotel: €${lowestPriceEntry?.hotelPrice}`);
    }
    
    const displayPrice = calculateDisplayPrice(
      istanbulPackage.packagePrices as any,
      istanbulPackage.basePrice
    );
    
    console.log(`\nFinal display price: €${displayPrice} per person`);
    console.log('(Based on double occupancy, rounded to nearest 9)');
    
    // Show what was the old calculation
    const oldMinPrice = Math.min(...istanbulPackage.packagePrices.map(p => Number(p.totalPrice)));
    console.log(`\nOld calculation (absolute minimum): €${oldMinPrice}`);
  }

  // Test with Cyprus package if exists
  const cyprusPackage = await prisma.package.findFirst({
    where: {
      name: { contains: 'Cyprus' }
    },
    include: {
      packagePrices: true
    }
  });

  if (cyprusPackage) {
    console.log('\n=================================');
    console.log('Cyprus Package Price Calculation:');
    console.log('Package:', cyprusPackage.name);
    
    const doubleOccupancy = cyprusPackage.packagePrices.filter(
      p => p.adults === 2 && p.children === 0
    );
    
    if (doubleOccupancy.length > 0) {
      const lowestDouble = Math.min(...doubleOccupancy.map(p => Number(p.totalPrice)));
      console.log(`\nLowest 2-adult total price: €${lowestDouble}`);
      console.log(`Per person (raw): €${lowestDouble / 2}`);
      
      const lowestPriceEntry = doubleOccupancy.find(p => Number(p.totalPrice) === lowestDouble);
      console.log(`Hotel for lowest price: ${lowestPriceEntry?.hotelName}`);
    }
    
    const displayPrice = calculateDisplayPrice(
      cyprusPackage.packagePrices as any,
      cyprusPackage.basePrice
    );
    
    console.log(`\nFinal display price: €${displayPrice} per person`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());