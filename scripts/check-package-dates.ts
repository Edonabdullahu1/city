const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPackageDates() {
  console.log('Checking package dates...\n');

  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      include: {
        city: true,
        hotel: true,
        departureFlight: {
          select: {
            departureTime: true,
            arrivalTime: true
          }
        },
        returnFlight: {
          select: {
            departureTime: true
          }
        }
      }
    });

    const now = new Date();
    console.log(`Current date: ${now.toISOString()}\n`);

    packages.forEach((pkg: any) => {
      console.log(`Package: ${pkg.name}`);
      console.log(`  City: ${pkg.city?.name || 'None'}`);
      console.log(`  Hotel: ${pkg.hotel?.name || 'None'}`);
      console.log(`  Available From: ${pkg.availableFrom}`);
      console.log(`  Available To: ${pkg.availableTo}`);
      console.log(`  Is in date range: ${pkg.availableFrom <= now && pkg.availableTo >= now}`);
      if (pkg.departureFlight) {
        console.log(`  Departure Flight: ${pkg.departureFlight.departureTime}`);
      } else {
        console.log(`  Departure Flight: None`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error checking package dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPackageDates();