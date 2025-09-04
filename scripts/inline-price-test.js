// Inline the calculation logic from real-time-price-calculator.ts
function calculateRealTimePrice(input) {
  let flightPrice = 0;
  let hotelPrice = 0;
  let transferPrice = 0;
  
  const totalPeople = input.adults + input.children;
  
  // 1. Calculate Flight Cost
  if (input.flightBlock) {
    // IMPORTANT: Flight prices are stored in cents in the database, so divide by 100
    const outboundPrice = (Number(input.flightBlock.outbound.pricePerSeat) / 100) || 60;
    const returnPrice = (Number(input.flightBlock.return?.pricePerSeat) / 100) || 60;
    
    console.log('Outbound price per seat (converted from cents):', outboundPrice);
    console.log('Return price per seat (converted from cents):', returnPrice);
    
    // Adults pay full price
    flightPrice = input.adults * (outboundPrice + returnPrice);
    console.log('Flight price for', input.adults, 'adults:', flightPrice);
  }
  
  // 2. Calculate Hotel Cost
  if (input.hotel && input.hotel.hotelPrices && input.hotel.hotelPrices.length > 0) {
    const hotelPriceData = input.hotel.hotelPrices[0];
    
    if (input.adults === 2) {
      // Double room
      hotelPrice = Number(hotelPriceData.double) * input.nights;
      console.log('Hotel price (double room):', hotelPriceData.double, '×', input.nights, 'nights =', hotelPrice);
    }
  }
  
  // 3. Add profit margin (20%)
  const subtotal = flightPrice + hotelPrice + transferPrice;
  const profitMargin = subtotal * 0.20;
  const totalPrice = subtotal + profitMargin;
  
  console.log('Subtotal:', subtotal);
  console.log('Profit margin (20%):', profitMargin);
  console.log('Total price:', totalPrice);
  
  return {
    flightPrice,
    hotelPrice,
    transferPrice,
    totalPrice,
    breakdown: {
      flightPerPerson: flightPrice / Math.max(1, totalPeople),
      hotelPerNight: hotelPrice / Math.max(1, input.nights),
      childrenCost: 0
    }
  };
}

// Test with mock flight block data - simulating database values
const mockFlightBlock = {
  blockGroupId: 'TEST-123',
  outbound: {
    pricePerSeat: 24000  // €240 stored as 24000 cents
  },
  return: {
    pricePerSeat: 24000  // €240 stored as 24000 cents
  }
};

const mockHotel = {
  id: 'hotel-1',
  name: 'Test Hotel',
  hotelPrices: [{
    single: 100,
    double: 160,
    extraBed: 100,
    paymentKids: 30,
    fromDate: '2024-01-01',
    tillDate: '2024-12-31',
    board: 'BB'
  }]
};

console.log('=== Testing price calculation ===');
console.log('Input: 2 adults, 3 nights');
console.log('Flight data: €240 per seat (stored as 24000 cents)');
console.log('Hotel data: €160 per night for double room');
console.log('');

const result = calculateRealTimePrice({
  adults: 2,
  children: 0,
  childAges: [],
  flightBlock: mockFlightBlock,
  hotel: mockHotel,
  nights: 3,
  travelDate: new Date('2024-11-04')
});

console.log('\n=== RESULTS ===');
console.log('Flight price:', result.flightPrice, '(expected: €480 for 2 adults round trip)');
console.log('Hotel price:', result.hotelPrice, '(expected: €480 for 3 nights)');
console.log('Total price with 20% margin:', result.totalPrice);