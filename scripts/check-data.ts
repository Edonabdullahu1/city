const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('Checking database data...\n');

  try {
    // Check cities
    console.log('=== CITIES ===');
    const cities = await prisma.city.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    });
    console.log(`Active cities: ${cities.length}`);
    cities.forEach((city: any) => {
      console.log(`  - ${city.name} (slug: ${city.slug}, packages: ${city._count.packages})`);
    });

    // Check hotels
    console.log('\n=== HOTELS ===');
    const hotels = await prisma.hotel.findMany({
      where: { active: true },
      include: {
        city: true,
        _count: {
          select: { packages: true }
        }
      }
    });
    console.log(`Active hotels: ${hotels.length}`);
    hotels.forEach((hotel: any) => {
      console.log(`  - ${hotel.name} in ${hotel.city?.name || 'No city'} (slug: ${hotel.slug}, packages: ${hotel._count.packages})`);
    });

    // Check packages
    console.log('\n=== PACKAGES ===');
    const packages = await prisma.package.findMany({
      where: { active: true },
      include: {
        city: true,
        hotel: true
      }
    });
    console.log(`Active packages: ${packages.length}`);
    packages.forEach((pkg: any) => {
      console.log(`  - ${pkg.name} in ${pkg.city?.name || 'No city'} at ${pkg.hotel?.name || 'No hotel'} (slug: ${pkg.slug})`);
    });

    // Check tours/excursions
    console.log('\n=== EXCURSIONS ===');
    const excursions = await prisma.excursion.findMany({
      where: { active: true },
      include: {
        city: true
      }
    });
    console.log(`Active excursions: ${excursions.length}`);
    excursions.forEach((exc: any) => {
      console.log(`  - ${exc.title} in ${exc.city?.name || 'No city'} (€${exc.price})`);
    });

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();