'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Calendar,
  Clock,
  Plane,
  Hotel,
  Check,
  Users,
  Minus,
  Plus
} from 'lucide-react';
import { usePackageDetails } from '@/lib/hooks/usePackageDetails';

interface PackageDetailsPageProps {
  slug: string;
}

export default function PackageDetailsPage({ slug }: PackageDetailsPageProps) {
  const {
    packageData,
    loading,
    selectedHotel,
    selectedOccupancy,
    childAges,
    tempChildAges,
    flightBlocks,
    selectedFlightBlock,
    selectedPrice,
    sortedHotels,
    calculateNights,
    handleBooking,
    setSelectedHotel,
    setSelectedFlightBlock,
    updateAdults,
    updateChildren,
    updateChildAge,
    applyChildAges,
    hasUnappliedAgeChanges
  } = usePackageDetails(slug);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    flights: false,
    hotels: false,
    planProgram: false,
    included: false,
    useful: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Package Not Found</h2>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const nights = calculateNights(
    selectedFlightBlock?.outbound?.departureTime || packageData.departureFlight.departureTime,
    selectedFlightBlock?.return?.departureTime || packageData.returnFlight.departureTime
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="flex items-center p-4">
          <Link href="/" className="mr-3">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {packageData.name}
            </h1>
            <p className="text-sm text-gray-600 truncate">
              {packageData.city.name}, {packageData.city.country.name}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      {packageData.primaryImage && (
        <div className="relative h-48 bg-gray-200">
          <Image
            src={packageData.primaryImage}
            alt={packageData.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Quick Info Bar */}
      <div className="bg-white p-4 border-b flex justify-between text-sm">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-500" />
          <span>{nights} nights</span>
        </div>
        {packageData.featured && (
          <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
            Featured
          </span>
        )}
      </div>

      {/* Travelers Selection */}
      <div className="bg-white p-4 border-b">
        <h3 className="font-semibold text-gray-900 mb-3">Travelers</h3>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">Adults</label>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <button
                onClick={() => updateAdults(selectedOccupancy.adults - 1)}
                className="p-1 hover:bg-gray-200 rounded"
                type="button"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold">{selectedOccupancy.adults}</span>
              <button
                onClick={() => updateAdults(selectedOccupancy.adults + 1)}
                className="p-1 hover:bg-gray-200 rounded"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">Children (0-11)</label>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <button
                onClick={() => updateChildren(selectedOccupancy.children - 1)}
                className="p-1 hover:bg-gray-200 rounded"
                type="button"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold">{selectedOccupancy.children}</span>
              <button
                onClick={() => updateChildren(selectedOccupancy.children + 1)}
                className="p-1 hover:bg-gray-200 rounded"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Child Ages */}
        {selectedOccupancy.children > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <label className="text-xs text-gray-600 mb-2 block font-medium">Child Ages</label>
            <div className="space-y-2">
              {[...Array(selectedOccupancy.children)].map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-12">Child {index + 1}:</span>
                  <select
                    value={tempChildAges[index] !== undefined ? tempChildAges[index] : 5}
                    onChange={(e) => updateChildAge(index, parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((age) => (
                      <option key={age} value={age}>
                        {age} {age === 0 || age === 1 ? 'year' : 'years'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {hasUnappliedAgeChanges() && (
                <button
                  onClick={applyChildAges}
                  className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
                >
                  Update Prices
                </button>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Ages 0-1: Free • Ages 2-6: Reduced rate • Ages 7-11: Child rate
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Flight Date Selection */}
      <div className="bg-white mb-2">
        <button
          onClick={() => toggleSection('flights')}
          className="w-full flex items-center justify-between p-4 border-b"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Select Travel Dates</h3>
          </div>
          {expandedSections.flights ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {expandedSections.flights && (
          <div className="p-4 space-y-3">
            {flightBlocks.length > 0 ? flightBlocks.map((block) => {
              if (!block.outbound || !block.return) return null;

              const blockDepartureDate = new Date(block.outbound.departureTime);
              const blockReturnDate = new Date(block.return.departureTime);
              const blockNights = calculateNights(block.outbound.departureTime, block.return.departureTime);
              const isSelected = selectedFlightBlock?.blockGroupId === block.blockGroupId;
              const isSoldOut = (block.outbound.availableSeats <= 0) || (block.return.availableSeats <= 0);

              return (
                <div
                  key={block.blockGroupId}
                  onClick={() => !isSoldOut && setSelectedFlightBlock(block)}
                  className={`border rounded-lg p-3 relative ${
                    isSoldOut
                      ? 'border-gray-200 bg-gray-100 opacity-60'
                      : isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {isSoldOut && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                      SOLD OUT
                    </div>
                  )}
                  {isSelected && !isSoldOut && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Departure</span>
                      <span className="text-sm font-medium">
                        {blockDepartureDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Return</span>
                      <span className="text-sm font-medium">
                        {blockReturnDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-gray-600">{blockNights} nights</span>
                    <span className="text-sm text-gray-600">
                      {block.outbound.departureAirport.code} - {block.outbound.arrivalAirport.code}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-gray-500 text-sm py-4">
                No flight dates available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hotel Selection */}
      <div className="bg-white mb-2">
        <button
          onClick={() => toggleSection('hotels')}
          className="w-full flex items-center justify-between p-4 border-b"
        >
          <div className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Select Hotel</h3>
          </div>
          {expandedSections.hotels ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {expandedSections.hotels && (
          <div className="p-4 space-y-3">
            {sortedHotels.map((hotel) => {
              const isSelected = selectedHotel?.id === hotel.id;

              return (
                <div
                  key={hotel.id}
                  onClick={() => setSelectedHotel(hotel)}
                  className={`border rounded-lg overflow-hidden relative ${
                    isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 active:bg-gray-50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 z-10">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  {hotel.primaryImage && (
                    <div className="relative h-32 bg-gray-200">
                      <Image
                        src={hotel.primaryImage}
                        alt={hotel.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-3">
                    <h4 className="font-semibold text-gray-900 mb-1">{hotel.name}</h4>
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(hotel.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">{hotel.rating} Star</span>
                    </div>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {hotel.address}
                    </p>

                    {hotel.amenities && hotel.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {hotel.amenities.slice(0, 3).map((amenity, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {amenity}
                          </span>
                        ))}
                        {hotel.amenities.length > 3 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{hotel.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Package Overview */}
      <div className="bg-white mb-2">
        <button
          onClick={() => toggleSection('description')}
          className="w-full flex items-center justify-between p-4 border-b"
        >
          <h3 className="font-semibold text-gray-900">Package Overview</h3>
          {expandedSections.description ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.description && (
          <div className="p-4">
            <p className="text-sm text-gray-700">
              {packageData.shortDescription || packageData.description}
            </p>
          </div>
        )}
      </div>

      {/* Plan and Program */}
      {packageData.planAndProgram && (
        <div className="bg-white mb-2">
          <button
            onClick={() => toggleSection('planProgram')}
            className="w-full flex items-center justify-between p-4 border-b"
          >
            <h3 className="font-semibold text-gray-900">Plan and Program</h3>
            {expandedSections.planProgram ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.planProgram && (
            <div
              className="p-4 prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: packageData.planAndProgram }}
            />
          )}
        </div>
      )}

      {/* What is Included */}
      {packageData.whatIsIncluded && (
        <div className="bg-white mb-2">
          <button
            onClick={() => toggleSection('included')}
            className="w-full flex items-center justify-between p-4 border-b"
          >
            <h3 className="font-semibold text-gray-900">What is Included</h3>
            {expandedSections.included ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.included && (
            <div
              className="p-4 prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: packageData.whatIsIncluded }}
            />
          )}
        </div>
      )}

      {/* Useful Information */}
      {packageData.usefulInformation && (
        <div className="bg-white mb-2">
          <button
            onClick={() => toggleSection('useful')}
            className="w-full flex items-center justify-between p-4 border-b"
          >
            <h3 className="font-semibold text-gray-900">Useful Information</h3>
            {expandedSections.useful ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.useful && (
            <div
              className="p-4 prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: packageData.usefulInformation }}
            />
          )}
        </div>
      )}

      {/* Bottom Sticky Price and Booking */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="p-4">
          {/* Price Breakdown Summary */}
          {selectedPrice && (
            <div className="mb-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-gray-600">
                  {selectedOccupancy.adults} adult{selectedOccupancy.adults > 1 ? 's' : ''}
                  {selectedPrice.payingChildrenCount > 0 &&
                    ` + ${selectedPrice.payingChildrenCount} child${selectedPrice.payingChildrenCount > 1 ? 'ren' : ''}`}
                  {selectedPrice.infantsCount > 0 &&
                    ` + ${selectedPrice.infantsCount} infant${selectedPrice.infantsCount > 1 ? 's' : ''} (free)`}
                </span>
                <span className="text-xs text-gray-600">{nights} nights</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Total Price</span>
                  {selectedHotel && (
                    <p className="text-xs text-gray-500">{selectedHotel.name}</p>
                  )}
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  €{Number(selectedPrice.totalPrice).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {!selectedPrice && packageData.packagePrices.length > 0 && (
            <div className="mb-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
              This combination is not available. Please adjust your selection.
            </div>
          )}

          {/* Book Now Button */}
          <button
            onClick={handleBooking}
            disabled={packageData.packagePrices.length > 0 && !selectedPrice}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              packageData.packagePrices.length === 0 || selectedPrice
                ? 'bg-blue-600 text-white active:bg-blue-700'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {packageData.packagePrices.length === 0 || selectedPrice ? 'Book Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}
