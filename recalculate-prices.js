const fetch = require('node-fetch');

async function recalculatePrices() {
  try {
    console.log('Recalculating package prices...');
    
    const response = await fetch('http://localhost:3002/api/admin/packages/cmewubs960001svvhx7pbi70p/calculate-prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a mock session for testing
        'Cookie': 'next-auth.session-token=test'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', error);
      return;
    }
    
    const result = await response.json();
    console.log('Recalculation complete!');
    console.log(`Total variations calculated: ${result.count}`);
    console.log('\nFlight blocks summary:');
    
    if (result.flightBlocks) {
      result.flightBlocks.forEach(fb => {
        console.log(`  ${fb.blockGroupId}: ${fb.nights} nights, €${fb.flightPrice} per person`);
      });
    }
    
    // Show a sample of calculated prices
    if (result.calculations && result.calculations.length > 0) {
      console.log('\nSample price calculations:');
      
      // Group by flight block
      const byFlightBlock = {};
      result.calculations.forEach(calc => {
        const key = calc.flightBlockId || 'default';
        if (!byFlightBlock[key]) {
          byFlightBlock[key] = [];
        }
        byFlightBlock[key].push(calc);
      });
      
      Object.keys(byFlightBlock).forEach(blockId => {
        console.log(`\n  Flight Block: ${blockId}`);
        const samples = byFlightBlock[blockId].slice(0, 3);
        samples.forEach(calc => {
          console.log(`    ${calc.adults} adults, ${calc.children} children: €${calc.totalPrice.toFixed(2)}`);
          console.log(`      Flight: €${calc.flightPrice}, Hotel: €${calc.hotelPrice}, Transfer: €${calc.transferPrice}`);
          console.log(`      Hotel: ${calc.hotelName}, ${calc.nights} nights`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error recalculating prices:', error);
  }
}

recalculatePrices();