'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Plane, Hotel, Car, Map, CreditCard, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import FlightSearch from '@/components/FlightSearch';
import HotelSearch from '@/components/HotelSearch';
import PackageSearch from '@/components/PackageSearch';

interface BookingFormData {
  // Trip details
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  
  // Customer details
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Services
  packageId?: string;
  flightId?: string;
  hotelId?: string;
  transferId?: string;
  excursionIds: string[];
  
  // Pricing
  totalAmount: number;
}

const STEPS = [
  { id: 0, name: 'Packages', icon: Package },
  { id: 1, name: 'Trip Details', icon: Calendar },
  { id: 2, name: 'Flights', icon: Plane },
  { id: 3, name: 'Hotels', icon: Hotel },
  { id: 4, name: 'Extras', icon: Car },
  { id: 5, name: 'Customer Info', icon: Users },
  { id: 6, name: 'Review', icon: CreditCard }
];

// Airport codes mapping
const DESTINATION_AIRPORTS: { [key: string]: string } = {
  paris: 'CDG',
  london: 'LHR',
  rome: 'FCO',
  barcelona: 'BCN',
  amsterdam: 'AMS'
};

export default function NewBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedPackageHotel, setSelectedPackageHotel] = useState<any>(null);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [skipFlight, setSkipFlight] = useState(false);
  const [usePackage, setUsePackage] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    destination: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    infants: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    excursionIds: [],
    totalAmount: 0
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Calculate total amount from selected services
      const calculateTotal = () => {
        let total = 0;
        
        if (usePackage && selectedPackage && selectedPackageHotel) {
          // For packages, use the combined total from package + selected hotel
          const flightPrice = selectedPackage.flightPrice * (formData.adults + formData.children);
          const hotelPrice = selectedPackageHotel.price;
          const serviceCharge = selectedPackage.serviceCharge || 0;
          const profitMargin = selectedPackage.profitMargin || 20;
          const subtotal = flightPrice + hotelPrice + serviceCharge;
          const profitAmount = subtotal * (profitMargin / 100);
          total = (subtotal + profitAmount) * 100; // Convert to cents
        } else {
          // Individual services
          if (selectedFlight) {
            total += selectedFlight.price.amount * 100; // Convert to cents
          }
          if (selectedHotel && selectedRoom) {
            const nights = Math.ceil(
              (new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / 
              (1000 * 60 * 60 * 24)
            );
            total += selectedRoom.pricePerNight * nights * 100; // Convert to cents
          }
        }
        return total;
      };

      // Create soft booking
      const softBookingData = {
        totalAmount: calculateTotal(),
        currency: 'EUR',
        // Include customer details for guest bookings
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        checkInDate: formData.checkIn,
        checkOutDate: formData.checkOut,
        // Flight and hotel selections
        ...(selectedFlight && { 
          flightSelection: {
            id: selectedFlight.id,
            airline: selectedFlight.airline,
            flightNumber: selectedFlight.flightNumber,
            price: selectedFlight.price.amount
          }
        }),
        ...(selectedHotel && selectedRoom && {
          hotelSelection: {
            hotelId: selectedHotel.id,
            hotelName: selectedHotel.name,
            roomId: selectedRoom.id,
            roomType: selectedRoom.type,
            pricePerNight: selectedRoom.pricePerNight
          }
        })
      };

      const response = await fetch('/api/bookings/soft-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(softBookingData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Redirect to booking details page
          router.push(`/bookings/${result.booking.reservationCode}`);
        } else {
          throw new Error(result.message || 'Failed to create booking');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create booking' }));
        throw new Error(errorData.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Package or Custom Trip</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 mb-4">
                Choose between our curated travel packages or build a custom trip step by step.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setUsePackage(true);
                    // Pre-fill some basic trip details to enable package search
                    const today = new Date();
                    const checkIn = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
                    const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
                    
                    setFormData({
                      ...formData,
                      destination: formData.destination || 'paris',
                      checkIn: formData.checkIn || checkIn.toISOString().split('T')[0],
                      checkOut: formData.checkOut || checkOut.toISOString().split('T')[0],
                      adults: formData.adults || 2,
                      children: formData.children || 0,
                      infants: formData.infants || 0
                    });
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    usePackage 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-semibold">Travel Packages</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Complete packages with flights, hotels, and activities included
                  </p>
                </button>
                
                <button
                  onClick={() => {
                    setUsePackage(false);
                    setSelectedPackage(null);
                    setSelectedPackageHotel(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    !usePackage 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 mr-2 text-green-600" />
                    <span className="font-semibold">Custom Trip</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Build your own trip by selecting flights, hotels, and extras individually
                  </p>
                </button>
              </div>
            </div>

            {usePackage && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Quick Trip Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Destination</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    >
                      <option value="paris">Paris</option>
                      <option value="london">London</option>
                      <option value="rome">Rome</option>
                      <option value="barcelona">Barcelona</option>
                      <option value="amsterdam">Amsterdam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-in</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Adults</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border rounded"
                      value={formData.adults}
                      onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Children</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border rounded"
                      value={formData.children}
                      onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                {formData.destination && formData.checkIn && (
                  <PackageSearch
                    destination={formData.destination}
                    checkInDate={formData.checkIn}
                    adults={formData.adults}
                    children={formData.children}
                    selectedPackageId={selectedPackage?.id}
                    onSelect={({ package: pkg, selectedHotel }) => {
                      setSelectedPackage(pkg);
                      setSelectedPackageHotel(selectedHotel);
                      setFormData({
                        ...formData,
                        packageId: pkg.id,
                        // Calculate check-out date based on package nights
                        checkOut: new Date(new Date(formData.checkIn).getTime() + pkg.nights * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      });
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Trip Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Destination</label>
              <select
                className="w-full p-3 border rounded-lg"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              >
                <option value="">Select destination</option>
                <option value="paris">Paris</option>
                <option value="london">London</option>
                <option value="rome">Rome</option>
                <option value="barcelona">Barcelona</option>
                <option value="amsterdam">Amsterdam</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Check-in Date</label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-lg"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Check-out Date</label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-lg"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Adults</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border rounded-lg"
                  value={formData.adults}
                  onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Children (2-12)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-3 border rounded-lg"
                  value={formData.children}
                  onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Infants (0-2)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-3 border rounded-lg"
                  value={formData.infants}
                  onChange={(e) => setFormData({ ...formData, infants: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        const destinationAirport = DESTINATION_AIRPORTS[formData.destination] || formData.destination.toUpperCase();
        
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Flights</h2>
            
            {!skipFlight && formData.destination && formData.checkIn ? (
              <FlightSearch
                origin="SKP"
                destination={destinationAirport}
                departureDate={formData.checkIn}
                returnDate={formData.checkOut}
                adults={formData.adults}
                children={formData.children}
                infants={formData.infants}
                selectedFlightId={formData.flightId}
                onSelect={(flight) => {
                  setSelectedFlight(flight);
                  setFormData({ 
                    ...formData, 
                    flightId: flight.id
                  });
                }}
              />
            ) : !skipFlight ? (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please select destination and dates first to search for flights.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  Flight selection skipped. You will arrange your own transportation.
                </p>
              </div>
            )}

            <div className="flex items-center mt-4">
              <input 
                type="checkbox" 
                id="skip-flight" 
                className="mr-2"
                checked={skipFlight}
                onChange={(e) => {
                  setSkipFlight(e.target.checked);
                  if (e.target.checked) {
                    setFormData({ ...formData, flightId: undefined });
                    setSelectedFlight(null);
                  }
                }}
              />
              <label htmlFor="skip-flight" className="text-sm">
                Skip flight selection (I'll arrange my own transportation)
              </label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Hotel</h2>
            
            {formData.destination && formData.checkIn && formData.checkOut ? (
              <HotelSearch
                destination={formData.destination}
                checkIn={formData.checkIn}
                checkOut={formData.checkOut}
                adults={formData.adults}
                children={formData.children}
                infants={formData.infants}
                selectedHotelId={formData.hotelId}
                selectedRoomId={selectedRoom?.id}
                onSelect={(hotel, room) => {
                  setSelectedHotel(hotel);
                  setSelectedRoom(room);
                  setFormData({ 
                    ...formData, 
                    hotelId: hotel.id
                  });
                }}
              />
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please select destination and dates first to search for hotels.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Transfers & Excursions</h2>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Car className="mr-2" /> Airport Transfers
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Round-trip Airport Transfer</p>
                    <p className="text-sm text-gray-600">Private car, meet & greet service</p>
                  </div>
                  <p className="font-bold">€80</p>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Shared Shuttle Service</p>
                    <p className="text-sm text-gray-600">Budget-friendly option</p>
                  </div>
                  <p className="font-bold">€35</p>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Map className="mr-2" /> Excursions & Activities
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">City Walking Tour</p>
                    <p className="text-sm text-gray-600">3 hours with professional guide</p>
                  </div>
                  <p className="font-bold">€45</p>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Museum Pass</p>
                    <p className="text-sm text-gray-600">Access to top 5 museums</p>
                  </div>
                  <p className="font-bold">€60</p>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Day Trip to Countryside</p>
                    <p className="text-sm text-gray-600">Full day with lunch included</p>
                  </div>
                  <p className="font-bold">€120</p>
                </label>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Customer Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg"
                placeholder="John Doe"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                className="w-full p-3 border rounded-lg"
                placeholder="john@example.com"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                className="w-full p-3 border rounded-lg"
                placeholder="+1234567890"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please ensure all contact information is correct. 
                We'll send your booking confirmation and travel documents to these details.
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">
                  I agree to the terms and conditions and privacy policy
                </span>
              </label>
            </div>
          </div>
        );

      case 6:
        const calculateTotal = () => {
          let total = 0;
          if (selectedFlight) {
            total += selectedFlight.price.amount;
          }
          if (selectedHotel && selectedRoom) {
            const nights = Math.ceil(
              (new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / 
              (1000 * 60 * 60 * 24)
            );
            total += selectedRoom.pricePerNight * nights;
          }
          return total;
        };

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review & Confirm</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Destination:</span>
                  <span className="font-medium capitalize">{formData.destination || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-in:</span>
                  <span className="font-medium">{formData.checkIn || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-out:</span>
                  <span className="font-medium">{formData.checkOut || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Travelers:</span>
                  <span className="font-medium">
                    {formData.adults} Adults
                    {formData.children > 0 && `, ${formData.children} Children`}
                    {formData.infants > 0 && `, ${formData.infants} Infants`}
                  </span>
                </div>
                {selectedFlight && (
                  <div className="flex justify-between">
                    <span>Flight:</span>
                    <span className="font-medium">
                      {selectedFlight.airline} {selectedFlight.flightNumber}
                    </span>
                  </div>
                )}
                {selectedHotel && (
                  <div className="flex justify-between">
                    <span>Hotel:</span>
                    <span className="font-medium">
                      {selectedHotel.name} ({selectedRoom?.type})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Price Breakdown</h3>
              
              <div className="space-y-2">
                {selectedFlight && (
                  <div className="flex justify-between">
                    <span>Flight ({selectedFlight.airline})</span>
                    <span>€{selectedFlight.price.amount}</span>
                  </div>
                )}
                {selectedHotel && selectedRoom && (
                  <div className="flex justify-between">
                    <span>Hotel ({selectedHotel.name})</span>
                    <span>€{selectedRoom.pricePerNight * Math.ceil(
                      (new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    )}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>€{calculateTotal()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Soft Booking:</strong> This will create a 3-hour hold on your selection. 
                You'll need to confirm and pay within this time to secure your booking.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating Booking...' : 'Create Soft Booking'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="ml-2 hidden md:block">
                    <p
                      className={`text-sm ${
                        currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center px-6 py-3 rounded-lg ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="mr-2" size={20} />
            Previous
          </button>

          {currentStep < STEPS.length - 1 && (
            <button
              onClick={handleNext}
              disabled={currentStep === 0 && !usePackage && !selectedPackage}
              className={`flex items-center px-6 py-3 rounded-lg ${
                (currentStep === 0 && !usePackage && !selectedPackage)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ChevronRight className="ml-2" size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}