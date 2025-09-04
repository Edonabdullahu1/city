"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const real_time_price_calculator_js_1 = require("../lib/real-time-price-calculator.js");
// Test with mock flight block data
const mockFlightBlock = {
    blockGroupId: 'TEST-123',
    outbound: {
        pricePerSeat: 24000 // €240 stored as cents
    },
    return: {
        pricePerSeat: 24000 // €240 stored as cents
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
// Test for 2 adults
const result = (0, real_time_price_calculator_js_1.calculateRealTimePrice)({
    adults: 2,
    children: 0,
    childAges: [],
    flightBlock: mockFlightBlock,
    hotel: mockHotel,
    nights: 3,
    travelDate: new Date('2024-11-04')
});
console.log('Test calculation for 2 adults, 3 nights:');
console.log('Flight price:', result.flightPrice, '(should be €240 for 2 adults)');
console.log('Hotel price:', result.hotelPrice, '(should be €480 for double room × 3 nights)');
console.log('Total price:', result.totalPrice);
console.log('\nBreakdown:');
console.log('- Flight per person:', result.breakdown.flightPerPerson);
console.log('- Hotel per night:', result.breakdown.hotelPerNight);
