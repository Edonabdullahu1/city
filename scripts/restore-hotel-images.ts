const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreHotelImages() {
  console.log('Restoring hotel images...\n');

  try {
    // Sample hotel images for demonstration
    const sampleImages: any = {
      'test': [
        '/uploads/hotels/sample/hotel1-1.jpg',
        '/uploads/hotels/sample/hotel1-2.jpg',
        '/uploads/hotels/sample/hotel1-3.jpg',
        '/uploads/hotels/sample/hotel1-4.jpg'
      ],
      'marriot sisli': [
        '/uploads/hotels/sample/marriott-1.jpg',
        '/uploads/hotels/sample/marriott-2.jpg',
        '/uploads/hotels/sample/marriott-3.jpg',
        '/uploads/hotels/sample/marriott-4.jpg',
        '/uploads/hotels/sample/marriott-5.jpg',
        '/uploads/hotels/sample/marriott-6.jpg'
      ]
    };

    // Get hotels without images
    const hotels = await prisma.hotel.findMany({
      where: { 
        active: true
      }
    });

    // Filter hotels without images
    const hotelsWithoutImages = hotels.filter((hotel: any) => {
      return !hotel.images || (Array.isArray(hotel.images) && hotel.images.length === 0);
    });

    console.log(`Found ${hotelsWithoutImages.length} hotels without images\n`);

    for (const hotel of hotelsWithoutImages) {
      const hotelName = hotel.name.toLowerCase();
      const images = sampleImages[hotelName] as string[] | undefined;
      
      if (images) {
        console.log(`Restoring images for: ${hotel.name}`);
        
        const updatedHotel = await prisma.hotel.update({
          where: { id: hotel.id },
          data: {
            images: images,
            primaryImage: images[0] // Set first image as primary
          }
        });
        
        console.log(`  Added ${images.length} images`);
        console.log(`  Set primary image: ${images[0]}`);
      } else {
        // Use default placeholder images
        const defaultImages = [
          '/uploads/hotels/placeholder/hotel-placeholder-1.jpg',
          '/uploads/hotels/placeholder/hotel-placeholder-2.jpg',
          '/uploads/hotels/placeholder/hotel-placeholder-3.jpg'
        ];
        
        console.log(`Restoring placeholder images for: ${hotel.name}`);
        
        const updatedHotel = await prisma.hotel.update({
          where: { id: hotel.id },
          data: {
            images: defaultImages,
            primaryImage: defaultImages[0]
          }
        });
        
        console.log(`  Added ${defaultImages.length} placeholder images`);
        console.log(`  Set primary image: ${defaultImages[0]}`);
      }
    }

    // Also set primary image for hotels that have images but no primary
    const allHotels = await prisma.hotel.findMany({
      where: {
        active: true,
        primaryImage: null
      }
    });

    const hotelsWithoutPrimary = allHotels.filter((hotel: any) => {
      return hotel.images && Array.isArray(hotel.images) && hotel.images.length > 0;
    });

    console.log(`\nFound ${hotelsWithoutPrimary.length} hotels with images but no primary image`);

    for (const hotel of hotelsWithoutPrimary) {
      const images = Array.isArray(hotel.images) ? hotel.images : [];
      if (images.length > 0) {
        console.log(`Setting primary image for: ${hotel.name}`);
        
        await prisma.hotel.update({
          where: { id: hotel.id },
          data: {
            primaryImage: images[0]
          }
        });
        
        console.log(`  Set primary image: ${images[0]}`);
      }
    }

    console.log('\nImage restoration complete!');

  } catch (error) {
    console.error('Error restoring images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreHotelImages();