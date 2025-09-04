import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculatePricesCorrectly() {
  console.log('🔧 Recalculating package prices with correct child pricing...');
  
  try {
    // Find the test package
    const testPackage = await prisma.package.findFirst({
      where: { slug: '123' },
      include: {
        departureFlight: true,
        returnFlight: true,
        hotel: {
          include: {
            hotelPrices: true
          }
        },
        transfer: true,
        city: true
      }
    });

    if (!testPackage) {
      console.log('❌ Test package with slug "123" not found');
      return;
    }

    console.log(`✅ Found package: ${testPackage.name}`);
    
    // Delete existing pre-calculated prices
    await prisma.packagePrice.deleteMany({
      where: { packageId: testPackage.id }
    });
    console.log('✅ Deleted old prices');

    const calculatedPrices = [];
    
    // Calculate flight dates
    const checkIn = new Date(testPackage.departureFlight.departureTime);
    const checkOut = new Date(testPackage.returnFlight.departureTime);
    const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Get all hotel IDs from the package
    const hotelIds = testPackage.hotelIds as string[] || [testPackage.hotelId];
    
    // Fetch all hotels
    const hotels = await prisma.hotel.findMany({
      where: {
        id: { in: hotelIds }
      },
      include: {
        hotelPrices: {
          where: {
            fromDate: { lte: checkIn },
            tillDate: { gte: checkOut }
          }
        }
      }
    });

    // Define occupancy variations
    const occupancies = [
      { adults: 1, children: 0, childAges: '' },
      { adults: 1, children: 1, childAges: '5' },
      { adults: 2, children: 0, childAges: '' },
      { adults: 2, children: 1, childAges: '5' },
      { adults: 2, children: 2, childAges: '5,10' },
      { adults: 3, children: 0, childAges: '' },
    ];

    // For each hotel
    for (const hotel of hotels) {
      if (hotel.hotelPrices.length === 0) {
        continue; // Skip if no prices available for these dates
      }

      // For each occupancy variation
      for (const occupancy of occupancies) {
        // Fixed flight price: €120 per person return (both ways included)
        const flightPricePerPerson = 120;
        const totalFlightPrice = flightPricePerPerson * (occupancy.adults + occupancy.children);

        // Get hotel price for the date range
        const hotelPrice = hotel.hotelPrices[0]; // Use first available price
        
        // Calculate hotel cost based on occupancy
        let hotelCost = 0;
        let roomType = 'Standard';
        
        if (occupancy.adults === 1) {
          hotelCost = Number(hotelPrice.single) * nights;
          roomType = 'Single';
        } else if (occupancy.adults === 2) {
          hotelCost = Number(hotelPrice.double) * nights;
          roomType = 'Double';
        } else if (occupancy.adults === 3) {
          hotelCost = (Number(hotelPrice.double) + Number(hotelPrice.extraBed)) * nights;
          roomType = 'Triple';
        }

        // Calculate children costs using ACTUAL hotel pricing
        if (occupancy.children > 0 && occupancy.childAges) {
          const ages = occupancy.childAges.split(',').map(a => parseInt(a));
          
          ages.forEach(age => {
            // Parse the paying kids age range (e.g., "7-11")
            const ageRange = hotelPrice.payingKidsAge || '';
            const [minAge, maxAge] = ageRange.split('-').map(a => parseInt(a) || 0);
            
            if (age >= minAge && age <= maxAge && minAge > 0) {
              // Child is in paying age range - use paymentKids price
              const childPricePerNight = Number(hotelPrice.paymentKids);
              hotelCost += childPricePerNight * nights;
              console.log(`  Child age ${age}: €${childPricePerNight}/night (ages ${ageRange})`);
            } else if (age < minAge) {
              // Child is free
              console.log(`  Child age ${age}: FREE (under ${minAge})`);
            } else if (age > maxAge) {
              // Older children might need extra bed
              const extraBedPrice = Number(hotelPrice.extraBed);
              hotelCost += extraBedPrice * nights;
              console.log(`  Child age ${age}: €${extraBedPrice}/night (extra bed)`);
            }
          });
        }

        // Transfer cost
        let transferCost = 0;
        if (testPackage.includesTransfer && testPackage.transfer) {
          transferCost = (testPackage.transfer.price / 100) * (occupancy.adults + occupancy.children);
        }

        // Get service charge and profit margin
        const serviceCharge = Number(testPackage.serviceCharge) || 0;
        const profitMargin = testPackage.profitMargin !== null && testPackage.profitMargin !== undefined 
          ? Number(testPackage.profitMargin) 
          : 0;

        // Calculate total with service charge and profit margin
        const subtotal = totalFlightPrice + hotelCost + transferCost + serviceCharge;
        const profitAmount = subtotal * (profitMargin / 100);
        const totalPrice = subtotal + profitAmount;

        calculatedPrices.push({
          packageId: testPackage.id,
          adults: occupancy.adults,
          children: occupancy.children,
          childAges: occupancy.childAges,
          flightPrice: totalFlightPrice,
          hotelPrice: hotelCost,
          transferPrice: transferCost,
          totalPrice,
          hotelBoard: hotelPrice.board,
          roomType: `${roomType} (${hotelPrice.board})`,
          hotelName: hotel.name
        });
      }
    }

    // Bulk create all price variations
    if (calculatedPrices.length > 0) {
      await prisma.packagePrice.createMany({
        data: calculatedPrices
      });
      
      console.log(`\n✅ Created ${calculatedPrices.length} new price variations`);
      
      // Show sample prices
      console.log('\n📊 Sample prices (with correct child pricing):');
      calculatedPrices.slice(0, 5).forEach(price => {
        console.log(`   ${price.adults}A + ${price.children}C: €${price.totalPrice} (Flight: €${price.flightPrice}, Hotel: €${price.hotelPrice})`);
      });
    }

    console.log('\n✅ Price recalculation completed successfully!');
  } catch (error) {
    console.error('❌ Error recalculating prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculatePricesCorrectly();