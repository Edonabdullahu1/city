async function testPackageAPI() {
  try {
    const response = await fetch('http://localhost:3003/api/public/packages/123');
    const data = await response.json();
    
    console.log('Package prices count:', data.packagePrices.length);
    
    // Group prices by flight block
    const pricesByBlock = {};
    data.packagePrices.forEach(price => {
      const key = `${price.flightBlockId || 'unknown'} - ${price.adults}A ${price.children}C - ${price.hotelName}`;
      if (!pricesByBlock[key]) {
        pricesByBlock[key] = [];
      }
      pricesByBlock[key].push({
        flight: price.flightPrice,
        hotel: price.hotelPrice,
        total: price.totalPrice,
        nights: price.nights
      });
    });
    
    console.log('\nPrices by flight block and occupancy:');
    Object.keys(pricesByBlock).forEach(key => {
      console.log(`  ${key}:`);
      pricesByBlock[key].forEach(p => {
        console.log(`    Flight: €${p.flight}, Hotel: €${p.hotel}, Total: €${p.total}, Nights: ${p.nights}`);
      });
    });
    
    // Check for 2 adults, 0 children prices
    const adultsOnly = data.packagePrices.filter(p => p.adults === 2 && p.children === 0);
    console.log('\n2 Adults, 0 Children prices:');
    adultsOnly.forEach(p => {
      console.log(`  ${p.hotelName} (${p.flightBlockId || 'no-block'}): Flight €${p.flightPrice}, Hotel €${p.hotelPrice}, Total €${p.totalPrice}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPackageAPI();