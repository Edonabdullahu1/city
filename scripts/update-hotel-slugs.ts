const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateHotelSlugs() {
  console.log('Updating hotel slugs...\n');

  try {
    // Get all hotels
    const hotels = await prisma.hotel.findMany();
    
    let updatedCount = 0;
    
    for (const hotel of hotels) {
      if (!hotel.slug) {
        // Generate slug from hotel name
        const slug = hotel.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-')          // Replace spaces with hyphens
          .replace(/-+/g, '-')           // Replace multiple hyphens with single
          .trim();
        
        const updated = await prisma.hotel.update({
          where: { id: hotel.id },
          data: { slug }
        });
        
        console.log(`Updated ${hotel.name}:`);
        console.log(`  Slug: ${slug}`);
        updatedCount++;
      } else {
        console.log(`${hotel.name} already has slug: ${hotel.slug}`);
      }
    }

    console.log(`\nHotel slugs update complete!`);
    console.log(`Updated ${updatedCount} hotels`);

  } catch (error) {
    console.error('Error updating hotels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateHotelSlugs();