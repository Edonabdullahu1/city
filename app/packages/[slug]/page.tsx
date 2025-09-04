'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Calendar, MapPin, Clock, Users, Plane, Hotel, ChevronRight, Check, Plus, Minus } from 'lucide-react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { calculateRealTimePrice, formatDisplayPrice } from '@/lib/real-time-price-calculator';

interface HotelOption {
  id: string;
  name: string;
  slug: string;
  rating: number;
  address: string;
  amenities: string[];
  description: string;
  primaryImage?: string;
  hotelPrices?: Array<{
    single: number;
    double: number;
    extraBed: number;
    payingKidsAge: string;
    paymentKids: number;
    fromDate: string;
    tillDate: string;
    board: string;
  }>;
}

interface PackageDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  primaryImage?: string;
  planAndProgram?: string;
  whatIsIncluded?: string;
  usefulInformation?: string;
  info?: string;
  duration: string;
  basePrice: number;
  featured: boolean;
  active: boolean;
  availableFrom: string;
  availableTo: string;
  hotel: HotelOption;
  availableHotels: HotelOption[];
  city: {
    id: string;
    name: string;
    slug: string;
    country: {
      name: string;
      code: string;
    };
  };
  departureFlight: {
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
  returnFlight: {
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
  packagePrices: Array<{
    adults: number;
    children: number;
    flightPrice: number;
    hotelPrice: number;
    transferPrice: number;
    totalPrice: number;
    hotelName?: string;
    hotelBoard?: string;
    roomType?: string;
    flightBlockId?: string;
    nights?: number;
  }>;
}

export default function PackageDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [packageData, setPackageData] = useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedOccupancy, setSelectedOccupancy] = useState({
    adults: 2,
    children: 0
  });
  const [childAges, setChildAges] = useState<number[]>([]);
  const [tempChildAges, setTempChildAges] = useState<number[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<any[]>([]);
  const [selectedFlightBlock, setSelectedFlightBlock] = useState<any>(null);

  useEffect(() => {
    fetchPackageDetails();
  }, [resolvedParams.slug]);

  // Ensure childAges and tempChildAges arrays match children count
  useEffect(() => {
    const currentLength = childAges.length;
    const targetLength = selectedOccupancy.children;
    
    if (currentLength < targetLength) {
      // Add default ages for new children
      const newAges = [...childAges];
      const newTempAges = [...tempChildAges];
      for (let i = currentLength; i < targetLength; i++) {
        newAges.push(5); // Default age
        newTempAges.push(5);
      }
      setChildAges(newAges);
      setTempChildAges(newTempAges);
    } else if (currentLength > targetLength) {
      // Remove excess ages
      setChildAges(childAges.slice(0, targetLength));
      setTempChildAges(tempChildAges.slice(0, targetLength));
    }
  }, [selectedOccupancy.children]);

  const fetchPackageDetails = async () => {
    try {
      const response = await fetch(`/api/public/packages/${resolvedParams.slug}`);
      if (response.ok) {
        const data = await response.json();
        setPackageData(data);
        
        // Sort hotels by price and select the cheapest (first) one
        const hotels = data.availableHotels && data.availableHotels.length > 0 
          ? data.availableHotels 
          : [data.hotel];
        
        // Sort hotels by their cheapest price (using HB price or any available price)
        const sortedHotels = [...hotels].sort((a: any, b: any) => {
          // Get the cheapest double room price for each hotel
          const getPriceForHotel = (hotel: any) => {
            if (hotel.hotelPrices && hotel.hotelPrices.length > 0) {
              // Find the cheapest double room price
              const prices = hotel.hotelPrices.map((hp: any) => Number(hp.double));
              return Math.min(...prices);
            }
            return 999999; // High number if no price found
          };
          
          const priceA = getPriceForHotel(a);
          const priceB = getPriceForHotel(b);
          
          return priceA - priceB;
        });
        
        // Set the cheapest hotel as selected
        if (sortedHotels.length > 0) {
          setSelectedHotel(sortedHotels[0]);
        }
        
        // Set flight blocks - wait for them to load before setting selection
        if (data.flightBlocks && data.flightBlocks.length > 0) {
          setFlightBlocks(data.flightBlocks);
          // Don't set selected flight block here - wait for useEffect
        } else if (data.flightBlockIds && data.flightBlockIds.length > 0) {
          fetchFlightBlocks(data.flightBlockIds);
        }
      }
    } catch (error) {
      console.error('Error fetching package details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlightBlocks = async (blockIds: string[]) => {
    try {
      const response = await fetch(`/api/public/flight-blocks?blockIds=${blockIds.join(',')}`);
      if (response.ok) {
        const blocks = await response.json();
        setFlightBlocks(blocks);
        // Don't set selected here - let useEffect handle it
      }
    } catch (error) {
      console.error('Error fetching flight blocks:', error);
    }
  };

  // Set default selected flight block when blocks are loaded
  useEffect(() => {
    if (flightBlocks.length > 0 && !selectedFlightBlock) {
      setSelectedFlightBlock(flightBlocks[0]);
    }
  }, [flightBlocks]);

  // Helper function to calculate hotel nights based on check-in and check-out dates
  // Check-in: Arrival date at destination (outbound flight arrival)
  // Check-out: Departure date from destination (return flight departure)
  const calculateNights = (checkInDate: string, checkOutDate: string) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    // Set to start of day to ignore time component
    // This ensures we count calendar dates, not hours
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    
    // Calculate difference in days (number of nights stayed)
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights;
  };

  // Calculate real-time price from database data
  const calculateAdjustedPrice = () => {
    if (!packageData || !selectedHotel || !selectedFlightBlock) return null;
    
    // Calculate nights using calendar dates
    const nights = calculateNights(
      selectedFlightBlock.outbound?.departureTime || packageData.departureFlight.departureTime,
      selectedFlightBlock.return?.departureTime || packageData.returnFlight.departureTime
    );
    
    // Use real-time price calculation
    const departureDateForPricing = new Date(selectedFlightBlock.outbound?.departureTime || packageData.departureFlight.departureTime);
    const priceResult = calculateRealTimePrice({
      adults: selectedOccupancy.adults,
      children: selectedOccupancy.children,
      childAges: childAges.slice(0, selectedOccupancy.children),
      flightBlock: selectedFlightBlock,
      hotel: selectedHotel,
      nights: nights,
      travelDate: departureDateForPricing
    });
    
    // Count children by age for display
    const actualChildAges = childAges.slice(0, selectedOccupancy.children);
    const infantsCount = actualChildAges.filter(age => age <= 1).length;
    const youngChildrenCount = actualChildAges.filter(age => age >= 2 && age <= 6).length;
    const olderChildrenCount = actualChildAges.filter(age => age >= 7 && age <= 11).length;
    
    return {
      adults: selectedOccupancy.adults,
      children: selectedOccupancy.children,
      flightPrice: priceResult.flightPrice,
      hotelPrice: priceResult.hotelPrice,
      transferPrice: priceResult.transferPrice,
      totalPrice: priceResult.totalPrice,
      hotelName: selectedHotel.name,
      hotelBoard: 'BB',
      roomType: selectedOccupancy.adults === 1 ? 'Single' : 'Double',
      infantsCount,
      youngChildrenCount,
      olderChildrenCount,
      payingChildrenCount: youngChildrenCount + olderChildrenCount
    };
  };
  
  const selectedPrice = calculateAdjustedPrice();

  const handleBooking = () => {
    if (!packageData || !selectedHotel) return;
    
    const bookingParams = new URLSearchParams({
      packageId: packageData.id,
      hotelId: selectedHotel.id,
      adults: selectedOccupancy.adults.toString(),
      children: selectedOccupancy.children.toString(),
      price: selectedPrice ? selectedPrice.totalPrice.toString() : packageData.basePrice.toString()
    });
    
    router.push(`/booking?${bookingParams.toString()}`);
  };

  // Generate available dates based on package availability
  const generateAvailableDates = () => {
    if (!packageData) return [];
    
    const dates = [];
    const startDate = new Date(packageData.availableFrom);
    const endDate = new Date(packageData.availableTo);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate departures every 3 days
    const current = new Date(Math.max(startDate.getTime(), today.getTime()));
    let dayCount = 0;
    
    while (current <= endDate && dates.length < 30) { // Limit to 30 dates
      // Add a date every 3 days
      if (dayCount % 3 === 0) {
        dates.push({
          value: current.toISOString().split('T')[0],
          label: current.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        });
      }
      current.setDate(current.getDate() + 1);
      dayCount++;
    }
    
    // If no dates generated, add at least today if within range
    if (dates.length === 0 && today >= startDate && today <= endDate) {
      dates.push({
        value: today.toISOString().split('T')[0],
        label: today.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      });
    }
    
    return dates;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!packageData) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Package not found</p>
        </div>
        <Footer />
      </>
    );
  }

  const departureDate = new Date(packageData.departureFlight.departureTime);
  const returnDate = new Date(packageData.returnFlight.departureTime);
  // Calculate nights using the helper function
  const nights = calculateNights(packageData.departureFlight.departureTime, packageData.returnFlight.departureTime);

  // Get all available hotels (from availableHotels or fallback to single hotel)
  const hotels = packageData.availableHotels && packageData.availableHotels.length > 0 
    ? packageData.availableHotels 
    : [packageData.hotel];

  // Sort hotels by price (low to high)
  const sortedHotels = [...hotels].sort((a, b) => {
    // Find the cheapest price for each hotel
    const priceA = packageData.packagePrices
      .filter(p => p.hotelName === a.name && p.adults === selectedOccupancy.adults && p.children === 0)
      .map(p => Number(p.totalPrice))
      .sort((x, y) => x - y)[0] || 999999;
    
    const priceB = packageData.packagePrices
      .filter(p => p.hotelName === b.name && p.adults === selectedOccupancy.adults && p.children === 0)
      .map(p => Number(p.totalPrice))
      .sort((x, y) => x - y)[0] || 999999;
    
    return priceA - priceB;
  });

  return (
    <>
      <Header />

      {/* Hero Section with Breadcrumb */}
      <div className="relative h-64">
        {packageData.primaryImage ? (
          <>
            <Image
              src={packageData.primaryImage}
              alt={packageData.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          </>
        ) : (
          <>
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800"></div>
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2 text-sm mb-2">
              <Link href="/" className="hover:underline">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/destinations" className="hover:underline">Destinations</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/destinations/${packageData.city.slug}`} className="hover:underline">
                {packageData.city.name}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span>{packageData.name}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{packageData.name}</h1>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {packageData.city.name}, {packageData.city.country.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {packageData.duration || `${nights} nights`}
              </span>
              {packageData.featured && (
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                  Featured
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Package Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Package Overview</h2>
              <p className="text-gray-700">{packageData.shortDescription || packageData.description || 'Experience an unforgettable city break with our carefully curated package.'}</p>
            </div>

            {/* Flight Date Selection */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Travel Date</h2>
              
              {/* Display all flight blocks with selection */}
              <div className="space-y-2">
                {flightBlocks.length > 0 ? flightBlocks.map((block, index) => {
                  if (!block.outbound || !block.return) return null;
                  
                  const blockDepartureDate = new Date(block.outbound.departureTime);
                  const blockReturnDate = new Date(block.return.departureTime);
                  const blockNights = calculateNights(block.outbound.departureTime, block.return.departureTime);
                  const isSelected = selectedFlightBlock?.blockGroupId === block.blockGroupId;
                  
                  // Calculate adjusted price for this specific block based on child ages
                  let blockPrice = null;
                  if (packageData.packagePrices && selectedHotel) {
                    // First get base adult price for this block
                    const basePrice = packageData.packagePrices.find(price => {
                      const matchesAdults = price.adults === selectedOccupancy.adults && price.children === 0;
                      const matchesHotel = price.hotelName === selectedHotel.name;
                      const matchesBlock = price.flightBlockId === block.blockGroupId;
                      return matchesAdults && matchesHotel && matchesBlock;
                    });
                    
                    if (basePrice) {
                      // Start with base price
                      let adjustedTotal = Number(basePrice.totalPrice);
                      
                      // If there are children, calculate their costs based on ages
                      if (selectedOccupancy.children > 0 && childAges.length > 0) {
                        // Get actual child ages
                        const actualChildAges = [...childAges];
                        while (actualChildAges.length < selectedOccupancy.children) {
                          actualChildAges.push(5); // Default age
                        }
                        
                        // Find price with children for reference
                        const withChildren = packageData.packagePrices.find(
                          price => price.children > 0 && 
                                  price.hotelName === selectedHotel.name &&
                                  price.flightBlockId === block.blockGroupId
                        );
                        
                        if (withChildren) {
                          const correspondingAdultOnly = packageData.packagePrices.find(
                            price => price.adults === withChildren.adults && 
                                    price.children === 0 &&
                                    price.hotelName === withChildren.hotelName &&
                                    price.flightBlockId === block.blockGroupId
                          );
                          
                          if (correspondingAdultOnly) {
                            const totalChildrenInRef = withChildren.children;
                            const perChildCost = (Number(withChildren.totalPrice) - Number(correspondingAdultOnly.totalPrice)) / totalChildrenInRef;
                            
                            // Add cost for each child based on age
                            let childCostTotal = 0;
                            for (let i = 0; i < selectedOccupancy.children && i < actualChildAges.length; i++) {
                              const age = actualChildAges[i];
                              if (age > 1) { // Only charge for children over 1
                                childCostTotal += perChildCost;
                              }
                            }
                            
                            adjustedTotal += childCostTotal;
                          }
                        }
                      }
                      
                      blockPrice = {
                        ...basePrice,
                        totalPrice: adjustedTotal
                      };
                    }
                  }
                  
                  return (
                    <div 
                      key={block.blockGroupId} 
                      onClick={() => setSelectedFlightBlock(block)}
                      className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex relative">
                        {/* Left side - Dates (70%) */}
                        <div className="w-[70%] p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">Departure</p>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">
                                  {blockDepartureDate.toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {block.outbound.departureAirport.code} → {block.outbound.arrivalAirport.code}
                              </p>
                            </div>
                            
                            <div className="border-r h-12"></div>
                            
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">Return</p>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">
                                  {blockReturnDate.toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {block.return.departureAirport.code} → {block.return.arrivalAirport.code}
                              </p>
                            </div>
                          </div>
                          
                        </div>
                        
                        {/* Right side - Price and Nights (30%) */}
                        <div className={`w-[30%] p-4 border-l relative ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <div className="flex flex-col justify-center h-full text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              €{blockPrice ? Number(blockPrice.flightPrice).toFixed(2) : '---'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              for {selectedOccupancy.adults + selectedOccupancy.children} {(selectedOccupancy.adults + selectedOccupancy.children) === 1 ? 'person' : 'people'}
                            </p>
                            <p className="text-xs text-gray-500">
                              for {blockNights} {blockNights === 1 ? 'night' : 'nights'}
                            </p>
                          </div>
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-blue-600 text-white rounded-full p-2">
                              <Check className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  // Fallback to original package flight data when blocks not loaded
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex">
                      <div className="w-[70%] p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Departure</p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {new Date(packageData.departureFlight.departureTime).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {packageData.departureFlight.departureAirport.code} → {packageData.departureFlight.arrivalAirport.code}
                            </p>
                          </div>
                          
                          <div className="border-r h-12"></div>
                          
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Return</p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {new Date(packageData.returnFlight.departureTime).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {packageData.returnFlight.departureAirport.code} → {packageData.returnFlight.arrivalAirport.code}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-[30%] p-4 border-l bg-gray-50">
                        <div className="flex flex-col justify-center h-full text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            €{selectedPrice ? Number(selectedPrice.totalPrice).toFixed(2) : '---'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            for {selectedOccupancy.adults + selectedOccupancy.children} {(selectedOccupancy.adults + selectedOccupancy.children) === 1 ? 'person' : 'people'}
                          </p>
                          <p className="text-xs text-gray-500">
                            for {nights} {nights === 1 ? 'night' : 'nights'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hotel Selection */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {sortedHotels.length > 1 ? 'Select Your Hotel' : 'Hotel Information'}
              </h2>
              
              {sortedHotels.length > 1 ? (
                <div className="space-y-4">
                  {sortedHotels.map(hotel => {
                    // Calculate price for this specific hotel with age adjustments
                    // First, temporarily set this as selected hotel to calculate price
                    const tempSelectedHotel = selectedHotel;
                    const hotelSpecificPrice = (() => {
                      // Use the same calculateAdjustedPrice logic but for this specific hotel
                      const actualChildAges = [...childAges];
                      while (actualChildAges.length < selectedOccupancy.children) {
                        actualChildAges.push(5);
                      }
                      
                      // Determine which flight block to use for pricing
                      const flightBlockId = selectedFlightBlock?.blockGroupId || 
                                           (flightBlocks.length > 0 ? flightBlocks[0].blockGroupId : null);
                      
                      // Find base adult price for this hotel
                      let baseAdultPrice = packageData.packagePrices.find(
                        price => {
                          const matchesAdults = price.adults === selectedOccupancy.adults && price.children === 0;
                          const matchesHotel = price.hotelName === hotel.name;
                          const matchesFlightBlock = price.flightBlockId === flightBlockId;
                          return matchesAdults && matchesHotel && matchesFlightBlock;
                        }
                      );
                      
                      if (!baseAdultPrice && hotel) {
                        baseAdultPrice = packageData.packagePrices.find(
                          price => price.adults === 2 && price.children === 0 && 
                                  price.hotelName === hotel.name &&
                                  price.flightBlockId === flightBlockId
                        );
                      }
                      
                      if (!baseAdultPrice) return null;
                      
                      // Start with base adult price
                      let totalPrice = Number(baseAdultPrice.totalPrice);
                      
                      // Add child costs based on ages
                      if (selectedOccupancy.children > 0 && actualChildAges.length > 0) {
                        let withChildren = packageData.packagePrices.find(
                          price => price.children > 0 && 
                                  price.hotelName === hotel.name &&
                                  price.flightBlockId === flightBlockId
                        );
                        
                        if (!withChildren) {
                          withChildren = packageData.packagePrices.find(
                            price => price.children === 1 &&
                                    price.flightBlockId === flightBlockId
                          );
                        }
                        
                        if (withChildren) {
                          const correspondingAdultOnly = packageData.packagePrices.find(
                            price => price.adults === withChildren.adults && price.children === 0 && 
                                    price.hotelName === withChildren.hotelName &&
                                    price.flightBlockId === flightBlockId
                          );
                          
                          if (correspondingAdultOnly) {
                            const totalChildrenInRef = withChildren.children;
                            const perChildFlightCost = Math.abs(Number(withChildren.flightPrice || 0) - Number(correspondingAdultOnly.flightPrice || 0)) / totalChildrenInRef;
                            const perChildHotelCost = Math.abs(Number(withChildren.hotelPrice || 0) - Number(correspondingAdultOnly.hotelPrice || 0)) / totalChildrenInRef;
                            const perChildTransferCost = Math.abs(Number(withChildren.transferPrice || 0) - Number(correspondingAdultOnly.transferPrice || 0)) / totalChildrenInRef;
                            
                            let childCostTotal = 0;
                            let freeYoungChildUsed = false;
                            
                            for (let i = 0; i < selectedOccupancy.children && i < actualChildAges.length; i++) {
                              const age = actualChildAges[i];
                              
                              if (age <= 1) {
                                // Infants free
                              } else if (age >= 2 && age <= 6) {
                                // Young children: flight and transfer, first one free hotel
                                childCostTotal += perChildFlightCost + perChildTransferCost;
                                if (freeYoungChildUsed) {
                                  childCostTotal += perChildHotelCost;
                                } else {
                                  freeYoungChildUsed = true;
                                }
                              } else if (age >= 7 && age <= 11) {
                                // Older children: everything
                                childCostTotal += perChildFlightCost + perChildHotelCost + perChildTransferCost;
                              }
                            }
                            
                            totalPrice += childCostTotal;
                          }
                        }
                      }
                      
                      return {
                        ...baseAdultPrice,
                        totalPrice
                      };
                    })();
                    
                    const hotelPrice = hotelSpecificPrice;
                    
                    return (
                      <div
                        key={hotel.id}
                        onClick={() => setSelectedHotel(hotel)}
                        className={`border rounded-lg overflow-hidden cursor-pointer transition-all relative ${
                          selectedHotel?.id === hotel.id 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Selection indicator */}
                        {selectedHotel?.id === hotel.id && (
                          <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-2 z-10">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                        
                        <div className="flex">
                          {/* Hotel Image */}
                          <div className="w-[300px] h-[250px] relative flex-shrink-0">
                            {hotel.primaryImage ? (
                              <Image
                                src={hotel.primaryImage}
                                alt={hotel.name}
                                fill
                                sizes="300px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Hotel className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Hotel Details */}
                          <div className="flex-1 p-6">
                            <div className="flex justify-between items-center h-[200px]">
                              <div className="flex-1 flex flex-col justify-between h-full">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{hotel.name}</h3>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="flex text-yellow-400">
                                      {[...Array(hotel.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                      ))}
                                    </div>
                                    <span className="text-gray-600">{hotel.rating} Star Hotel</span>
                                  </div>
                                  <p className="text-gray-600 mb-3 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {hotel.address}
                                  </p>
                                  
                                  {/* Room and Board Info */}
                                  {hotelPrice && (
                                    <div className="flex flex-wrap gap-3 mb-3">
                                      {hotelPrice.roomType && (
                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                          <Hotel className="w-3 h-3 mr-1" />
                                          {hotelPrice.roomType}
                                        </span>
                                      )}
                                      {hotelPrice.hotelBoard && (
                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                          {hotelPrice.hotelBoard}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Amenities */}
                                {hotel.amenities && hotel.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {hotel.amenities.slice(0, 4).map((amenity, index) => (
                                      <span 
                                        key={index}
                                        className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                    {hotel.amenities.length > 4 && (
                                      <span className="text-xs text-gray-500">
                                        +{hotel.amenities.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                              </div>
                              
                              {/* Price Tag and More Info */}
                              <div className="ml-4 flex flex-col justify-between items-end self-stretch">
                                <div className="flex-1 flex items-center">
                                  {hotelPrice ? (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">Hotel Price</p>
                                      <p className="text-2xl font-bold text-blue-600">
                                        €{Number(hotelPrice.hotelPrice).toFixed(2)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        for {selectedOccupancy.adults} {selectedOccupancy.adults === 1 ? 'adult' : 'adults'}
                                        {selectedOccupancy.children > 0 && ` + ${selectedOccupancy.children} ${selectedOccupancy.children === 1 ? 'child' : 'children'}`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">Contact for Price</p>
                                      <p className="text-lg font-semibold text-gray-600">
                                        Price on Request
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        for {selectedOccupancy.adults} {selectedOccupancy.adults === 1 ? 'adult' : 'adults'}
                                        {selectedOccupancy.children > 0 && ` + ${selectedOccupancy.children} ${selectedOccupancy.children === 1 ? 'child' : 'children'}`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* More Info Button */}
                                <Link 
                                  href={`/hotels/${hotel.slug}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  More Info
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Single hotel display (original layout)
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{sortedHotels[0].name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(sortedHotels[0].rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-current" />
                        ))}
                      </div>
                      <span className="text-gray-600">{sortedHotels[0].rating} Star Hotel</span>
                    </div>
                    <p className="text-gray-600 mb-2 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {sortedHotels[0].address}
                    </p>
                    <p className="text-gray-700 mb-4">{sortedHotels[0].description || 'Comfortable accommodation in a prime location.'}</p>
                    
                    {sortedHotels[0].amenities && sortedHotels[0].amenities.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {sortedHotels[0].amenities.map((amenity, index) => (
                            <span 
                              key={index}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Flight Information */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Flight Information</h2>
              
              {/* Outbound Flight */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Outbound Flight</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedFlightBlock?.outbound?.flightNumber || packageData.departureFlight.flightNumber}</p>
                      <p className="text-sm text-gray-600">{selectedFlightBlock?.outbound?.departureAirport?.code || packageData.departureFlight.departureAirport.code}</p>
                      <p className="text-lg font-semibold">
                        {new Date(selectedFlightBlock?.outbound?.departureTime || packageData.departureFlight.departureTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedFlightBlock?.outbound?.departureTime || packageData.departureFlight.departureTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-center">
                      <Plane className="w-6 h-6 text-gray-400 rotate-90" />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">&nbsp;</p>
                      <p className="text-sm text-gray-600">{selectedFlightBlock?.outbound?.arrivalAirport?.code || packageData.departureFlight.arrivalAirport.code}</p>
                      <p className="text-lg font-semibold">
                        {new Date(selectedFlightBlock?.outbound?.arrivalTime || packageData.departureFlight.arrivalTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedFlightBlock?.outbound?.arrivalTime || packageData.departureFlight.arrivalTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Flight */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Return Flight</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedFlightBlock?.return?.flightNumber || packageData.returnFlight.flightNumber}</p>
                      <p className="text-sm text-gray-600">{selectedFlightBlock?.return?.departureAirport?.code || packageData.returnFlight.departureAirport.code}</p>
                      <p className="text-lg font-semibold">
                        {new Date(selectedFlightBlock?.return?.departureTime || packageData.returnFlight.departureTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedFlightBlock?.return?.departureTime || packageData.returnFlight.departureTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-center">
                      <Plane className="w-6 h-6 text-gray-400 rotate-90" />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">&nbsp;</p>
                      <p className="text-sm text-gray-600">{selectedFlightBlock?.return?.arrivalAirport?.code || packageData.returnFlight.arrivalAirport.code}</p>
                      <p className="text-lg font-semibold">
                        {new Date(selectedFlightBlock?.return?.arrivalTime || packageData.returnFlight.arrivalTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedFlightBlock?.return?.arrivalTime || packageData.returnFlight.arrivalTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan and Program */}
            {packageData.planAndProgram && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Plan and Program</h2>
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: packageData.planAndProgram }}
                />
              </div>
            )}

            {/* What is Included */}
            {packageData.whatIsIncluded && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">What is Included</h2>
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: packageData.whatIsIncluded }}
                />
              </div>
            )}

            {/* Useful Information */}
            {packageData.usefulInformation && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Useful Information</h2>
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: packageData.usefulInformation }}
                />
              </div>
            )}

            {/* Additional Information */}
            {packageData.info && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: packageData.info }}
                />
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Book This Package</h2>
              
              {/* Occupancy Selection - Moved to top */}
              <div className="mb-4 p-3 border rounded-lg">
                <div className="flex gap-4">
                  {/* Adults */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Adults</label>
                    <div className="flex items-center">
                      <button
                        onClick={() => setSelectedOccupancy(prev => ({
                          ...prev,
                          adults: Math.max(1, prev.adults - 1)
                        }))}
                        className="p-1 border rounded hover:bg-gray-100"
                        type="button"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="mx-3 min-w-[20px] text-center font-semibold">
                        {selectedOccupancy.adults}
                      </span>
                      <button
                        onClick={() => setSelectedOccupancy(prev => ({
                          ...prev,
                          adults: Math.min(4, prev.adults + 1)
                        }))}
                        className="p-1 border rounded hover:bg-gray-100"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Children */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Children (0-11)</label>
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          const newCount = Math.max(0, selectedOccupancy.children - 1);
                          setSelectedOccupancy(prev => ({
                            ...prev,
                            children: newCount
                          }));
                          setChildAges(prev => prev.slice(0, newCount));
                        }}
                        className="p-1 border rounded hover:bg-gray-100"
                        type="button"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="mx-3 min-w-[20px] text-center font-semibold">
                        {selectedOccupancy.children}
                      </span>
                      <button
                        onClick={() => {
                          const newCount = Math.min(3, selectedOccupancy.children + 1);
                          setSelectedOccupancy(prev => ({
                            ...prev,
                            children: newCount
                          }));
                          // Child ages are now managed by useEffect
                        }}
                        className="p-1 border rounded hover:bg-gray-100"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Child Age Selection */}
                {selectedOccupancy.children > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <label className="text-xs text-gray-600 mb-2 block">Child Ages</label>
                    <div className="space-y-2">
                      {[...Array(selectedOccupancy.children)].map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 min-w-[50px]">Child {index + 1}:</span>
                          <select
                            value={tempChildAges[index] !== undefined ? tempChildAges[index] : 5}
                            onChange={(e) => {
                              const newTempAges = [...tempChildAges];
                              newTempAges[index] = parseInt(e.target.value);
                              setTempChildAges(newTempAges);
                            }}
                            className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((age) => (
                              <option key={age} value={age}>
                                {age} {age === 0 || age === 1 ? 'year' : 'years'}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {/* Update button to apply age changes */}
                      {tempChildAges.some((age, idx) => age !== childAges[idx]) && (
                        <button
                          onClick={() => setChildAges([...tempChildAges])}
                          className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          Update Prices
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        • Ages 0-1: Free (no charges)<br/>
                        • Ages 2-6: First child may be free<br/>
                        • Ages 7-11: Full child rate applies
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selected Date Summary */}
              {selectedFlightBlock && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Selected Dates:</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedFlightBlock.outbound.departureTime).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })} - {new Date(selectedFlightBlock.return.departureTime).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {calculateNights(selectedFlightBlock.outbound.departureTime, selectedFlightBlock.return.departureTime)} nights
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              )}
              
              {/* Selected Hotel Summary */}
              {selectedHotel && sortedHotels.length > 1 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Selected Hotel:</p>
                  <p className="font-semibold text-gray-900">{selectedHotel.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex text-yellow-400">
                      {[...Array(selectedHotel.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">{selectedHotel.rating} Star</span>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {selectedPrice && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Price Breakdown</h3>
                  {selectedPrice.flightPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Flight
                        {selectedPrice.payingChildrenCount > 0 && (
                          <span className="text-xs"> ({selectedOccupancy.adults} adults + {selectedPrice.payingChildrenCount} children)</span>
                        )}
                      </span>
                      <span className="font-medium">€{Number(selectedPrice.flightPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPrice.hotelPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Hotel {selectedPrice.roomType ? `(${selectedPrice.roomType})` : ''}
                      </span>
                      <span className="font-medium">€{Number(selectedPrice.hotelPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPrice.transferPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transfer</span>
                      <span className="font-medium">€{Number(selectedPrice.transferPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPrice.hotelBoard && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Board</span>
                      <span className="text-gray-700">{selectedPrice.hotelBoard}</span>
                    </div>
                  )}
                  {selectedPrice.infantsCount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{selectedPrice.infantsCount} infant{selectedPrice.infantsCount > 1 ? 's' : ''} (0-1 years)</span>
                      <span>FREE</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">
                        Total for {selectedOccupancy.adults} adult{selectedOccupancy.adults > 1 ? 's' : ''}
                        {selectedPrice.payingChildrenCount > 0 && ` + ${selectedPrice.payingChildrenCount} child${selectedPrice.payingChildrenCount > 1 ? 'ren' : ''}`}
                        {selectedPrice.infantsCount > 0 && ` + ${selectedPrice.infantsCount} infant${selectedPrice.infantsCount > 1 ? 's' : ''}`}
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        €{Number(selectedPrice.totalPrice).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {nights} nights
                      {selectedPrice.infantsCount > 0 && ` • Infants (0-1) travel free`}
                    </p>
                  </div>
                </div>
              )}

              {!selectedPrice && packageData.packagePrices.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    This occupancy combination is not available for this package.
                    Please select a different combination.
                  </p>
                </div>
              )}

              {packageData.packagePrices.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Price on request for {selectedOccupancy.adults} {selectedOccupancy.adults === 1 ? 'adult' : 'adults'}
                    {selectedOccupancy.children > 0 && ` + ${selectedOccupancy.children} ${selectedOccupancy.children === 1 ? 'child' : 'children'}`}
                  </p>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={packageData.packagePrices.length > 0 && !selectedPrice}
                className={`w-full py-3 rounded-lg font-semibold transition-colors mt-6 ${
                  (packageData.packagePrices.length === 0 || selectedPrice)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {(packageData.packagePrices.length === 0 || selectedPrice) ? 'Book Now' : 'Unavailable'}
              </button>

              {/* Additional Info */}
              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Free cancellation up to 24 hours before</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Instant confirmation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>All taxes and fees included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}