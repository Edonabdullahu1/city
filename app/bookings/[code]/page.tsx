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
  Phone
} from 'lucide-react';

interface Booking {
  id: string;
  reservationCode: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
  expiresAt?: string;
  flight?: any;
  hotel?: any;
  transfers?: any[];
  excursions?: any[];
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
    if (reservationCode) {
      fetchBookingDetails();
    }
  }, [reservationCode]);

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
      const response = await fetch(`/api/bookings/${reservationCode}`);
      
      if (!response.ok) {
        throw new Error('Booking not found');
      }

      const data = await response.json();
      setBooking(data);
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

  const handleConfirmBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${reservationCode}/confirm`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        setBooking(updatedBooking);
      } else {
        alert('Failed to confirm booking');
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      alert('An error occurred');
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
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${reservationCode}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        setBooking(updatedBooking);
      } else {
        alert('Failed to cancel booking');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      alert('An error occurred');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
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
              <p className="font-medium">{formatDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-medium">{formatDate(booking.checkOut)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Travelers</p>
              <p className="font-medium">
                {booking.adults} Adults
                {booking.children > 0 && `, ${booking.children} Children`}
                {booking.infants > 0 && `, ${booking.infants} Infants`}
              </p>
            </div>
          </div>
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

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex gap-4">
            {booking.status === 'SOFT' && (
              <>
                <button
                  onClick={handleConfirmBooking}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                >
                  <CheckCircle className="mr-2" />
                  Confirm & Pay
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