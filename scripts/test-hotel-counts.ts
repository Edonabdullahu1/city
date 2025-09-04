const fetch = require('node-fetch');

async function testHotelCounts() {
  try {
    const response = await fetch('http://localhost:3000/api/public/hotels');
    const hotels = await response.json();
    
    console.log('Hotel Package Counts:');
    console.log('-------------------');
    hotels.forEach((hotel: any) => {
      console.log(`${hotel.name}: ${hotel._count.packages} package(s)`);
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
  }
}

testHotelCounts();