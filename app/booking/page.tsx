'use client';

import MobileBookingForm from '@/components/mobile/BookingForm';
import { useBookingForm, PassengerDetails } from '@/lib/hooks/useBookingForm';
import { COUNTRY_CODES } from '@/lib/utils/countryCodes';
import { useIsMobile } from '@/lib/hooks/useDeviceType';
import { User, Phone, Mail, Calendar, ChevronLeft, ChevronRight, Users, Check, Star, MapPin } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Passenger Details', icon: Users },
  { id: 2, name: 'Contact Information', icon: Phone },
  { id: 3, name: 'Summary', icon: Check }
];

export default function BookingPage() {
  const isMobile = useIsMobile();
  const {
    currentStep,
    loading,
    packageData,
    hotelData,
    bookingData,
    passengers,
    contactDetails,
    termsAccepted,
    countrySearch,
    showCountryDropdown,
    session,
    setContactDetails,
    setTermsAccepted,
    setCountrySearch,
    setShowCountryDropdown,
    handleNext,
    handlePrevious,
    handlePassengerChange,
    handleSubmitBooking,
    updatePassengerType,
    calculateAge,
    validateStep,
    router
  } = useBookingForm();

  // Render mobile version
  if (isMobile) {
    return <MobileBookingForm />;
  }

  // Desktop version below
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Passenger Details</h2>
              <p className="text-gray-600">Please provide details for all travelers</p>
            </div>

            <div className="space-y-6">
              {passengers.map((passenger, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Passenger {index + 1}
                    {passenger.type === 'ADULT' && ' (Adult)'}
                    {passenger.type === 'CHILD' && ' (Child)'}
                    {passenger.type === 'INFANT' && ' (Infant)'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <select
                        value={passenger.title}
                        onChange={(e) => handlePassengerChange(index, 'title', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={passenger.type === 'CHILD' || passenger.type === 'INFANT'}
                      >
                        {passenger.type === 'ADULT' && (
                          <>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                          </>
                        )}
                        {passenger.type === 'CHILD' && <option value="CHD">CHD</option>}
                        {passenger.type === 'INFANT' && <option value="INF">INF</option>}
                      </select>
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.firstName}
                        onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value.toUpperCase())}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter first name"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.lastName}
                        onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value.toUpperCase())}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter last name"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={passenger.dateOfBirth}
                        onChange={(e) => {
                          handlePassengerChange(index, 'dateOfBirth', e.target.value);
                          if (e.target.value) {
                            updatePassengerType(index, e.target.value);
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        max={new Date().toISOString().split('T')[0]}
                        placeholder="YYYY-MM-DD"
                      />
                      {passenger.dateOfBirth && (
                        <p className="text-sm text-gray-500 mt-1">
                          Age: {calculateAge(passenger.dateOfBirth)} years
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-600">We'll use this information to send your booking confirmation</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <input
                    type="text"
                    value={countrySearch || COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.code || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCountrySearch(value);
                      setShowCountryDropdown(true);
                      
                      // If user types a valid country code directly, select it
                      const matchingCountry = COUNTRY_CODES.find(c => 
                        c.code === value || 
                        c.country.toLowerCase().startsWith(value.toLowerCase())
                      );
                      if (matchingCountry) {
                        setContactDetails({ ...contactDetails, countryCode: matchingCountry.code });
                      }
                    }}
                    onFocus={() => {
                      setShowCountryDropdown(true);
                      setCountrySearch('');
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow selection
                      setTimeout(() => {
                        setShowCountryDropdown(false);
                        setCountrySearch('');
                      }, 150);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Country code or name"
                  />
                  
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {COUNTRY_CODES
                        .filter(country => 
                          !countrySearch || 
                          country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          country.code.includes(countrySearch)
                        )
                        .slice(0, 10) // Show max 10 results
                        .map((country, index) => (
                          <button
                            key={`${country.code}-${country.country}-${index}`}
                            type="button"
                            onClick={() => {
                              setContactDetails({ ...contactDetails, countryCode: country.code });
                              setShowCountryDropdown(false);
                              setCountrySearch('');
                            }}
                            className={`w-full text-left p-3 hover:bg-gray-100 flex items-center gap-2 ${
                              contactDetails.countryCode === country.code ? 'bg-blue-50 text-blue-600' : ''
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="font-medium">{country.code}</span>
                            <span className="text-gray-600 text-sm">{country.country}</span>
                          </button>
                        ))}
                      {countrySearch && COUNTRY_CODES.filter(country => 
                        country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                        country.code.includes(countrySearch)
                      ).length === 0 && (
                        <div className="p-3 text-gray-500 text-center">
                          No countries found matching "{countrySearch}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show selected country */}
                  {!showCountryDropdown && contactDetails.countryCode && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <span className="text-sm">
                        {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.flag}
                      </span>
                    </div>
                  )}
                </div>
                
                <input
                  type="tel"
                  value={contactDetails.phone}
                  onChange={(e) => setContactDetails({ ...contactDetails, phone: e.target.value })}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              {/* Show selected country info */}
              {contactDetails.countryCode && (
                <div className="mt-1 text-xs text-gray-500">
                  Selected: {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.flag} {' '}
                  {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.country} {' '}
                  ({contactDetails.countryCode})
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={contactDetails.email}
                onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
                disabled={!!session?.user}
              />
              {session?.user && (
                <p className="text-sm text-blue-600 mt-1">
                  You're signed in as {session.user.email}
                </p>
              )}
            </div>

            {/* Authentication */}
            {!session?.user && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setContactDetails({ ...contactDetails, isExistingUser: true })}
                    className={`px-4 py-2 rounded-lg ${contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    I have an account
                  </button>
                  <button
                    onClick={() => setContactDetails({ ...contactDetails, isExistingUser: false })}
                    className={`px-4 py-2 rounded-lg ${!contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Create new account
                  </button>
                </div>

                {contactDetails.isExistingUser ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={contactDetails.password}
                      onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your password"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Create Password *
                      </label>
                      <input
                        type="password"
                        value={contactDetails.password}
                        onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Create a password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={contactDetails.confirmPassword}
                        onChange={(e) => setContactDetails({ ...contactDetails, confirmPassword: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Summary</h2>
              <p className="text-gray-600">Please review your booking details before confirming</p>
            </div>

            {/* Package Details */}
            {packageData && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
                <div className="flex items-start gap-4">
                  {packageData.primaryImage && (
                    <img 
                      src={packageData.primaryImage} 
                      alt={packageData.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{packageData.name}</h4>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {packageData.city?.name}, {packageData.city?.country?.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{packageData.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hotel Details */}
            {hotelData ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                <div className="flex items-start gap-4">
                  {hotelData.primaryImage && (
                    <img 
                      src={hotelData.primaryImage} 
                      alt={hotelData.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{hotelData.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(hotelData.rating || 0)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                      <span className="text-gray-600 ml-1">{hotelData.rating} Star</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{hotelData.address}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                <div className="text-gray-600">
                  <p>Selected hotel will be confirmed after booking completion</p>
                  <p className="text-sm mt-1">Hotel ID: {bookingData.hotelId}</p>
                </div>
              </div>
            )}

            {/* Flight Information */}
            {/* Debug packageData */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-yellow-800">Debug: Package Data</h4>
                <p className="text-xs text-yellow-700">Flights count: {packageData?.flights?.length || 0}</p>
                <p className="text-xs text-yellow-700">Departure flight: {packageData?.departureFlight ? 'Yes' : 'No'}</p>
                <p className="text-xs text-yellow-700">Return flight: {packageData?.returnFlight ? 'Yes' : 'No'}</p>
              </div>
            )}

            {packageData?.flights?.length > 0 ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="space-y-4">
                  {packageData.flights.map((flight: any, index: number) => (
                    <div key={flight.id || index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {flight.flightNumber} - {flight.direction === 'outbound' ? 'Outbound' : 'Return'}
                          </h4>
                          <p className="text-gray-600">
                            {flight.departureAirport?.name || flight.departureAirport?.code || 'Unknown'} → {flight.arrivalAirport?.name || flight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(flight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {flight.duration} | Aircraft: {flight.aircraft || 'TBA'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (packageData?.departureFlight || packageData?.returnFlight) ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="space-y-4">
                  {packageData?.departureFlight && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {packageData.departureFlight.flightNumber} - Outbound
                          </h4>
                          <p className="text-gray-600">
                            {packageData.departureFlight.departureAirport?.name || packageData.departureFlight.departureAirport?.code || 'Unknown'} → {packageData.departureFlight.arrivalAirport?.name || packageData.departureFlight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(packageData.departureFlight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(packageData.departureFlight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(packageData.departureFlight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {packageData.departureFlight.duration} | Aircraft: {packageData.departureFlight.aircraft || 'TBA'}
                      </p>
                    </div>
                  )}
                  {packageData?.returnFlight && (
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {packageData.returnFlight.flightNumber} - Return
                          </h4>
                          <p className="text-gray-600">
                            {packageData.returnFlight.departureAirport?.name || packageData.returnFlight.departureAirport?.code || 'Unknown'} → {packageData.returnFlight.arrivalAirport?.name || packageData.returnFlight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(packageData.returnFlight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(packageData.returnFlight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(packageData.returnFlight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {packageData.returnFlight.duration} | Aircraft: {packageData.returnFlight.aircraft || 'TBA'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="text-gray-600">
                  <p>Flight details will be confirmed after booking completion</p>
                  <p className="text-sm mt-1">Package includes round-trip flights</p>
                </div>
              </div>
            )}

            {/* Passenger Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Passengers</h3>
              <div className="space-y-3">
                {passengers.map((passenger, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-900">
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {passenger.type} ({calculateAge(passenger.dateOfBirth)} years)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{contactDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{contactDetails.countryCode} {contactDetails.phone}</span>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">€{parseFloat(bookingData.price).toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                For {bookingData.adults} adult{bookingData.adults > 1 ? 's' : ''}
                {bookingData.children > 0 && ` and ${bookingData.children} child${bookingData.children > 1 ? 'ren' : ''}`}
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required 
                />
                <span className="text-sm text-gray-700">
                  I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</a> and 
                  <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </span>
              </label>
              {!termsAccepted && (
                <p className="text-red-600 text-xs mt-2">
                  Please accept the terms and conditions to proceed
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!bookingData.packageId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking Request</h1>
          <p className="text-gray-600 mb-6">Please select a package first</p>
          <button
            onClick={() => router.push('/packages')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Browse Packages
          </button>
        </div>
      </div>
    );
  }

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

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`flex items-center px-6 py-3 rounded-lg ${
                !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ChevronRight className="ml-2" size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmitBooking}
              disabled={loading || !validateStep(currentStep)}
              className={`flex items-center px-6 py-3 rounded-lg ${
                loading || !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}