const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePackageDates() {
  console.log('Updating package dates to be available now...\n');

  try {
    // Set dates to be available from yesterday to 3 months from now
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const updated = await prisma.package.updateMany({
      where: { active: true },
      data: {
        availableFrom: yesterday,
        availableTo: threeMonthsFromNow
      }
    });

    console.log(`Updated ${updated.count} package(s)`);
    console.log(`New available from: ${yesterday.toISOString()}`);
    console.log(`New available to: ${threeMonthsFromNow.toISOString()}`);

  } catch (error) {
    console.error('Error updating package dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePackageDates();