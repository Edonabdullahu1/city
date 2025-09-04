import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculatePrices() {
  console.log('🔧 Recalculating package prices with 0% profit margin...');
  
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
    console.log(`Current profit margin: ${testPackage.profitMargin}%`);
    
    // Update profit margin to 0%
    await prisma.package.update({
      where: { id: testPackage.id },
      data: { profitMargin: 0 }
    });
    console.log('✅ Updated profit margin to 0%');

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

        // Add child hotel costs (€50 per child per night)
        if (occupancy.children > 0) {
          hotelCost += 50 * occupancy.children * nights;
        }

        // Transfer cost
        let transferCost = 0;
        if (testPackage.includesTransfer && testPackage.transfer) {
          transferCost = (testPackage.transfer.price / 100) * (occupancy.adults + occupancy.children);
        }

        // Get service charge and profit margin
        const serviceCharge = Number(testPackage.serviceCharge) || 0;
        const profitMargin = 0; // Use 0% profit margin

        // Calculate total with service charge and NO profit margin
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
      
      console.log(`✅ Created ${calculatedPrices.length} new price variations`);
      
      // Show sample prices
      console.log('\n📊 Sample prices (without profit margin):');
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

recalculatePrices();