const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCitySlugs() {
  console.log('Updating city slugs and about text...\n');

  try {
    // Find Istanbul first
    const istanbulCity = await prisma.city.findFirst({
      where: { name: 'Istanbul' }
    });

    if (istanbulCity) {
      // Update Istanbul with slug and about text
      const istanbul = await prisma.city.update({
        where: { id: istanbulCity.id },
        data: {
          slug: 'istanbul',
          about: 'Istanbul, Turkey\'s cultural and economic heart, is a magnificent city that bridges Europe and Asia across the Bosphorus Strait. With over 2,500 years of history, it has served as the capital of three great empires - Roman, Byzantine, and Ottoman. Today, Istanbul seamlessly blends ancient heritage with modern dynamism, offering visitors stunning architecture from the Hagia Sophia and Blue Mosque to the bustling Grand Bazaar and contemporary galleries. Experience the unique charm of this transcontinental metropolis where East meets West, tradition meets innovation, and every corner tells a story of centuries past.'
        }
      });

      console.log('Updated Istanbul:');
      console.log(`  Slug: ${istanbul.slug}`);
      console.log(`  About: ${istanbul.about?.substring(0, 100)}...`);
    }

    // Update slugs for all cities that don't have one
    const cities = await prisma.city.findMany();
    
    for (const city of cities) {
      if (!city.slug) {
        const slug = city.name.toLowerCase().replace(/\s+/g, '-');
        const updated = await prisma.city.update({
          where: { id: city.id },
          data: { slug }
        });
        console.log(`Updated ${city.name} slug to: ${slug}`);
      }
    }

    console.log('\nCity slugs update complete!');

  } catch (error) {
    console.error('Error updating cities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCitySlugs();