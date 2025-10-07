'use client';

import { useBookingForm, PassengerDetails } from '@/lib/hooks/useBookingForm';
import { COUNTRY_CODES } from '@/lib/utils/countryCodes';
import { User, Phone, Mail, Check, ChevronLeft, ChevronRight, Star, MapPin } from 'lucide-react';
import { useState } from 'react';

const STEPS = [
  { id: 1, name: 'Passengers', icon: User },
  { id: 2, name: 'Contact', icon: Phone },
  { id: 3, name: 'Summary', icon: Check }
];

export default function MobileBookingForm() {
  const {
    currentStep,
    loading,
    packageData,
    hotelData,
    bookingData,
    passengers,
    contactDetails,
    termsAccepted,
    session,
    setContactDetails,
    setTermsAccepted,
    handleNext,
    handlePrevious,
    handlePassengerChange,
    handleSubmitBooking,
    updatePassengerType,
    calculateAge,
    validateStep,
    router
  } = useBookingForm();

  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  if (!bookingData.packageId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Invalid Booking Request</h1>
          <p className="text-gray-600 mb-4 text-sm">Please select a package first</p>
          <button
            onClick={() => router.push('/packages')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Browse Packages
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Passenger Details</h2>
              <p className="text-sm text-gray-600">Provide details for all travelers</p>
            </div>

            <div className="space-y-4">
              {passengers.map((passenger, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Passenger {index + 1}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({passenger.type === 'ADULT' ? 'Adult' : passenger.type === 'CHILD' ? 'Child' : 'Infant'})
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <select
                        value={passenger.title}
                        onChange={(e) => handlePassengerChange(index, 'title', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.firstName}
                        onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value.toUpperCase())}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base uppercase"
                        placeholder="FIRST NAME"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.lastName}
                        onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value.toUpperCase())}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base uppercase"
                        placeholder="LAST NAME"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {passenger.dateOfBirth && (
                        <p className="text-xs text-gray-500 mt-1">
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
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Information</h2>
              <p className="text-sm text-gray-600">For booking confirmation</p>
            </div>

            <div className="space-y-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  {/* Searchable Country Code */}
                  <div className="relative w-32">
                    <input
                      type="text"
                      value={countrySearch || contactDetails.countryCode}
                      onChange={(e) => {
                        setCountrySearch(e.target.value);
                        setShowCountryDropdown(true);
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="+383"
                    />

                    {showCountryDropdown && (
                      <>
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
                          {COUNTRY_CODES
                            .filter(country =>
                              !countrySearch ||
                              country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                              country.code.includes(countrySearch)
                            )
                            .slice(0, 10)
                            .map((country, index) => (
                              <button
                                key={`${country.code}-${index}`}
                                type="button"
                                onClick={() => {
                                  setContactDetails({ ...contactDetails, countryCode: country.code });
                                  setShowCountryDropdown(false);
                                  setCountrySearch('');
                                }}
                                className={`w-full text-left p-2 hover:bg-gray-100 flex items-center gap-2 text-sm ${
                                  contactDetails.countryCode === country.code ? 'bg-blue-50' : ''
                                }`}
                              >
                                <span>{country.flag}</span>
                                <span className="font-medium">{country.code}</span>
                                <span className="text-gray-600 text-xs truncate">{country.country}</span>
                              </button>
                            ))}
                        </div>
                        {/* Overlay */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setShowCountryDropdown(false);
                            setCountrySearch('');
                          }}
                        />
                      </>
                    )}

                    {!showCountryDropdown && contactDetails.countryCode && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm">
                        {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.flag}
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={contactDetails.phone}
                    onChange={(e) => setContactDetails({ ...contactDetails, phone: e.target.value })}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={contactDetails.email}
                  onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="email@example.com"
                  disabled={!!session?.user}
                />
                {session?.user && (
                  <p className="text-xs text-blue-600 mt-1">
                    Signed in as {session.user.email}
                  </p>
                )}
              </div>

              {/* Authentication */}
              {!session?.user && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setContactDetails({ ...contactDetails, isExistingUser: true })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Have Account
                    </button>
                    <button
                      onClick={() => setContactDetails({ ...contactDetails, isExistingUser: false })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        !contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      New Account
                    </button>
                  </div>

                  {contactDetails.isExistingUser ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={contactDetails.password}
                        onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                        placeholder="Enter password"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Create Password *
                        </label>
                        <input
                          type="password"
                          value={contactDetails.password}
                          onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                          placeholder="Min 6 characters"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          value={contactDetails.confirmPassword}
                          onChange={(e) => setContactDetails({ ...contactDetails, confirmPassword: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex-1 overflow-y-auto px-4 pb-24">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Booking Summary</h2>
              <p className="text-sm text-gray-600">Review your booking details</p>
            </div>

            <div className="space-y-4">
              {/* Package Details */}
              {packageData && (
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Package</h3>
                  <div className="flex gap-3">
                    {packageData.primaryImage && (
                      <img
                        src={packageData.primaryImage}
                        alt={packageData.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{packageData.name}</h4>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {packageData.city?.name}, {packageData.city?.country?.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotel Details */}
              {hotelData && (
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Hotel</h3>
                  <div className="flex gap-3">
                    {hotelData.primaryImage && (
                      <img
                        src={hotelData.primaryImage}
                        alt={hotelData.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{hotelData.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(hotelData.rating || 0)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Flight Information */}
              {(packageData?.departureFlight || packageData?.returnFlight) && (
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Flights</h3>
                  <div className="space-y-3">
                    {packageData?.departureFlight && (
                      <div className="border-l-4 border-blue-500 pl-3 py-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {packageData.departureFlight.flightNumber} - Outbound
                        </p>
                        <p className="text-sm text-gray-600">
                          {packageData.departureFlight.departureAirport?.code || 'SKP'} → {packageData.departureFlight.arrivalAirport?.code || 'MLA'}
                        </p>
                      </div>
                    )}
                    {packageData?.returnFlight && (
                      <div className="border-l-4 border-green-500 pl-3 py-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {packageData.returnFlight.flightNumber} - Return
                        </p>
                        <p className="text-sm text-gray-600">
                          {packageData.returnFlight.departureAirport?.code || 'MLA'} → {packageData.returnFlight.arrivalAirport?.code || 'SKP'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Passengers</h3>
                <div className="space-y-2">
                  {passengers.map((passenger, index) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                      <span className="text-gray-900 font-medium">
                        {passenger.title} {passenger.firstName} {passenger.lastName}
                      </span>
                      <span className="text-gray-600">
                        {passenger.type} ({calculateAge(passenger.dateOfBirth)}y)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Contact</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900 font-medium">{contactDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-900 font-medium">{contactDetails.countryCode} {contactDetails.phone}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    €{parseFloat(bookingData.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {bookingData.adults} adult{bookingData.adults > 1 ? 's' : ''}
                  {bookingData.children > 0 && `, ${bookingData.children} child${bookingData.children > 1 ? 'ren' : ''}`}
                </p>
              </div>

              {/* Terms */}
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{ minWidth: '16px', minHeight: '16px' }}
                  />
                  <span className="text-xs text-gray-700">
                    I agree to the <a href="/terms" className="text-blue-600 underline">Terms and Conditions</a> and{' '}
                    <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-semibold text-gray-900">Complete Booking</h1>
            <span className="text-xs text-gray-500">Step {currentStep} of 3</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  currentStep >= step.id ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {renderStepContent()}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="p-4 flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm min-w-[100px]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          )}

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm ${
                !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white active:bg-blue-700'
              }`}
              style={{ minHeight: '48px' }}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmitBooking}
              disabled={loading || !validateStep(currentStep)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm ${
                loading || !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white active:bg-green-700'
              }`}
              style={{ minHeight: '48px' }}
            >
              {loading ? 'Creating...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
