// Simple test script for document generation
// Run with: node test-documents.js

const { DocumentService } = require('./lib/services/documentService');
const { BookingService } = require('./lib/services/bookingService');
const fs = require('fs');
const path = require('path');

async function testDocumentGeneration() {
  try {
    console.log('🧪 Testing Document Generation System');
    console.log('=====================================\n');

    // Check if we have sample bookings
    console.log('1. Checking for existing bookings...');
    
    const { bookings } = await BookingService.getBookings({ limit: 5 });
    
    if (bookings.length === 0) {
      console.log('❌ No bookings found. Please create some test bookings first.');
      return;
    }
    
    console.log(`✅ Found ${bookings.length} bookings to test with\n`);
    
    // Test booking confirmation generation
    const testBooking = bookings[0];
    console.log(`2. Testing booking confirmation for ${testBooking.reservationCode}...`);
    
    try {
      const pdfBuffer = await DocumentService.generateBookingConfirmation(
        testBooking.id, 
        { language: 'en', includeQR: true }
      );
      
      // Save to test file
      const testDir = path.join(__dirname, 'test-output');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
      }
      
      const fileName = `booking-confirmation-${testBooking.reservationCode}.pdf`;
      const filePath = path.join(testDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      
      console.log(`✅ Booking confirmation generated: ${filePath}`);
      console.log(`   Size: ${Math.round(pdfBuffer.length / 1024)}KB\n`);
      
    } catch (error) {
      console.log(`❌ Failed to generate booking confirmation: ${error.message}\n`);
    }
    
    // Test individual service documents
    if (testBooking.flights && testBooking.flights.length > 0) {
      console.log(`3. Testing flight ticket generation...`);
      try {
        const flightPdf = await DocumentService.generateFlightTicket(
          testBooking.id,
          testBooking.flights[0].id,
          { language: 'en', includeQR: true }
        );
        
        const fileName = `flight-ticket-${testBooking.reservationCode}.pdf`;
        const filePath = path.join(path.join(__dirname, 'test-output'), fileName);
        fs.writeFileSync(filePath, flightPdf);
        
        console.log(`✅ Flight ticket generated: ${filePath}`);
        console.log(`   Size: ${Math.round(flightPdf.length / 1024)}KB\n`);
        
      } catch (error) {
        console.log(`❌ Failed to generate flight ticket: ${error.message}\n`);
      }
    }
    
    if (testBooking.hotels && testBooking.hotels.length > 0) {
      console.log(`4. Testing hotel voucher generation...`);
      try {
        const hotelPdf = await DocumentService.generateHotelVoucher(
          testBooking.id,
          testBooking.hotels[0].id,
          { language: 'en', includeQR: true }
        );
        
        const fileName = `hotel-voucher-${testBooking.reservationCode}.pdf`;
        const filePath = path.join(path.join(__dirname, 'test-output'), fileName);
        fs.writeFileSync(filePath, hotelPdf);
        
        console.log(`✅ Hotel voucher generated: ${filePath}`);
        console.log(`   Size: ${Math.round(hotelPdf.length / 1024)}KB\n`);
        
      } catch (error) {
        console.log(`❌ Failed to generate hotel voucher: ${error.message}\n`);
      }
    }
    
    // Test multi-language generation
    console.log(`5. Testing multi-language generation (Albanian)...`);
    try {
      const albanianPdf = await DocumentService.generateBookingConfirmation(
        testBooking.id,
        { language: 'al', includeQR: true }
      );
      
      const fileName = `booking-confirmation-${testBooking.reservationCode}-AL.pdf`;
      const filePath = path.join(path.join(__dirname, 'test-output'), fileName);
      fs.writeFileSync(filePath, albanianPdf);
      
      console.log(`✅ Albanian confirmation generated: ${filePath}`);
      console.log(`   Size: ${Math.round(albanianPdf.length / 1024)}KB\n`);
      
    } catch (error) {
      console.log(`❌ Failed to generate Albanian confirmation: ${error.message}\n`);
    }
    
    console.log('🎉 Document generation testing completed!');
    console.log(`📁 Test files saved to: ${path.join(__dirname, 'test-output')}`);
    console.log('\nTo view the generated PDFs, open the files in the test-output directory.\n');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testDocumentGeneration().catch(console.error);
}

module.exports = { testDocumentGeneration };