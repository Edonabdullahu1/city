const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHotel() {
  try {
    // Check specific hotel
    const hotel = await prisma.hotel.findFirst({
      where: { 
        slug: 'marriot-sisli'
      }
    });
    
    console.log('Hotel found:', hotel);
    
    // Check if searching with active: true
    const activeHotel = await prisma.hotel.findUnique({
      where: { 
        slug: 'marriot-sisli',
        active: true
      }
    });
    
    console.log('\nActive hotel search:', activeHotel);
    
    // List all hotels
    const allHotels = await prisma.hotel.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        active: true
      }
    });
    
    console.log('\nAll hotels:');
    allHotels.forEach(h => {
      console.log(`  ${h.name}: slug="${h.slug}", active=${h.active}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHotel();