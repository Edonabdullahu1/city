const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixHotelImages() {
  console.log('Checking hotel images...\n');

  try {
    const hotels = await prisma.hotel.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        images: true,
        primaryImage: true
      }
    });

    console.log(`Found ${hotels.length} active hotels:\n`);
    
    for (const hotel of hotels) {
      console.log(`Hotel: ${hotel.name}`);
      console.log(`  ID: ${hotel.id}`);
      console.log(`  Images: ${JSON.stringify(hotel.images)}`);
      console.log(`  Primary Image: ${hotel.primaryImage}`);
      console.log('');
    }

    // Fix hotels with string "[]" as images
    const hotelsToFix = hotels.filter((h: any) => h.images === '[]' || !h.images);
    
    if (hotelsToFix.length > 0) {
      console.log(`\nFixing ${hotelsToFix.length} hotels with empty images...`);
      
      for (const hotel of hotelsToFix) {
        await prisma.hotel.update({
          where: { id: hotel.id },
          data: { images: [] }
        });
        console.log(`  Fixed: ${hotel.name}`);
      }
    }

  } catch (error) {
    console.error('Error checking hotel images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixHotelImages();