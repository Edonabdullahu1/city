interface WhatsAppMessage {
  to: string;
  message: string;
  bookingDetails?: any;
}

export class WhatsAppService {
  private static N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

  static async sendMessage(data: WhatsAppMessage): Promise<boolean> {
    try {
      if (!this.N8N_WEBHOOK_URL) {
        console.log('WhatsApp (n8n webhook not configured):', {
          to: data.to,
          message: data.message
        });
        return true; // Return true in dev to not block flow
      }

      // Send to n8n webhook
      const response = await fetch(this.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: data.to,
          message: data.message,
          bookingDetails: data.bookingDetails,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('WhatsApp message sent via n8n:', result);
      return true;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  static async sendBookingConfirmation(booking: any): Promise<boolean> {
    const message = this.formatBookingConfirmation(booking);
    return this.sendMessage({
      to: booking.customerPhone,
      message,
      bookingDetails: booking
    });
  }

  static async sendBookingReminder(booking: any): Promise<boolean> {
    const message = this.formatBookingReminder(booking);
    return this.sendMessage({
      to: booking.customerPhone,
      message,
      bookingDetails: booking
    });
  }

  static async sendBookingCancellation(booking: any): Promise<boolean> {
    const message = this.formatBookingCancellation(booking);
    return this.sendMessage({
      to: booking.customerPhone,
      message,
      bookingDetails: booking
    });
  }

  static async sendSoftBookingExpiring(booking: any): Promise<boolean> {
    const message = this.formatSoftBookingExpiring(booking);
    return this.sendMessage({
      to: booking.customerPhone,
      message,
      bookingDetails: booking
    });
  }

  // Message formatters
  private static formatBookingConfirmation(booking: any): string {
    return `
🎉 *Booking Confirmed!*

Reservation Code: *${booking.reservationCode}*
Name: ${booking.customerName}
Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}
Check-out: ${new Date(booking.checkOutDate).toLocaleDateString()}
Total: €${(booking.totalAmount / 100).toFixed(2)}

✈️ *Flight Details:*
${booking.flightDetails ? this.formatFlightInfo(booking.flightDetails) : 'No flights selected'}

🏨 *Hotel Details:*
${booking.hotelDetails ? this.formatHotelInfo(booking.hotelDetails) : 'No hotel selected'}

📧 Check your email for tickets and vouchers.

Thank you for choosing MXi Travel! 🌟
`.trim();
  }

  private static formatBookingReminder(booking: any): string {
    const daysUntil = Math.ceil((new Date(booking.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return `
⏰ *Travel Reminder!*

Your trip is in *${daysUntil} days*!

Reservation: *${booking.reservationCode}*
Check-in: ${new Date(booking.checkInDate).toLocaleDateString()}
Destination: ${booking.destination || 'Your selected destination'}

Don't forget:
✅ Check-in online 24h before flight
✅ Valid passport/ID
✅ Travel insurance
✅ Hotel voucher (check email)

Safe travels! ✈️
`.trim();
  }

  private static formatBookingCancellation(booking: any): string {
    return `
❌ *Booking Cancelled*

Reservation Code: *${booking.reservationCode}*
Name: ${booking.customerName}

Your booking has been cancelled as requested.
Refund will be processed within 5-7 business days.

For assistance, contact our support team.

MXi Travel Support
`.trim();
  }

  private static formatSoftBookingExpiring(booking: any): string {
    return `
⚠️ *Booking Expiring Soon!*

Reservation: *${booking.reservationCode}*
Name: ${booking.customerName}

Your booking hold expires in *30 minutes*!

Complete payment now to secure your reservation:
- Bank Transfer to: [Bank Details]
- Reference: ${booking.reservationCode}
- Amount: €${(booking.totalAmount / 100).toFixed(2)}

Act now or lose this booking! ⏱️
`.trim();
  }

  private static formatFlightInfo(flightDetails: any): string {
    if (typeof flightDetails === 'string') {
      try {
        flightDetails = JSON.parse(flightDetails);
      } catch {
        return flightDetails;
      }
    }

    const outbound = flightDetails.outbound;
    const inbound = flightDetails.return;

    let info = '';
    if (outbound) {
      info += `Outbound: ${outbound.flightNumber} on ${new Date(outbound.departure).toLocaleDateString()}\n`;
      info += `${outbound.origin} → ${outbound.destination}\n`;
    }
    if (inbound) {
      info += `Return: ${inbound.flightNumber} on ${new Date(inbound.departure).toLocaleDateString()}\n`;
      info += `${inbound.origin} → ${inbound.destination}`;
    }
    return info || 'Flight details pending';
  }

  private static formatHotelInfo(hotelDetails: any): string {
    if (typeof hotelDetails === 'string') {
      try {
        hotelDetails = JSON.parse(hotelDetails);
      } catch {
        return hotelDetails;
      }
    }

    return `${hotelDetails.name || 'Hotel'} - ${hotelDetails.roomType || 'Standard Room'}`;
  }
}