'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  MapPin,
  Users,
  Plane,
  Hotel,
  Car,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  Phone,
  Upload,
  FileText,
  CalendarPlus,
  ArrowLeft,
  Home
} from 'lucide-react';

interface Booking {
  id: string;
  reservationCode: string;
  status: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
  expiresAt?: string;
  passengerDetails?: any;
  flights?: any[];
  hotels?: any[];
  transfers?: any[];
  excursions?: any[];
  packages?: Array<{
    adults: number;
    children: number;
    infants: number;
    checkIn?: string;
    checkOut?: string;
    selectedHotel?: any;
    package?: any;
  }>;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const reservationCode = params.code as string;

  useEffect(() => {
    // Check authentication first
    if (!session) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }
    
    if (reservationCode) {
      fetchBookingDetails();
    }
  }, [reservationCode, session, router]);

  useEffect(() => {
    if (booking?.status === 'SOFT' && booking.expiresAt) {
      const interval = setInterval(() => {
        const remaining = calculateTimeRemaining(booking.expiresAt!);
        setTimeRemaining(remaining);
        
        if (remaining === 'Expired') {
          clearInterval(interval);
          setBooking({ ...booking, status: 'CANCELLED' });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [booking]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${reservationCode}`, {
        headers: {
          'Authorization': `Bearer ${session?.user?.id}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
          return;
        }
        if (response.status === 403) {
          setError('You do not have permission to view this booking');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Booking not found');
      }

      const result = await response.json();
      if (result.success) {
        setBooking(result.booking);
      } else {
        throw new Error(result.message || 'Failed to load booking');
      }
    } catch (err) {
      setError('Unable to load booking details');
      console.error('Booking fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (expiresAt: string): string => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<'kosovo' | 'macedonia'>('kosovo');
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleShowPaymentDetails = () => {
    setShowPaymentDetails(true);
  };

  const handlePaymentProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images and PDFs)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPG, PNG, GIF) or PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPayment(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookingId', booking.id);
      formData.append('reservationCode', booking.reservationCode);

      const response = await fetch('/api/bookings/upload-payment', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setUploadSuccess(true);
        alert('Payment confirmation uploaded successfully! Our team will review it shortly.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('An error occurred while uploading the file');
    } finally {
      setUploadingPayment(false);
    }
  };

  const handleDownloadPDF = async (type: string = 'confirmation') => {
    try {
      const response = await fetch(`/api/bookings/${reservationCode}/pdf?type=${type}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-${reservationCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF');
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${reservationCode}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        setBooking(updatedBooking);
        alert('Booking cancelled successfully.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to cancel booking: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      alert('An error occurred while cancelling the booking');
    }
  };

  const addFlightsToCalendar = async () => {
    try {
      const response = await fetch(`/api/calendar/${booking.reservationCode}`);

      if (!response.ok) {
        alert('Failed to generate calendar file. Please try again.');
        return;
      }

      const icsContent = await response.text();

      // Create blob for the ICS file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const file = new File([blob], `flights-${booking.reservationCode}.ics`, { type: 'text/calendar' });

      // Try to use Web Share API (works well on iOS)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Flight Calendar',
          text: `Flight reminders for booking ${booking.reservationCode}`
        });
      } else {
        // Fallback for desktop and browsers without share API
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flights-${booking.reservationCode}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Calendar download error:', error);
      alert('Failed to add to calendar. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SOFT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-4 w-4" />
            Pending Confirmation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="mr-1 h-4 w-4" />
            Confirmed
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-4 w-4" />
            Paid
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="mr-1 h-4 w-4" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Show loading while session is being checked
  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!session ? 'Authenticating...' : 'Loading booking details...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Booking Not Found</h2>
          <p className="mt-2 text-gray-600">{error || 'The booking you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/bookings/new')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Booking
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Convert from cents
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">Max Travel</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/user/bookings')}
                className="text-gray-600 hover:text-gray-900"
              >
                My Bookings
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          <span className="text-gray-400">/</span>
          <button
            onClick={() => router.push('/user/bookings')}
            className="text-gray-600 hover:text-gray-900"
          >
            My Bookings
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{booking.reservationCode}</span>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Booking #{booking.reservationCode}
              </h1>
              <p className="text-gray-600 mt-1">
                Created on {formatDate(booking.createdAt)}
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge(booking.status)}
              {booking.status === 'SOFT' && booking.expiresAt && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Time remaining:</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {timeRemaining}
                  </p>
                </div>
              )}
            </div>
          </div>

          {booking.status === 'SOFT' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Action Required
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    This is a soft booking that will expire in {timeRemaining}. 
                    Please confirm and pay to secure your reservation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="mr-2" />
            Customer Information
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{booking.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium flex items-center">
                <Mail className="h-4 w-4 mr-1 text-gray-400" />
                {booking.customerEmail}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium flex items-center">
                <Phone className="h-4 w-4 mr-1 text-gray-400" />
                {booking.customerPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Calendar className="mr-2" />
            Trip Details
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-medium">
                {booking.packages?.[0]?.checkIn
                  ? formatDate(booking.packages[0].checkIn)
                  : (booking.checkInDate ? formatDate(booking.checkInDate) : 'TBC')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-medium">
                {booking.packages?.[0]?.checkOut
                  ? formatDate(booking.packages[0].checkOut)
                  : (booking.checkOutDate ? formatDate(booking.checkOutDate) : 'TBC')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Travelers</p>
              <p className="font-medium">
                {booking.packages?.[0] ? (
                  <>
                    {booking.packages[0].adults} Adult{booking.packages[0].adults > 1 ? 's' : ''}
                    {booking.packages[0].children > 0 && `, ${booking.packages[0].children} Child${booking.packages[0].children > 1 ? 'ren' : ''}`}
                    {booking.packages[0].infants > 0 && `, ${booking.packages[0].infants} Infant${booking.packages[0].infants > 1 ? 's' : ''}`}
                  </>
                ) : 'TBC'}
              </p>
            </div>
          </div>

          {/* Passenger Details */}
          {booking.passengerDetails && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Passenger Information</h3>
              <div className="space-y-4">
                {(booking.passengerDetails as any).adults && Array.isArray((booking.passengerDetails as any).adults) && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Adults</p>
                    <div className="grid md:grid-cols-2 gap-2">
                      {(booking.passengerDetails as any).adults.map((adult: any, idx: number) => (
                        <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                          {adult.title} {adult.firstName} {adult.lastName}
                          {adult.dateOfBirth && ` (DOB: ${new Date(adult.dateOfBirth).toLocaleDateString()})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(booking.passengerDetails as any).children && Array.isArray((booking.passengerDetails as any).children) && (booking.passengerDetails as any).children.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Children</p>
                    <div className="grid md:grid-cols-2 gap-2">
                      {(booking.passengerDetails as any).children.map((child: any, idx: number) => (
                        <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                          {child.firstName} {child.lastName}
                          {child.dateOfBirth && ` (DOB: ${new Date(child.dateOfBirth).toLocaleDateString()})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(booking.passengerDetails as any).infants && Array.isArray((booking.passengerDetails as any).infants) && (booking.passengerDetails as any).infants.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Infants</p>
                    <div className="grid md:grid-cols-2 gap-2">
                      {(booking.passengerDetails as any).infants.map((infant: any, idx: number) => (
                        <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                          {infant.firstName} {infant.lastName}
                          {infant.dateOfBirth && ` (DOB: ${new Date(infant.dateOfBirth).toLocaleDateString()})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Services */}
        {booking.flight && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Plane className="mr-2" />
              Flight Details
            </h2>
            <p className="text-gray-600">Flight booking details will be shown here</p>
          </div>
        )}

        {booking.hotel && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Hotel className="mr-2" />
              Hotel Details
            </h2>
            <p className="text-gray-600">Hotel booking details will be shown here</p>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CreditCard className="mr-2" />
            Pricing Details
          </h2>
          <div className="border-t pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Amount</span>
              <span className="text-blue-600">
                {formatCurrency(booking.totalAmount, booking.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Details Modal */}
        {showPaymentDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Payment Details</h3>
                <button
                  onClick={() => setShowPaymentDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">Bank Transfer Instructions</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      Please make a bank transfer to one of our accounts below. Your booking will be confirmed once payment is received.
                    </p>
                  </div>
                </div>
              </div>

              {/* Country Tabs */}
              <div className="flex border-b mb-6">
                <button
                  onClick={() => setSelectedCountry('kosovo')}
                  className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                    selectedCountry === 'kosovo'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇽🇰 Kosovo
                </button>
                <button
                  onClick={() => setSelectedCountry('macedonia')}
                  className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                    selectedCountry === 'macedonia'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇲🇰 Macedonia
                </button>
              </div>

              {/* Kosovo Banks */}
              {selectedCountry === 'kosovo' && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {/* TEB Bank */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">TEB Bank</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">2034 0001 3134 2419</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">XK05 2034 0001 3134 2419</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">TEBKXKPR</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">Agim Ramadani, No. 15, 10000 Prishtina</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>

                  {/* ProCredit Bank Kosovo */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">ProCredit Bank Kosovo</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">1110 3425 4400 0150</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">XK05 1110 3425 4400 0150</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">MBKOXKPRXXX</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">Bulevardi Bill Klinton p.n. Prishtina 10000 Kosovo</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>

                  {/* NLB Banka Kosova */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">NLB Banka Kosova</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">1701 0174 0011 3966</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">XK05 1701 0174 0011 3966</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">NLPRXKPRXXX</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">124 Ukshin Hoti, 10000 Prishtina Kosovo</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>

                  {/* BKT Kosova */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">BKT Kosova</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">1902 9715 4103 1104</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">XK05 1902 9715 4103 1104</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">NCBAXKPRXXX</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">Agim Ramadani, No. 15, 10000 Prishtina</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>

                  {/* Paysera */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">Paysera</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">LT65 3500 0100 1203 5399</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">LT65 3500 0100 1203 5399</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">EVIULT2VXXX</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">Pilaitės pr. 16, LT-04352, Vilnius, Lithuania</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Macedonia Banks */}
              {selectedCountry === 'macedonia' && (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {/* ProCredit Bank Macedonia */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">ProCredit Bank Macedonia</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">380 071 520 600 188</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">MK07 380 071 520 600 188</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">PRBUMK22XXX</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">MANAPO 7 SKOPJE</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>

                  {/* Sparkasse Bank Macedonia */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-bold text-lg mb-4 text-gray-900">Sparkasse Bank Skopje</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder</p>
                        <p className="font-semibold">Max Travel LLC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="font-mono font-semibold">250 010 102 718 406</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IBAN</p>
                        <p className="font-mono font-semibold">MK07 250 010 102 718 406</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">SWIFT/BIC</p>
                        <p className="font-mono font-semibold">INSBMK22</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Bank Address</p>
                        <p className="text-sm">STR ORCE NIKOLOV 54 SKOPJE</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-600">Transfer Terms</p>
                        <p className="text-sm font-medium text-red-600">OUR – ALL EXPENSES BY SENDER</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Amount and Reference */}
              <div className="mt-6 space-y-3">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Amount to Transfer</p>
                  <p className="font-bold text-3xl text-blue-600">
                    {formatCurrency(booking.totalAmount, booking.currency)}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Payment Reference (IMPORTANT!)</p>
                  <p className="font-bold text-2xl text-gray-900">{booking.reservationCode}</p>
                  <p className="text-sm text-gray-700 mt-2">⚠️ Please include this reference number in your bank transfer</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowPaymentDetails(false)}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents Section - Show for CONFIRMED and PAID bookings */}
        {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="mr-2" />
              Travel Documents
            </h2>
            <p className="text-gray-600 mb-4">
              Download your travel documents below. You will need these for your trip.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={`/api/documents/hotel-voucher/${booking.reservationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Hotel Voucher</div>
                    <div className="text-sm text-gray-500">Present this at hotel check-in</div>
                  </div>
                </div>
                <Download className="h-5 w-5 text-gray-400" />
              </a>
              <a
                href={`/api/documents/flight-tickets/${booking.reservationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Flight Tickets</div>
                    <div className="text-sm text-gray-500">Present these at airport check-in</div>
                  </div>
                </div>
                <Download className="h-5 w-5 text-gray-400" />
              </a>
              <button
                onClick={addFlightsToCalendar}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center">
                  <CalendarPlus className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Add to Calendar</div>
                    <div className="text-sm text-gray-500">Flight reminders for your trip</div>
                  </div>
                </div>
                <Download className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Payment Upload Section */}
        {booking.status === 'SOFT' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Upload className="mr-2" />
              Upload Payment Confirmation
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">
                After making the bank transfer, please upload your payment confirmation (receipt, screenshot, or transfer confirmation) here.
                Our team will verify and confirm your booking.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePaymentProofUpload}
                  disabled={uploadingPayment}
                  className="hidden"
                  id="payment-upload"
                />
                <div
                  onClick={() => document.getElementById('payment-upload')?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                    uploadSuccess
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 bg-gray-50'
                  }`}
                >
                  {uploadingPayment ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-gray-600">Uploading...</span>
                    </div>
                  ) : uploadSuccess ? (
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      <span className="font-medium">Payment confirmation uploaded successfully!</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload payment confirmation
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, or PDF (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex gap-4">
            {booking.status === 'SOFT' && (
              <>
                <button
                  onClick={handleShowPaymentDetails}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                >
                  <CreditCard className="mr-2" />
                  Get Payment Details
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                >
                  <XCircle className="mr-2" />
                  Cancel Booking
                </button>
              </>
            )}
            
            {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
              <>
                <button 
                  onClick={() => handleDownloadPDF('confirmation')}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                >
                  <Download className="mr-2" />
                  Download Confirmation
                </button>
                {booking.flight && (
                  <button 
                    onClick={() => handleDownloadPDF('ticket')}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                  >
                    <Download className="mr-2" />
                    Download Ticket
                  </button>
                )}
                {booking.hotel && (
                  <button 
                    onClick={() => handleDownloadPDF('hotel')}
                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition flex items-center justify-center"
                  >
                    <Download className="mr-2" />
                    Download Hotel Voucher
                  </button>
                )}
              </>
            )}

            {booking.status === 'CANCELLED' && (
              <button
                onClick={() => router.push('/bookings/new')}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                Create New Booking
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}