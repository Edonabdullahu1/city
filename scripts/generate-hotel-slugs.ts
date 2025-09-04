import prisma from '../lib/prisma';

async function generateHotelSlugs() {
  try {
    // Get all hotels without slugs
    const hotelsWithoutSlugs = await prisma.hotel.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      }
    });

    console.log(`Found ${hotelsWithoutSlugs.length} hotels without slugs`);

    for (const hotel of hotelsWithoutSlugs) {
      // Generate slug from hotel name
      let slug = hotel.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();

      // Check if slug already exists
      let finalSlug = slug;
      let counter = 1;
      
      while (true) {
        const existing = await prisma.hotel.findFirst({
          where: { 
            slug: finalSlug,
            id: { not: hotel.id }
          }
        });
        
        if (!existing) break;
        
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      // Update hotel with new slug
      await prisma.hotel.update({
        where: { id: hotel.id },
        data: { slug: finalSlug }
      });

      console.log(`Updated hotel "${hotel.name}" with slug: ${finalSlug}`);
    }

    console.log('✅ All hotel slugs generated successfully');
  } catch (error) {
    console.error('Error generating hotel slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateHotelSlugs();