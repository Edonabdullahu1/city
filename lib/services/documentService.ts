import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { BookingService } from './bookingService';

export interface DocumentOptions {
  language?: 'en' | 'al' | 'mk';
  includeQR?: boolean;
  watermark?: string;
}

export interface DocumentMetadata {
  type: 'flight_ticket' | 'hotel_voucher' | 'transfer_voucher' | 'excursion_voucher' | 'booking_confirmation';
  bookingId: string;
  generatedAt: Date;
  language: string;
}

export class DocumentService {
  private static readonly COMPANY_INFO = {
    name: 'City Travel Agency',
    address: '123 Travel Street, Tourism City',
    phone: '+1 234 567 8900',
    email: 'info@citytravel.com',
    website: 'www.citytravel.com'
  };

  /**
   * Generate a complete booking confirmation PDF
   */
  static async generateBookingConfirmation(
    bookingId: string, 
    options: DocumentOptions = {}
  ): Promise<Buffer> {
    const { language = 'en', includeQR = true } = options;
    
    // Get booking details
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Header
    currentY = this.addHeader(doc, currentY, language);
    
    // Booking information
    currentY = this.addBookingInfo(doc, currentY, booking, language);
    
    // Flight details
    if (booking.flights.length > 0) {
      currentY = this.addFlightDetails(doc, currentY, booking.flights, language);
    }
    
    // Hotel details
    if (booking.hotels.length > 0) {
      currentY = this.addHotelDetails(doc, currentY, booking.hotels, language);
    }
    
    // Transfer details
    if (booking.transfers.length > 0) {
      currentY = this.addTransferDetails(doc, currentY, booking.transfers, language);
    }
    
    // Excursion details
    if (booking.excursions.length > 0) {
      currentY = this.addExcursionDetails(doc, currentY, booking.excursions, language);
    }
    
    // Payment information
    currentY = this.addPaymentInfo(doc, currentY, booking, language);
    
    // QR Code
    if (includeQR) {
      await this.addQRCode(doc, currentY, booking.reservationCode);
    }
    
    // Footer
    this.addFooter(doc, language);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate flight ticket PDF
   */
  static async generateFlightTicket(
    bookingId: string, 
    flightId: string, 
    options: DocumentOptions = {}
  ): Promise<Buffer> {
    const { language = 'en', includeQR = true } = options;
    
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const flight = booking.flights.find(f => f.id === flightId);
    if (!flight) {
      throw new Error('Flight not found');
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Header
    currentY = this.addHeader(doc, currentY, language);
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('flight_ticket', language), 20, currentY);
    currentY += 15;
    
    // Flight details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const flightInfo = [
      [`${this.getText('booking_reference', language)}:`, booking.reservationCode],
      [`${this.getText('passenger_name', language)}:`, `${booking.user.firstName} ${booking.user.lastName}`],
      [`${this.getText('flight_number', language)}:`, flight.flightNumber || 'TBA'],
      [`${this.getText('route', language)}:`, `${flight.origin} → ${flight.destination}`],
      [`${this.getText('departure', language)}:`, format(flight.departureDate, 'PPP p')],
      [`${this.getText('return', language)}:`, flight.returnDate ? format(flight.returnDate, 'PPP p') : 'N/A'],
      [`${this.getText('class', language)}:`, flight.class],
      [`${this.getText('passengers', language)}:`, flight.passengers.toString()]
    ];

    flightInfo.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 100, currentY);
      currentY += 8;
    });

    currentY += 10;

    // Important information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('important_info', language), 20, currentY);
    currentY += 5;
    
    doc.setFont('helvetica', 'normal');
    const importantText = this.getText('flight_important_text', language);
    const splitText = doc.splitTextToSize(importantText, 170);
    doc.text(splitText, 20, currentY);
    
    // QR Code
    if (includeQR) {
      await this.addQRCode(doc, 200, `FLIGHT:${booking.reservationCode}:${flightId}`);
    }
    
    this.addFooter(doc, language);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate hotel voucher PDF
   */
  static async generateHotelVoucher(
    bookingId: string, 
    hotelId: string, 
    options: DocumentOptions = {}
  ): Promise<Buffer> {
    const { language = 'en', includeQR = true } = options;
    
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const hotel = booking.hotels.find(h => h.id === hotelId);
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Header
    currentY = this.addHeader(doc, currentY, language);
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('hotel_voucher', language), 20, currentY);
    currentY += 15;
    
    // Hotel details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const hotelInfo = [
      [`${this.getText('booking_reference', language)}:`, booking.reservationCode],
      [`${this.getText('guest_name', language)}:`, `${booking.user.firstName} ${booking.user.lastName}`],
      [`${this.getText('hotel_name', language)}:`, hotel.hotelName],
      [`${this.getText('location', language)}:`, hotel.location],
      [`${this.getText('check_in', language)}:`, format(hotel.checkIn, 'PPP')],
      [`${this.getText('check_out', language)}:`, format(hotel.checkOut, 'PPP')],
      [`${this.getText('room_type', language)}:`, hotel.roomType],
      [`${this.getText('occupancy', language)}:`, hotel.occupancy.toString()],
      [`${this.getText('nights', language)}:`, hotel.nights.toString()],
      [`${this.getText('booking_number', language)}:`, hotel.bookingNumber || 'TBA']
    ];

    hotelInfo.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 100, currentY);
      currentY += 8;
    });

    if (hotel.specialRequests) {
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.getText('special_requests', language)}:`, 20, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      const splitRequests = doc.splitTextToSize(hotel.specialRequests, 170);
      doc.text(splitRequests, 20, currentY);
      currentY += splitRequests.length * 5;
    }

    // QR Code
    if (includeQR) {
      await this.addQRCode(doc, 200, `HOTEL:${booking.reservationCode}:${hotelId}`);
    }
    
    this.addFooter(doc, language);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate transfer voucher PDF
   */
  static async generateTransferVoucher(
    bookingId: string, 
    transferId: string, 
    options: DocumentOptions = {}
  ): Promise<Buffer> {
    const { language = 'en', includeQR = true } = options;
    
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const transfer = booking.transfers.find(t => t.id === transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Header
    currentY = this.addHeader(doc, currentY, language);
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('transfer_voucher', language), 20, currentY);
    currentY += 15;
    
    // Transfer details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const transferInfo = [
      [`${this.getText('booking_reference', language)}:`, booking.reservationCode],
      [`${this.getText('passenger_name', language)}:`, `${booking.user.firstName} ${booking.user.lastName}`],
      [`${this.getText('from_location', language)}:`, transfer.fromLocation],
      [`${this.getText('to_location', language)}:`, transfer.toLocation],
      [`${this.getText('transfer_date', language)}:`, format(transfer.transferDate, 'PPP')],
      [`${this.getText('transfer_time', language)}:`, transfer.transferTime],
      [`${this.getText('vehicle_type', language)}:`, transfer.vehicleType],
      [`${this.getText('passengers', language)}:`, transfer.passengers.toString()],
      [`${this.getText('booking_number', language)}:`, transfer.bookingNumber || 'TBA']
    ];

    transferInfo.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 100, currentY);
      currentY += 8;
    });

    if (transfer.notes) {
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.getText('notes', language)}:`, 20, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(transfer.notes, 170);
      doc.text(splitNotes, 20, currentY);
    }

    // QR Code
    if (includeQR) {
      await this.addQRCode(doc, 200, `TRANSFER:${booking.reservationCode}:${transferId}`);
    }
    
    this.addFooter(doc, language);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate excursion voucher PDF
   */
  static async generateExcursionVoucher(
    bookingId: string, 
    excursionId: string, 
    options: DocumentOptions = {}
  ): Promise<Buffer> {
    const { language = 'en', includeQR = true } = options;
    
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const excursion = booking.excursions.find(e => e.id === excursionId);
    if (!excursion) {
      throw new Error('Excursion not found');
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Header
    currentY = this.addHeader(doc, currentY, language);
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('excursion_voucher', language), 20, currentY);
    currentY += 15;
    
    // Excursion details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const excursionInfo = [
      [`${this.getText('booking_reference', language)}:`, booking.reservationCode],
      [`${this.getText('participant_name', language)}:`, `${booking.user.firstName} ${booking.user.lastName}`],
      [`${this.getText('excursion_title', language)}:`, excursion.title],
      [`${this.getText('location', language)}:`, excursion.location],
      [`${this.getText('excursion_date', language)}:`, format(excursion.excursionDate, 'PPP')],
      [`${this.getText('excursion_time', language)}:`, excursion.excursionTime],
      [`${this.getText('duration', language)}:`, `${Math.floor(excursion.duration / 60)}h ${excursion.duration % 60}m`],
      [`${this.getText('participants', language)}:`, excursion.participants.toString()],
      [`${this.getText('meeting_point', language)}:`, excursion.meetingPoint || 'TBA'],
      [`${this.getText('booking_number', language)}:`, excursion.bookingNumber || 'TBA']
    ];

    excursionInfo.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 100, currentY);
      currentY += 8;
    });

    if (excursion.description) {
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.getText('description', language)}:`, 20, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      const splitDesc = doc.splitTextToSize(excursion.description, 170);
      doc.text(splitDesc, 20, currentY);
    }

    // QR Code
    if (includeQR) {
      await this.addQRCode(doc, 200, `EXCURSION:${booking.reservationCode}:${excursionId}`);
    }
    
    this.addFooter(doc, language);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  // Helper methods

  private static addHeader(doc: jsPDF, currentY: number, language: string): number {
    // Company logo area (placeholder)
    doc.setFillColor(230, 230, 230);
    doc.rect(20, currentY - 5, 170, 25, 'F');
    
    // Company name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(this.COMPANY_INFO.name, 25, currentY + 5);
    
    // Company details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, 25, currentY + 12);
    doc.text(`${this.getText('phone', language)}: ${this.COMPANY_INFO.phone}`, 25, currentY + 16);
    doc.text(`${this.getText('email', language)}: ${this.COMPANY_INFO.email}`, 120, currentY + 16);
    
    return currentY + 35;
  }

  private static addBookingInfo(doc: jsPDF, currentY: number, booking: any, language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('booking_confirmation', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const bookingInfo = [
      [`${this.getText('reservation_code', language)}:`, booking.reservationCode],
      [`${this.getText('customer_name', language)}:`, `${booking.user.firstName} ${booking.user.lastName}`],
      [`${this.getText('email', language)}:`, booking.user.email],
      [`${this.getText('booking_date', language)}:`, format(booking.createdAt, 'PPP p')],
      [`${this.getText('status', language)}:`, this.getText(`status_${booking.status.toLowerCase()}`, language)],
      [`${this.getText('total_amount', language)}:`, `${(booking.totalAmount / 100).toFixed(2)} ${booking.currency}`]
    ];

    bookingInfo.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 100, currentY);
      currentY += 7;
    });

    return currentY + 10;
  }

  private static addFlightDetails(doc: jsPDF, currentY: number, flights: any[], language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('flight_details', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    flights.forEach((flight, index) => {
      if (index > 0) currentY += 5;
      
      const flightInfo = [
        [`${this.getText('flight', language)} ${index + 1}:`, `${flight.origin} → ${flight.destination}`],
        [`${this.getText('departure', language)}:`, format(flight.departureDate, 'PPP p')],
        [`${this.getText('return', language)}:`, flight.returnDate ? format(flight.returnDate, 'PPP p') : 'N/A'],
        [`${this.getText('passengers', language)}:`, flight.passengers.toString()],
        [`${this.getText('class', language)}:`, flight.class],
        [`${this.getText('price', language)}:`, `${(flight.price / 100).toFixed(2)} EUR`]
      ];

      flightInfo.forEach(([label, value]) => {
        doc.text(label, 25, currentY);
        doc.text(value, 85, currentY);
        currentY += 5;
      });
    });

    return currentY + 5;
  }

  private static addHotelDetails(doc: jsPDF, currentY: number, hotels: any[], language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('hotel_details', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    hotels.forEach((hotel, index) => {
      if (index > 0) currentY += 5;
      
      const hotelInfo = [
        [`${this.getText('hotel', language)} ${index + 1}:`, hotel.hotelName],
        [`${this.getText('location', language)}:`, hotel.location],
        [`${this.getText('check_in', language)}:`, format(hotel.checkIn, 'PPP')],
        [`${this.getText('check_out', language)}:`, format(hotel.checkOut, 'PPP')],
        [`${this.getText('room_type', language)}:`, hotel.roomType],
        [`${this.getText('nights', language)}:`, hotel.nights.toString()],
        [`${this.getText('price', language)}:`, `${(hotel.totalPrice / 100).toFixed(2)} EUR`]
      ];

      hotelInfo.forEach(([label, value]) => {
        doc.text(label, 25, currentY);
        doc.text(value, 85, currentY);
        currentY += 5;
      });
    });

    return currentY + 5;
  }

  private static addTransferDetails(doc: jsPDF, currentY: number, transfers: any[], language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('transfer_details', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    transfers.forEach((transfer, index) => {
      if (index > 0) currentY += 5;
      
      const transferInfo = [
        [`${this.getText('transfer', language)} ${index + 1}:`, `${transfer.fromLocation} → ${transfer.toLocation}`],
        [`${this.getText('date_time', language)}:`, `${format(transfer.transferDate, 'PPP')} ${transfer.transferTime}`],
        [`${this.getText('vehicle_type', language)}:`, transfer.vehicleType],
        [`${this.getText('passengers', language)}:`, transfer.passengers.toString()],
        [`${this.getText('price', language)}:`, `${(transfer.price / 100).toFixed(2)} EUR`]
      ];

      transferInfo.forEach(([label, value]) => {
        doc.text(label, 25, currentY);
        doc.text(value, 85, currentY);
        currentY += 5;
      });
    });

    return currentY + 5;
  }

  private static addExcursionDetails(doc: jsPDF, currentY: number, excursions: any[], language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('excursion_details', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    excursions.forEach((excursion, index) => {
      if (index > 0) currentY += 5;
      
      const excursionInfo = [
        [`${this.getText('excursion', language)} ${index + 1}:`, excursion.title],
        [`${this.getText('location', language)}:`, excursion.location],
        [`${this.getText('date_time', language)}:`, `${format(excursion.excursionDate, 'PPP')} ${excursion.excursionTime}`],
        [`${this.getText('duration', language)}:`, `${Math.floor(excursion.duration / 60)}h ${excursion.duration % 60}m`],
        [`${this.getText('participants', language)}:`, excursion.participants.toString()],
        [`${this.getText('price', language)}:`, `${(excursion.totalPrice / 100).toFixed(2)} EUR`]
      ];

      excursionInfo.forEach(([label, value]) => {
        doc.text(label, 25, currentY);
        doc.text(value, 85, currentY);
        currentY += 5;
      });
    });

    return currentY + 5;
  }

  private static addPaymentInfo(doc: jsPDF, currentY: number, booking: any, language: string): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(this.getText('payment_information', language), 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Payment instructions
    const paymentText = this.getText('wire_transfer_instructions', language);
    const splitText = doc.splitTextToSize(paymentText, 170);
    doc.text(splitText, 20, currentY);
    currentY += splitText.length * 5 + 5;
    
    // Bank details
    const bankDetails = [
      `${this.getText('bank_name', language)}: City Travel Bank`,
      `${this.getText('account_number', language)}: CT-123456789`,
      `${this.getText('swift_code', language)}: CTBANK01`,
      `${this.getText('reference', language)}: ${booking.reservationCode}`
    ];
    
    bankDetails.forEach(detail => {
      doc.text(detail, 25, currentY);
      currentY += 5;
    });

    return currentY + 10;
  }

  private static async addQRCode(doc: jsPDF, y: number, data: string): Promise<void> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      doc.addImage(qrCodeDataURL, 'PNG', 150, y - 20, 30, 30);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  private static addFooter(doc: jsPDF, language: string): void {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    
    const footerText = this.getText('document_footer', language);
    doc.text(footerText, 20, pageHeight - 20);
    
    // Date generated
    doc.text(
      `${this.getText('generated_on', language)}: ${format(new Date(), 'PPP p')}`,
      20,
      pageHeight - 10
    );
  }

  private static getText(key: string, language: string): string {
    const translations = {
      en: {
        flight_ticket: 'Flight Ticket',
        hotel_voucher: 'Hotel Voucher',
        transfer_voucher: 'Transfer Voucher',
        excursion_voucher: 'Excursion Voucher',
        booking_confirmation: 'Booking Confirmation',
        booking_reference: 'Booking Reference',
        passenger_name: 'Passenger Name',
        guest_name: 'Guest Name',
        participant_name: 'Participant Name',
        customer_name: 'Customer Name',
        flight_number: 'Flight Number',
        route: 'Route',
        departure: 'Departure',
        return: 'Return',
        class: 'Class',
        passengers: 'Passengers',
        hotel_name: 'Hotel Name',
        location: 'Location',
        check_in: 'Check In',
        check_out: 'Check Out',
        room_type: 'Room Type',
        occupancy: 'Occupancy',
        nights: 'Nights',
        special_requests: 'Special Requests',
        from_location: 'From Location',
        to_location: 'To Location',
        transfer_date: 'Transfer Date',
        transfer_time: 'Transfer Time',
        vehicle_type: 'Vehicle Type',
        excursion_title: 'Excursion Title',
        excursion_date: 'Excursion Date',
        excursion_time: 'Excursion Time',
        duration: 'Duration',
        participants: 'Participants',
        meeting_point: 'Meeting Point',
        description: 'Description',
        booking_number: 'Booking Number',
        reservation_code: 'Reservation Code',
        email: 'Email',
        phone: 'Phone',
        booking_date: 'Booking Date',
        status: 'Status',
        total_amount: 'Total Amount',
        flight_details: 'Flight Details',
        hotel_details: 'Hotel Details',
        transfer_details: 'Transfer Details',
        excursion_details: 'Excursion Details',
        payment_information: 'Payment Information',
        important_info: 'Important Information',
        notes: 'Notes',
        flight: 'Flight',
        hotel: 'Hotel',
        transfer: 'Transfer',
        excursion: 'Excursion',
        date_time: 'Date & Time',
        price: 'Price',
        status_soft: 'Soft Booking',
        status_confirmed: 'Confirmed',
        status_paid: 'Paid',
        status_cancelled: 'Cancelled',
        wire_transfer_instructions: 'Please make payment via wire transfer to the following bank account. Include your reservation code as reference.',
        bank_name: 'Bank Name',
        account_number: 'Account Number',
        swift_code: 'Swift Code',
        reference: 'Reference',
        document_footer: 'This document was generated electronically and is valid without signature.',
        generated_on: 'Generated on',
        flight_important_text: 'Please arrive at the airport at least 2 hours before departure for international flights. Check-in closes 45 minutes before departure.'
      },
      al: {
        flight_ticket: 'Biletë Fluturimi',
        hotel_voucher: 'Kupon Hoteli',
        transfer_voucher: 'Kupon Transferi',
        excursion_voucher: 'Kupon Ekskursioni',
        booking_confirmation: 'Konfirmim Rezervimi',
        booking_reference: 'Referenca Rezervimi',
        passenger_name: 'Emri i Udhëtarit',
        guest_name: 'Emri i Mysafirit',
        participant_name: 'Emri i Pjesëmarrësit',
        customer_name: 'Emri i Klientit',
        flight_number: 'Numri i Fluturimit',
        route: 'Rruga',
        departure: 'Nisja',
        return: 'Kthimi',
        class: 'Klasa',
        passengers: 'Udhëtarë',
        hotel_name: 'Emri i Hotelit',
        location: 'Vendndodhja',
        check_in: 'Regjistrimi',
        check_out: 'Largimi',
        room_type: 'Lloji i Dhomës',
        occupancy: 'Banorja',
        nights: 'Netë',
        special_requests: 'Kërkesa të Veçanta',
        from_location: 'Nga Vendndodhja',
        to_location: 'Në Vendndodhjen',
        transfer_date: 'Data e Transferit',
        transfer_time: 'Ora e Transferit',
        vehicle_type: 'Lloji i Mjetit',
        excursion_title: 'Titulli i Ekskursionit',
        excursion_date: 'Data e Ekskursionit',
        excursion_time: 'Ora e Ekskursionit',
        duration: 'Kohëzgjatja',
        participants: 'Pjesëmarrës',
        meeting_point: 'Pika e Takimit',
        description: 'Përshkrimi',
        booking_number: 'Numri i Rezervimit',
        reservation_code: 'Kodi i Rezervimit',
        email: 'Email',
        phone: 'Telefon',
        booking_date: 'Data e Rezervimit',
        status: 'Statusi',
        total_amount: 'Shuma Totale',
        flight_details: 'Detajet e Fluturimit',
        hotel_details: 'Detajet e Hotelit',
        transfer_details: 'Detajet e Transferit',
        excursion_details: 'Detajet e Ekskursionit',
        payment_information: 'Informacioni i Pagesës',
        important_info: 'Informacion i Rëndësishëm',
        notes: 'Shënime',
        flight: 'Fluturimi',
        hotel: 'Hoteli',
        transfer: 'Transferi',
        excursion: 'Ekskursioni',
        date_time: 'Data dhe Ora',
        price: 'Çmimi',
        status_soft: 'Rezervim i Butë',
        status_confirmed: 'I Konfirmuar',
        status_paid: 'I Paguar',
        status_cancelled: 'I Anulluar',
        wire_transfer_instructions: 'Ju lutemi bëni pagesën përmes transferimit bankar në llogarinë e mëposhtme. Përfshini kodin e rezervimit si referencë.',
        bank_name: 'Emri i Bankës',
        account_number: 'Numri i Llogarisë',
        swift_code: 'Kodi Swift',
        reference: 'Referenca',
        document_footer: 'Ky dokument është gjeneruar elektronikisht dhe është i vlefshëm pa nënshkrim.',
        generated_on: 'Gjeneruar më',
        flight_important_text: 'Ju lutemi mbërrini në aeroport të paktën 2 orë para nisjes për fluturime ndërkombëtare. Check-in mbyllet 45 minuta para nisjes.'
      },
      mk: {
        flight_ticket: 'Авионски Билет',
        hotel_voucher: 'Хотелски Ваучер',
        transfer_voucher: 'Трансферски Ваучер',
        excursion_voucher: 'Екскурзиски Ваучер',
        booking_confirmation: 'Потврда за Резервација',
        booking_reference: 'Референца на Резервација',
        passenger_name: 'Име на Патник',
        guest_name: 'Име на Гост',
        participant_name: 'Име на Учесник',
        customer_name: 'Име на Клиент',
        flight_number: 'Број на Лет',
        route: 'Рута',
        departure: 'Заминување',
        return: 'Враќање',
        class: 'Класа',
        passengers: 'Патници',
        hotel_name: 'Име на Хотел',
        location: 'Локација',
        check_in: 'Пријавување',
        check_out: 'Одјавување',
        room_type: 'Тип на Соба',
        occupancy: 'Зафатеност',
        nights: 'Ноќи',
        special_requests: 'Специјални Барања',
        from_location: 'Од Локација',
        to_location: 'До Локација',
        transfer_date: 'Датум на Трансфер',
        transfer_time: 'Време на Трансфер',
        vehicle_type: 'Тип на Возило',
        excursion_title: 'Наслов на Екскурзија',
        excursion_date: 'Датум на Екскурзија',
        excursion_time: 'Време на Екскурзија',
        duration: 'Траење',
        participants: 'Учесници',
        meeting_point: 'Место на Собир',
        description: 'Опис',
        booking_number: 'Број на Резервација',
        reservation_code: 'Код на Резервација',
        email: 'Емаил',
        phone: 'Телефон',
        booking_date: 'Датум на Резервација',
        status: 'Статус',
        total_amount: 'Вкупна Сума',
        flight_details: 'Детали за Лет',
        hotel_details: 'Детали за Хотел',
        transfer_details: 'Детали за Трансфер',
        excursion_details: 'Детали за Екскурзија',
        payment_information: 'Информации за Плаќање',
        important_info: 'Важни Информации',
        notes: 'Забелешки',
        flight: 'Лет',
        hotel: 'Хотел',
        transfer: 'Трансфер',
        excursion: 'Екскурзија',
        date_time: 'Датум и Време',
        price: 'Цена',
        status_soft: 'Мека Резервација',
        status_confirmed: 'Потврдена',
        status_paid: 'Платена',
        status_cancelled: 'Откажана',
        wire_transfer_instructions: 'Ве молиме извршете плаќање преку банкарски трансфер на следната сметка. Вклучете го кодот на резервација како референца.',
        bank_name: 'Име на Банка',
        account_number: 'Број на Сметка',
        swift_code: 'Swift Код',
        reference: 'Референца',
        document_footer: 'Овој документ е генериран електронски и е важечки без потпис.',
        generated_on: 'Генериран на',
        flight_important_text: 'Ве молиме пристигнете на аеродромот најмалку 2 часа пред заминување за меѓународни летови. Check-in се затвора 45 минути пред заминување.'
      }
    };

    return translations[language as keyof typeof translations]?.[key as keyof typeof translations['en']] || key;
  }
}