'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Plane, Hotel, Car, Map, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import FlightSearch from '@/components/FlightSearch';
import HotelSearch from '@/components/HotelSearch';

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
  flightId?: string;
  hotelId?: string;
  transferId?: string;
  excursionIds: string[];
  
  // Pricing
  totalAmount: number;
}

const STEPS = [
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
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [skipFlight, setSkipFlight] = useState(false);
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
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const booking = await response.json();
        router.push(`/bookings/${booking.reservationCode}`);
      } else {
        alert('Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
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
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-3 rounded-lg ${
              currentStep === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="mr-2" size={20} />
            Previous
          </button>

          {currentStep < STEPS.length && (
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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