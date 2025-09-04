import puppeteer from 'puppeteer-core';
import { Booking } from '@prisma/client';

export class PDFService {
  /**
   * Generate a booking confirmation PDF
   */
  static async generateBookingConfirmation(booking: any): Promise<Buffer> {
    // For now, generate a simple HTML template
    // In production, you would use puppeteer with Chrome
    const html = this.generateBookingHTML(booking);
    
    // Convert HTML to PDF using puppeteer
    // Note: This requires Chrome/Chromium to be installed
    try {
      // For development, we'll return a mock PDF buffer
      // In production, uncomment the puppeteer code below
      
      /*
      const browser = await puppeteer.launch({
        executablePath: '/path/to/chrome', // Update with actual Chrome path
        headless: true
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        }
      });
      
      await browser.close();
      return pdf;
      */
      
      // Mock PDF buffer for development
      return Buffer.from(html, 'utf-8');
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * Generate HTML template for booking confirmation
   */
  static generateBookingHTML(booking: any): string {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatCurrency = (amount: number, currency: string = 'EUR') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount / 100);
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            
            .header h1 {
              font-size: 32px;
              margin-bottom: 10px;
            }
            
            .reservation-code {
              background: white;
              color: #667eea;
              display: inline-block;
              padding: 10px 20px;
              border-radius: 5px;
              font-size: 24px;
              font-weight: bold;
              margin-top: 15px;
            }
            
            .section {
              background: white;
              padding: 25px;
              margin-bottom: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
            }
            
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: #667eea;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #f0f0f0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            
            .info-item {
              padding: 10px;
              background: #f8f9fa;
              border-radius: 5px;
            }
            
            .info-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            
            .info-value {
              font-size: 16px;
              font-weight: 600;
              color: #333;
            }
            
            .price-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
            }
            
            .price-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            
            .price-total {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              border-top: 2px solid #e0e0e0;
              padding-top: 10px;
              margin-top: 10px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            
            .status-confirmed {
              background: #10b981;
              color: white;
            }
            
            .status-paid {
              background: #059669;
              color: white;
            }
            
            .footer {
              text-align: center;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 0 0 10px 10px;
              font-size: 12px;
              color: #666;
            }
            
            .qr-code {
              text-align: center;
              margin: 20px 0;
            }
            
            .qr-placeholder {
              display: inline-block;
              width: 150px;
              height: 150px;
              background: #f0f0f0;
              border: 2px solid #666;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              line-height: 110px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>Booking Confirmation</h1>
              <p>Your travel package has been successfully booked</p>
              <div class="reservation-code">
                ${booking.reservationCode}
              </div>
            </div>
            
            <!-- Customer Information -->
            <div class="section">
              <h2 class="section-title">Customer Information</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Name</div>
                  <div class="info-value">${booking.customerName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value">${booking.customerEmail}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Phone</div>
                  <div class="info-value">${booking.customerPhone}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Booking Status</div>
                  <div class="info-value">
                    <span class="status-badge status-${booking.status.toLowerCase()}">
                      ${booking.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Trip Details -->
            <div class="section">
              <h2 class="section-title">Trip Details</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Check-in Date</div>
                  <div class="info-value">${formatDate(booking.checkIn)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Check-out Date</div>
                  <div class="info-value">${formatDate(booking.checkOut)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Adults</div>
                  <div class="info-value">${booking.adults}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Children</div>
                  <div class="info-value">${booking.children || 0}</div>
                </div>
              </div>
            </div>
            
            <!-- Flight Details -->
            ${booking.flight ? `
              <div class="section">
                <h2 class="section-title">Flight Information</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Flight Number</div>
                    <div class="info-value">${booking.flight.flightNumber || 'TBA'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Airline</div>
                    <div class="info-value">${booking.flight.airline || 'TBA'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Departure</div>
                    <div class="info-value">${booking.flight.departureTime || 'TBA'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Arrival</div>
                    <div class="info-value">${booking.flight.arrivalTime || 'TBA'}</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            <!-- Hotel Details -->
            ${booking.hotel ? `
              <div class="section">
                <h2 class="section-title">Hotel Information</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Hotel Name</div>
                    <div class="info-value">${booking.hotel.name || 'TBA'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Address</div>
                    <div class="info-value">${booking.hotel.address || 'TBA'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Room Type</div>
                    <div class="info-value">${booking.hotel.roomType || 'Standard'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Check-in Time</div>
                    <div class="info-value">14:00</div>
                  </div>
                </div>
              </div>
            ` : ''}
            
            <!-- Pricing -->
            <div class="section">
              <h2 class="section-title">Payment Summary</h2>
              <div class="price-section">
                ${booking.flight ? `
                  <div class="price-row">
                    <span>Flight</span>
                    <span>${formatCurrency(booking.flight.price || 0)}</span>
                  </div>
                ` : ''}
                ${booking.hotel ? `
                  <div class="price-row">
                    <span>Hotel</span>
                    <span>${formatCurrency(booking.hotel.price || 0)}</span>
                  </div>
                ` : ''}
                <div class="price-row price-total">
                  <span>Total Amount</span>
                  <span>${formatCurrency(booking.totalAmount, booking.currency)}</span>
                </div>
              </div>
            </div>
            
            <!-- QR Code -->
            <div class="section">
              <div class="qr-code">
                <div class="qr-placeholder">
                  QR Code
                </div>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                  Scan this code at check-in for quick verification
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p><strong>Important Information:</strong></p>
              <p>Please bring this confirmation to the airport and hotel for check-in.</p>
              <p>For any questions, contact us at support@travelagency.com</p>
              <br>
              <p>&copy; 2024 Travel Agency. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate a flight ticket PDF
   */
  static async generateFlightTicket(booking: any, flight: any): Promise<Buffer> {
    const html = this.generateFlightTicketHTML(booking, flight);
    // Similar to booking confirmation, convert HTML to PDF
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate HTML template for flight ticket
   */
  static generateFlightTicketHTML(booking: any, flight: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .ticket {
              border: 2px solid #333;
              border-radius: 10px;
              padding: 20px;
              max-width: 600px;
              margin: 20px auto;
            }
            .airline-header {
              background: #003366;
              color: white;
              padding: 15px;
              text-align: center;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .flight-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 20px 0;
            }
            .passenger-info {
              background: #f0f0f0;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .barcode {
              text-align: center;
              padding: 20px;
              background: #fff;
              border: 1px solid #ddd;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="airline-header">
              <h1>BOARDING PASS</h1>
              <p>${flight?.airline || 'AIRLINE'}</p>
            </div>
            
            <div class="passenger-info">
              <h3>PASSENGER</h3>
              <p><strong>${booking.customerName}</strong></p>
              <p>Booking Reference: ${booking.reservationCode}</p>
            </div>
            
            <div class="flight-info">
              <div>
                <p><strong>FROM</strong></p>
                <p>${flight?.departure || 'DEPARTURE'}</p>
              </div>
              <div>
                <p><strong>TO</strong></p>
                <p>${flight?.arrival || 'ARRIVAL'}</p>
              </div>
              <div>
                <p><strong>DATE</strong></p>
                <p>${new Date(booking.checkIn).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>TIME</strong></p>
                <p>${flight?.time || 'TBD'}</p>
              </div>
              <div>
                <p><strong>FLIGHT</strong></p>
                <p>${flight?.flightNumber || 'TBD'}</p>
              </div>
              <div>
                <p><strong>SEAT</strong></p>
                <p>TBD</p>
              </div>
            </div>
            
            <div class="barcode">
              <p>|||||| |||| | |||||||| ||| ||||</p>
              <p>${booking.reservationCode}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate a hotel voucher PDF
   */
  static async generateHotelVoucher(booking: any, hotel: any): Promise<Buffer> {
    const html = this.generateHotelVoucherHTML(booking, hotel);
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate HTML template for hotel voucher
   */
  static generateHotelVoucherHTML(booking: any, hotel: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .voucher {
              border: 2px solid #4CAF50;
              border-radius: 10px;
              padding: 30px;
              max-width: 700px;
              margin: 20px auto;
            }
            .header {
              background: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .hotel-details {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .guest-details {
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              margin: 20px 0;
            }
            .terms {
              font-size: 12px;
              color: #666;
              margin-top: 20px;
              padding: 15px;
              background: #f0f0f0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div class="header">
              <h1>HOTEL VOUCHER</h1>
              <p>Accommodation Confirmation</p>
            </div>
            
            <div class="hotel-details">
              <h2>${hotel?.name || 'Hotel Name'}</h2>
              <p>${hotel?.address || 'Hotel Address'}</p>
              <p>Tel: ${hotel?.phone || '+1234567890'}</p>
            </div>
            
            <div class="guest-details">
              <h3>Guest Information</h3>
              <p><strong>Name:</strong> ${booking.customerName}</p>
              <p><strong>Confirmation:</strong> ${booking.reservationCode}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
              <p><strong>Room Type:</strong> ${hotel?.roomType || 'Standard Room'}</p>
              <p><strong>Guests:</strong> ${booking.adults} Adults, ${booking.children || 0} Children</p>
            </div>
            
            <div class="terms">
              <h4>Terms & Conditions</h4>
              <p>• Check-in time: 14:00 | Check-out time: 11:00</p>
              <p>• This voucher confirms your reservation and must be presented at check-in</p>
              <p>• Cancellation policy as per hotel terms</p>
              <p>• All additional services to be paid directly at the hotel</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}