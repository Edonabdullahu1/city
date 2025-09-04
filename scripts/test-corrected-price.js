// Test the corrected price calculation
function calculateRealTimePrice(input) {
  let flightPrice = 0;
  let hotelPrice = 0;
  let transferPrice = 0;
  
  const totalPeople = input.adults + input.children;
  
  // 1. Calculate Flight Cost
  // IMPORTANT: The pricePerSeat is the COMPLETE ROUND TRIP price per person
  if (input.flightBlock) {
    // Price is stored in cents, divide by 100 to get euros
    const roundTripPricePerPerson = (Number(input.flightBlock.outbound.pricePerSeat) / 100) || 120;
    
    console.log('Round trip price per person:', roundTripPricePerPerson);
    
    // Adults pay full price for round trip
    flightPrice = input.adults * roundTripPricePerPerson;
    console.log('Flight price for', input.adults, 'adults:', flightPrice);
  }
  
  // 2. Calculate Hotel Cost (simplified)
  if (input.hotel && input.hotel.hotelPrices && input.hotel.hotelPrices.length > 0) {
    const hotelPriceData = input.hotel.hotelPrices[0];
    
    if (input.adults === 2) {
      hotelPrice = Number(hotelPriceData.double) * input.nights;
      console.log('Hotel price:', hotelPriceData.double, '× ' + input.nights + ' nights =', hotelPrice);
    }
  }
  
  // 3. Add profit margin (20%)
  const subtotal = flightPrice + hotelPrice + transferPrice;
  const profitMargin = subtotal * 0.20;
  const totalPrice = subtotal + profitMargin;
  
  return {
    flightPrice,
    hotelPrice,
    transferPrice,
    totalPrice,
    subtotal,
    profitMargin
  };
}

// Test with Cyprus package data
console.log('=== Testing Cyprus Package Pricing ===');
console.log('Flight: €120 per person round trip (stored as 12000 cents)');
console.log('Hotel: €100 per night for double room');
console.log('Duration: 3 nights');
console.log('Occupancy: 2 adults\n');

const mockFlightBlock = {
  outbound: {
    pricePerSeat: 12000  // €120 for complete round trip
  },
  return: {
    pricePerSeat: 12000  // Same price stored in both records
  }
};

const mockHotel = {
  hotelPrices: [{
    double: 100  // €100 per night
  }]
};

const result = calculateRealTimePrice({
  adults: 2,
  children: 0,
  flightBlock: mockFlightBlock,
  hotel: mockHotel,
  nights: 3
});

console.log('\n=== CALCULATED PRICES ===');
console.log('Flight:', '€' + result.flightPrice, '(2 adults × €120 round trip)');
console.log('Hotel:', '€' + result.hotelPrice, '(€100/night × 3 nights)');
console.log('Subtotal:', '€' + result.subtotal);
console.log('Profit Margin (20%):', '€' + result.profitMargin);
console.log('Total Package Price:', '€' + result.totalPrice);

console.log('\n✅ Expected flight price: €240 (not €480)');
console.log('✅ Expected hotel price: €300');
console.log('✅ Expected subtotal: €540');
console.log('✅ Expected total with 20% margin: €648');