const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPackageHotels() {
  console.log('Checking package-hotel relationships...\n');

  try {
    // Get all packages
    const packages = await prisma.package.findMany({
      include: {
        hotel: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${packages.length} packages:\n`);

    for (const pkg of packages) {
      console.log(`Package: ${pkg.name}`);
      console.log(`  Primary Hotel (hotelId): ${pkg.hotel?.name || 'None'} (${pkg.hotelId})`);
      console.log(`  Additional Hotels (hotelIds): ${pkg.hotelIds ? JSON.stringify(pkg.hotelIds) : 'None'}`);
      console.log('');
    }

    // Check hotels and their package counts
    const hotels = await prisma.hotel.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            packages: true
          }
        }
      }
    });

    console.log('Hotel package counts (using relation):');
    for (const hotel of hotels) {
      console.log(`  ${hotel.name}: ${hotel._count.packages} packages`);
    }

    // Manual count including hotelIds
    console.log('\nManual count (including hotelIds JSON):');
    for (const hotel of hotels) {
      const directPackages = await prisma.package.count({
        where: {
          active: true,
          hotelId: hotel.id
        }
      });

      // Count packages where hotel is in hotelIds array
      const packagesWithHotelIds = await prisma.package.findMany({
        where: {
          active: true,
          hotelIds: {
            not: null
          }
        }
      });

      let additionalCount = 0;
      for (const pkg of packagesWithHotelIds) {
        if (pkg.hotelIds && typeof pkg.hotelIds === 'object') {
          const hotelIdsList = Array.isArray(pkg.hotelIds) ? pkg.hotelIds : 
                               (pkg.hotelIds as any).hotels || [];
          if (hotelIdsList.includes(hotel.id)) {
            additionalCount++;
          }
        }
      }

      const totalCount = directPackages + additionalCount;
      console.log(`  ${hotel.name}: ${totalCount} packages (${directPackages} direct + ${additionalCount} in hotelIds)`);
    }

  } catch (error) {
    console.error('Error checking packages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPackageHotels();