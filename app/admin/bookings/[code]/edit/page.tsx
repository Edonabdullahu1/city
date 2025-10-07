'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Calendar,
  Users,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Plane,
  Building,
  FileText,
  Trash2,
  Edit3,
  ChevronDown,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface Booking {
  id: string;
  reservationCode: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  infants: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  notes?: string;
  packages?: {
    id: string;
    adults: number;
    children: number;
    infants: number;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    package: {
      id: string;
      name: string;
      hotel: {
        id: string;
        name: string;
        city: {
          name: string;
          country: {
            name: string;
          };
        };
      };
      departureFlight?: {
        id: string;
        flightNumber: string;
        departureTime: string;
        arrivalTime: string;
        departureAirport: {
          code: string;
          name: string;
        };
        arrivalAirport: {
          code: string;
          name: string;
        };
      };
      returnFlight?: {
        id: string;
        flightNumber: string;
        departureTime: string;
        arrivalTime: string;
        departureAirport: {
          code: string;
          name: string;
        };
        arrivalAirport: {
          code: string;
          name: string;
        };
      };
    };
  }[];
  hotels?: {
    id: string;
    hotelName: string;
    location: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    totalPrice: number;
    hotel?: {
      name: string;
      city: {
        name: string;
        country: {
          name: string;
        };
      };
    };
  }[];
  flights?: {
    id: string;
    flightNumber?: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    price: number;
    isBlockSeat: boolean;
    flight?: {
      flightNumber: string;
      departureTime: string;
      arrivalTime: string;
      departureAirport: {
        code: string;
        name: string;
      };
      arrivalAirport: {
        code: string;
        name: string;
      };
      airline: {
        name: string;
        code: string;
      };
    };
  }[];
}

export default function AdminEditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reservationCode = params.code as string;

  // Form data
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    status: 'SOFT',
    totalAmount: 0,
    notes: ''
  });

  // State for document generation dropdown
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  
  // State for passenger data
  const [passengerData, setPassengerData] = useState<{
    adults: Array<{title: string, firstName: string, lastName: string, dateOfBirth: string, passportNumber: string, email: string}>;
    children: Array<{firstName: string, lastName: string, dateOfBirth: string, passportNumber: string}>;
    infants: Array<{firstName: string, lastName: string, dateOfBirth: string}>;
  }>({
    adults: [],
    children: [],
    infants: []
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    
    if (reservationCode) {
      fetchBookingDetails();
    }
  }, [session, status, router, reservationCode]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${reservationCode}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }

      const result = await response.json();
      if (result.success) {
        const bookingData = result.booking;
        setBooking(bookingData);
        setFormData({
          customerName: bookingData.customerName || '',
          customerEmail: bookingData.customerEmail || '',
          customerPhone: bookingData.customerPhone || '',
          status: bookingData.status || 'SOFT',
          totalAmount: bookingData.totalAmount / 100, // Convert from cents
          notes: bookingData.notes || ''
        });
        
        // Initialize passenger data based on booking
        const adultsCount = bookingData.packages?.[0]?.adults || 0;
        const childrenCount = bookingData.packages?.[0]?.children || 0;
        const infantsCount = bookingData.packages?.[0]?.infants || 0;

        // Check if we have saved passenger details with correct counts
        const hasValidPassengerDetails = bookingData.passengerDetails &&
          bookingData.passengerDetails.adults?.length === adultsCount &&
          bookingData.passengerDetails.children?.length === childrenCount &&
          bookingData.passengerDetails.infants?.length === infantsCount;

        if (hasValidPassengerDetails) {
          setPassengerData(bookingData.passengerDetails);
        } else {
          // Extract customer name parts if available
          const customerName = bookingData.customerName || '';
          const nameParts = customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          setPassengerData({
            adults: Array.from({length: adultsCount}, (_, i) => ({
              title: 'Mr',
              firstName: i === 0 ? firstName : '',
              lastName: i === 0 ? lastName : '',
              dateOfBirth: '',
              passportNumber: '',
              email: i === 0 ? bookingData.customerEmail || '' : '' // First adult gets customer info
            })),
            children: Array.from({length: childrenCount}, () => ({
              firstName: '', lastName: '', dateOfBirth: '', passportNumber: ''
            })),
            infants: Array.from({length: infantsCount}, () => ({
              firstName: '', lastName: '', dateOfBirth: ''
            }))
          });
        }
      } else {
        throw new Error(result.message || 'Failed to load booking');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load booking details');
      console.error('Booking fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: booking?.id,
          status: formData.status,
          notes: formData.notes,
          passengerDetails: passengerData
        })
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        setBooking(updatedBooking);
        alert('Booking updated successfully!');
        // Refresh the current page to show updated data
        await fetchBookingDetails();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Failed to save booking: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SOFT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-4 w-4" />
            Pending
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Clock className="mr-1 h-4 w-4" />
            Waiting for Payment
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-4 w-4" />
            Payment Confirmed
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePassengerChange = (type: 'adults' | 'children' | 'infants', index: number, field: string, value: string) => {
    setPassengerData(prev => ({
      ...prev,
      [type]: prev[type].map((passenger, i) => 
        i === index ? { ...passenger, [field]: value } : passenger
      )
    }));
  };

  const handleDocumentGeneration = (type: 'hotel-voucher' | 'flight-tickets') => {
    setShowDocumentDropdown(false);
    
    if (type === 'hotel-voucher') {
      // Generate hotel voucher
      window.open(`/api/documents/hotel-voucher/${reservationCode}`, '_blank');
    } else if (type === 'flight-tickets') {
      // Generate individual flight tickets
      window.open(`/api/documents/flight-tickets/${reservationCode}`, '_blank');
    }
  };

  const handleHotelChange = () => {
    // Open hotel change interface in new window/tab
    const hotelChangeUrl = `/admin/hotels?booking=${reservationCode}&action=change`;
    window.open(hotelChangeUrl, '_blank', 'width=1200,height=800');
    
    // Show instruction to user
    alert('Opening hotel selection interface. Select a new hotel and the booking will be updated automatically.');
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: booking?.id,
          status: 'CANCELLED'
        })
      });

      if (response.ok) {
        alert('Booking cancelled successfully!');
        await fetchBookingDetails();
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (error) {
      alert('Error cancelling booking: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Booking Not Found</h2>
          <p className="mt-2 text-gray-600">{error || 'The booking you are looking for does not exist.'}</p>
          <Link
            href="/admin/bookings"
            className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/bookings"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Bookings
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Booking #{booking.reservationCode}
                </h1>
                <p className="text-gray-600">
                  Created on {formatDate(booking.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(booking.status)}
              
              {/* Document Generation Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowDocumentDropdown(!showDocumentDropdown)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Documents
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>
                
                {showDocumentDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button
                      onClick={() => handleDocumentGeneration('hotel-voucher')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      <FileText className="inline mr-2 h-4 w-4" />
                      Hotel Voucher
                    </button>
                    <button
                      onClick={() => handleDocumentGeneration('flight-tickets')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      <Plane className="inline mr-2 h-4 w-4" />
                      Flight Tickets
                    </button>
                  </div>
                )}
              </div>
              
              {/* Cancel Booking Button */}
              {booking.status !== 'CANCELLED' && (
                <button
                  onClick={handleCancelBooking}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancel Booking
                </button>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Editable Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="mr-2" />
                Customer Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SOFT">Pending</option>
                    <option value="CONFIRMED">Waiting for Payment</option>
                    <option value="PAID">Payment Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <CreditCard className="mr-2" />
                Pricing
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={booking.currency}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <AlertCircle className="mr-2" />
                Admin Notes
              </h2>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Add any internal notes about this booking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Payment Proof Viewer */}
            {booking.notes && booking.notes.includes('/uploads/payments/') && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <ImageIcon className="mr-2" />
                  Payment Confirmation
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    Customer has uploaded payment confirmation. Review the document below.
                  </p>
                </div>
                {booking.notes.split('\n').map((line, index) => {
                  const match = line.match(/\/uploads\/payments\/([^\s]+)/);
                  if (match) {
                    const fileUrl = match[0];
                    const fileName = match[1];
                    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);
                    const isPdf = /\.pdf$/i.test(fileName);

                    return (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <ImageIcon className="h-5 w-5 text-gray-600 mr-2" />
                            <span className="font-mono text-sm text-gray-700">{fileName}</span>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open Full Size
                          </a>
                        </div>
                        {isImage && (
                          <div className="border rounded overflow-hidden">
                            <img
                              src={fileUrl}
                              alt="Payment confirmation"
                              className="w-full h-auto max-h-96 object-contain bg-white"
                            />
                          </div>
                        )}
                        {isPdf && (
                          <div className="border rounded overflow-hidden bg-white p-4 text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">PDF Document</p>
                            <p className="text-xs text-gray-500 mt-1">Click "Open Full Size" to view</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Passenger Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="mr-2" />
                Passenger Information
              </h2>
              
              {booking.packages && booking.packages.length > 0 ? (
                <div className="space-y-6">
                  {/* Traveler Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{booking.packages[0].adults || 0}</p>
                        <p className="text-sm text-gray-600">Adults</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{booking.packages[0].children || 0}</p>
                        <p className="text-sm text-gray-600">Children</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{booking.packages[0].infants || 0}</p>
                        <p className="text-sm text-gray-600">Infants</p>
                      </div>
                    </div>
                  </div>

                  {/* Adult Passengers */}
                  {booking.packages[0].adults && booking.packages[0].adults > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-900">Adult Passengers ({booking.packages[0].adults})</h3>
                      <div className="space-y-3">
                        {passengerData.adults.map((adult, index) => (
                          <div key={`adult-${index}`} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-700">Adult {index + 1}</h4>
                              <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center">
                                <Edit3 className="w-4 h-4 mr-1" />
                                Edit Details
                              </button>
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title
                                  </label>
                                  <select
                                    value={adult.title}
                                    onChange={(e) => handlePassengerChange('adults', index, 'title', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  >
                                    <option value="Mr">Mr</option>
                                    <option value="Mrs">Mrs</option>
                                    <option value="Ms">Ms</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name
                                  </label>
                                  <input
                                    type="text"
                                    value={adult.firstName}
                                    onChange={(e) => handlePassengerChange('adults', index, 'firstName', e.target.value.toUpperCase())}
                                    placeholder="Enter first name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    style={{ textTransform: 'uppercase' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name
                                  </label>
                                  <input
                                    type="text"
                                    value={adult.lastName}
                                    onChange={(e) => handlePassengerChange('adults', index, 'lastName', e.target.value.toUpperCase())}
                                    placeholder="Enter last name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    style={{ textTransform: 'uppercase' }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date of Birth
                                  </label>
                                  <input
                                    type="date"
                                    value={adult.dateOfBirth}
                                    onChange={(e) => handlePassengerChange('adults', index, 'dateOfBirth', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Passport Number
                                  </label>
                                  <input
                                    type="text"
                                    value={adult.passportNumber}
                                    onChange={(e) => handlePassengerChange('adults', index, 'passportNumber', e.target.value)}
                                    placeholder="Enter passport number"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                </div>
                              </div>
                              {index === 0 && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                  </label>
                                  <input
                                    type="email"
                                    value={adult.email}
                                    onChange={(e) => handlePassengerChange('adults', index, 'email', e.target.value)}
                                    placeholder="Enter email address"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Child Passengers */}
                  {booking.packages[0].children && booking.packages[0].children > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-900">Child Passengers ({booking.packages[0].children})</h3>
                      <div className="space-y-3">
                        {passengerData.children.map((child, index) => (
                          <div key={`child-${index}`} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-700">Child {index + 1} <span className="text-sm text-green-600">(Age 2-11)</span></h4>
                              <button className="text-green-600 hover:text-green-700 text-sm flex items-center">
                                <Edit3 className="w-4 h-4 mr-1" />
                                Edit Details
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  First Name
                                </label>
                                <input
                                  type="text"
                                  value={child.firstName}
                                  onChange={(e) => handlePassengerChange('children', index, 'firstName', e.target.value)}
                                  placeholder="Enter first name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Last Name
                                </label>
                                <input
                                  type="text"
                                  value={child.lastName}
                                  onChange={(e) => handlePassengerChange('children', index, 'lastName', e.target.value)}
                                  placeholder="Enter last name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Date of Birth
                                </label>
                                <input
                                  type="date"
                                  value={child.dateOfBirth}
                                  onChange={(e) => handlePassengerChange('children', index, 'dateOfBirth', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Passport Number
                                </label>
                                <input
                                  type="text"
                                  value={child.passportNumber}
                                  onChange={(e) => handlePassengerChange('children', index, 'passportNumber', e.target.value)}
                                  placeholder="Enter passport number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Infant Passengers */}
                  {booking.packages[0].infants && booking.packages[0].infants > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-900">Infant Passengers ({booking.packages[0].infants})</h3>
                      <div className="space-y-3">
                        {passengerData.infants.map((infant, index) => (
                          <div key={`infant-${index}`} className="border border-gray-200 rounded-lg p-4 bg-orange-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-700">Infant {index + 1} <span className="text-sm text-orange-600">(Age 0-1)</span></h4>
                              <button className="text-orange-600 hover:text-orange-700 text-sm flex items-center">
                                <Edit3 className="w-4 h-4 mr-1" />
                                Edit Details
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  First Name
                                </label>
                                <input
                                  type="text"
                                  value={infant.firstName}
                                  onChange={(e) => handlePassengerChange('infants', index, 'firstName', e.target.value)}
                                  placeholder="Enter first name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Last Name
                                </label>
                                <input
                                  type="text"
                                  value={infant.lastName}
                                  onChange={(e) => handlePassengerChange('infants', index, 'lastName', e.target.value)}
                                  placeholder="Enter last name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Date of Birth
                                </label>
                                <input
                                  type="date"
                                  value={infant.dateOfBirth}
                                  onChange={(e) => handlePassengerChange('infants', index, 'dateOfBirth', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No passenger information available. This appears to be a booking without package details.</p>
              )}
            </div>
          </div>

          {/* Right Column - Read-only Information */}
          <div className="space-y-6">
            {/* Hotel Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Building className="mr-2" />
                  Hotel Information
                </h2>
                <button 
                  onClick={handleHotelChange}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Change Hotel
                </button>
              </div>

              {(booking.packages && booking.packages.length > 0 && (booking.packages[0].selectedHotel || booking.packages[0].package?.hotel)) ? (
                (() => {
                  const hotel = booking.packages[0].selectedHotel || booking.packages[0].package?.hotel;
                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Hotel Name</p>
                        <p className="font-semibold text-lg">{hotel.name}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <div className="flex items-center text-gray-700">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>
                            {hotel.city.name}
                            {hotel.city.country &&
                              `, ${hotel.city.country.name}`
                            }
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Check-in</p>
                          <p className="font-medium">
                            {booking.packages[0].checkIn ? formatDate(booking.packages[0].checkIn) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Check-out</p>
                          <p className="font-medium">
                            {booking.packages[0].checkOut ? formatDate(booking.packages[0].checkOut) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Package</p>
                        <p className="font-medium">{booking.packages[0].package.name}</p>
                      </div>
                    </div>
                  );
                })()
              ) : (booking.hotels && booking.hotels.length > 0) ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Hotel Name</p>
                    <p className="font-semibold text-lg">{booking.hotels[0].hotelName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{booking.hotels[0].location}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-medium">
                        {booking.hotels[0].checkIn ? formatDate(booking.hotels[0].checkIn) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-medium">
                        {booking.hotels[0].checkOut ? formatDate(booking.hotels[0].checkOut) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Room Type</p>
                    <p className="font-medium">{booking.hotels[0].roomType}</p>
                  </div>
                </div>
              ) : booking.flights && booking.flights.length > 0 ? (
                <div className="space-y-4">
                  {booking.flights.map((flight, index) => (
                    <div key={flight.id} className="border-l-4 border-orange-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-orange-700">
                          Flight {index + 1} {flight.isBlockSeat ? '(Block Seat)' : '(Dynamic)'}
                        </h3>
                        {flight.flightNumber && (
                          <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {flight.flightNumber}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">From</p>
                          <p className="font-medium">{flight.origin}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">To</p>
                          <p className="font-medium">{flight.destination}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Departure Date</p>
                          <p className="font-medium">{formatDate(flight.departureDate)}</p>
                        </div>
                        {flight.returnDate && (
                          <div>
                            <p className="text-sm text-gray-600">Return Date</p>
                            <p className="font-medium">{formatDate(flight.returnDate)}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Passengers</p>
                        <p className="font-medium">{flight.passengers}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No accommodation booking information available.</p>
              )}
            </div>

            {/* Flight Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Plane className="mr-2" />
                Flight Information
              </h2>
              
              {(() => {
                // Package flights (from package data)
                if (booking.packages && booking.packages.length > 0 && booking.packages[0].package && 
                    (booking.packages[0].package.departureFlight || booking.packages[0].package.returnFlight)) {
                  return (
                    <div className="space-y-6">
                      {/* Departure Flight */}
                      {booking.packages[0].package.departureFlight && (
                        <div className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-blue-700">Outbound Flight</h3>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {booking.packages[0].package.departureFlight.flightNumber}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Departure</p>
                              <p className="font-medium">
                                {booking.packages[0].package.departureFlight.departureAirport.code} - {booking.packages[0].package.departureFlight.departureAirport.name}
                              </p>
                              <p className="text-gray-500">
                                {new Date(booking.packages[0].package.departureFlight.departureTime).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Arrival</p>
                              <p className="font-medium">
                                {booking.packages[0].package.departureFlight.arrivalAirport.code} - {booking.packages[0].package.departureFlight.arrivalAirport.name}
                              </p>
                              <p className="text-gray-500">
                                {new Date(booking.packages[0].package.departureFlight.arrivalTime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Return Flight */}
                      {booking.packages[0].package.returnFlight && (
                        <div className="border-l-4 border-green-500 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-green-700">Return Flight</h3>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                              {booking.packages[0].package.returnFlight.flightNumber}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Departure</p>
                              <p className="font-medium">
                                {booking.packages[0].package.returnFlight.departureAirport.code} - {booking.packages[0].package.returnFlight.departureAirport.name}
                              </p>
                              <p className="text-gray-500">
                                {new Date(booking.packages[0].package.returnFlight.departureTime).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Arrival</p>
                              <p className="font-medium">
                                {booking.packages[0].package.returnFlight.arrivalAirport.code} - {booking.packages[0].package.returnFlight.arrivalAirport.name}
                              </p>
                              <p className="text-gray-500">
                                {new Date(booking.packages[0].package.returnFlight.arrivalTime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Individual flight bookings (not from package)
                if (booking.flights && booking.flights.length > 0) {
                  return (
                    <div className="space-y-4">
                      {booking.flights.map((flight, index) => (
                        <div key={flight.id} className="border-l-4 border-orange-500 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-orange-700">
                              Flight {index + 1} {flight.isBlockSeat ? '(Block Seat)' : '(Dynamic)'}
                            </h3>
                            {flight.flightNumber && (
                              <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {flight.flightNumber}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Route</p>
                              <p className="font-medium">{flight.origin} → {flight.destination}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Passengers</p>
                              <p className="font-medium">{flight.passengers}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Departure Date</p>
                              <p className="font-medium">{formatDate(flight.departureDate)}</p>
                            </div>
                            {flight.returnDate && (
                              <div>
                                <p className="text-gray-600">Return Date</p>
                                <p className="font-medium">{formatDate(flight.returnDate)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                
                // No flight information available
                return <p className="text-gray-500">No flight booking information available.</p>;
              })()}
            </div>

            {/* Trip Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="mr-2" />
                Trip Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">
                    {booking.packages && booking.packages.length > 0 && booking.packages[0].checkIn 
                      ? formatDate(booking.packages[0].checkIn)
                      : booking.checkInDate 
                        ? formatDate(booking.checkInDate) 
                        : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">
                    {booking.packages && booking.packages.length > 0 && booking.packages[0].checkOut 
                      ? formatDate(booking.packages[0].checkOut)
                      : booking.checkOutDate 
                        ? formatDate(booking.checkOutDate) 
                        : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Travelers</p>
                  <p className="font-medium">
                    {booking.packages && booking.packages.length > 0 ? (
                      <>
                        {booking.packages[0].adults || 0} Adults
                        {(booking.packages[0].children || 0) > 0 && `, ${booking.packages[0].children} Children`}
                        {(booking.packages[0].infants || 0) > 0 && `, ${booking.packages[0].infants} Infants`}
                      </>
                    ) : (
                      'No travelers information'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Booking Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Reservation Code</p>
                  <p className="font-medium font-mono">{booking.reservationCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{formatDate(booking.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <div className="mt-1">{getStatusBadge(booking.status)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}