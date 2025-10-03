import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculateRealTimePrice } from '@/lib/real-time-price-calculator';

export interface HotelOption {
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

export interface PackageDetails {
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
  flightBlocks?: any[];
  flightBlockIds?: string[];
}

export interface OccupancyState {
  adults: number;
  children: number;
}

export interface PriceResult {
  adults: number;
  children: number;
  flightPrice: number;
  hotelPrice: number;
  transferPrice: number;
  totalPrice: number;
  hotelName: string;
  hotelBoard: string;
  roomType: string;
  infantsCount: number;
  youngChildrenCount: number;
  olderChildrenCount: number;
  payingChildrenCount: number;
}

export function usePackageDetails(slug: string) {
  const router = useRouter();
  const [packageData, setPackageData] = useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedOccupancy, setSelectedOccupancy] = useState<OccupancyState>({
    adults: 2,
    children: 0
  });
  const [childAges, setChildAges] = useState<number[]>([]);
  const [tempChildAges, setTempChildAges] = useState<number[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<any[]>([]);
  const [selectedFlightBlock, setSelectedFlightBlock] = useState<any>(null);

  // Fetch package details
  useEffect(() => {
    fetchPackageDetails();
  }, [slug]);

  // Ensure childAges and tempChildAges arrays match children count
  useEffect(() => {
    const currentLength = childAges.length;
    const targetLength = selectedOccupancy.children;

    if (currentLength < targetLength) {
      const newAges = [...childAges];
      const newTempAges = [...tempChildAges];
      for (let i = currentLength; i < targetLength; i++) {
        newAges.push(5);
        newTempAges.push(5);
      }
      setChildAges(newAges);
      setTempChildAges(newTempAges);
    } else if (currentLength > targetLength) {
      setChildAges(childAges.slice(0, targetLength));
      setTempChildAges(tempChildAges.slice(0, targetLength));
    }
  }, [selectedOccupancy.children]);

  // Set default selected flight block when blocks are loaded
  useEffect(() => {
    if (flightBlocks.length > 0 && !selectedFlightBlock) {
      const firstAvailableBlock = flightBlocks.find(block => {
        const isSoldOut = (block.outbound?.availableSeats <= 0) || (block.return?.availableSeats <= 0);
        return !isSoldOut;
      });
      setSelectedFlightBlock(firstAvailableBlock || flightBlocks[0]);
    }
  }, [flightBlocks]);

  const fetchPackageDetails = async () => {
    try {
      const response = await fetch(`/api/public/packages/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setPackageData(data);

        const hotels = data.availableHotels && data.availableHotels.length > 0
          ? data.availableHotels
          : [data.hotel];

        const sortedHotels = [...hotels].sort((a: any, b: any) => {
          const getPriceForHotel = (hotel: any) => {
            if (hotel.hotelPrices && hotel.hotelPrices.length > 0) {
              const prices = hotel.hotelPrices.map((hp: any) => Number(hp.double));
              return Math.min(...prices);
            }
            return 999999;
          };

          const priceA = getPriceForHotel(a);
          const priceB = getPriceForHotel(b);

          return priceA - priceB;
        });

        if (sortedHotels.length > 0) {
          setSelectedHotel(sortedHotels[0]);
        }

        if (data.flightBlocks && data.flightBlocks.length > 0) {
          setFlightBlocks(data.flightBlocks);
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
      }
    } catch (error) {
      console.error('Error fetching flight blocks:', error);
    }
  };

  const calculateNights = (checkInDate: string, checkOutDate: string): number => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights;
  };

  const calculateAdjustedPrice = (): PriceResult | null => {
    if (!packageData || !selectedHotel || !selectedFlightBlock) return null;

    const nights = calculateNights(
      selectedFlightBlock.outbound?.departureTime || packageData.departureFlight.departureTime,
      selectedFlightBlock.return?.departureTime || packageData.returnFlight.departureTime
    );

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

  const handleBooking = () => {
    if (!packageData || !selectedHotel) return;

    const selectedPrice = calculateAdjustedPrice();
    const bookingParams = new URLSearchParams({
      packageId: packageData.id,
      hotelId: selectedHotel.id,
      adults: selectedOccupancy.adults.toString(),
      children: selectedOccupancy.children.toString(),
      price: selectedPrice ? selectedPrice.totalPrice.toString() : packageData.basePrice.toString()
    });

    router.push(`/booking?${bookingParams.toString()}`);
  };

  const getSortedHotels = (): HotelOption[] => {
    if (!packageData) return [];

    const hotels = packageData.availableHotels && packageData.availableHotels.length > 0
      ? packageData.availableHotels
      : [packageData.hotel];

    return [...hotels].sort((a, b) => {
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
  };

  const updateAdults = (count: number) => {
    setSelectedOccupancy(prev => ({
      ...prev,
      adults: Math.max(1, Math.min(4, count))
    }));
  };

  const updateChildren = (count: number) => {
    const newCount = Math.max(0, Math.min(3, count));
    setSelectedOccupancy(prev => ({
      ...prev,
      children: newCount
    }));
    if (newCount < childAges.length) {
      setChildAges(prev => prev.slice(0, newCount));
      setTempChildAges(prev => prev.slice(0, newCount));
    }
  };

  const updateChildAge = (index: number, age: number) => {
    const newTempAges = [...tempChildAges];
    newTempAges[index] = age;
    setTempChildAges(newTempAges);
  };

  const applyChildAges = () => {
    setChildAges([...tempChildAges]);
  };

  const hasUnappliedAgeChanges = (): boolean => {
    return tempChildAges.some((age, idx) => age !== childAges[idx]);
  };

  return {
    // State
    packageData,
    loading,
    selectedHotel,
    selectedDate,
    selectedOccupancy,
    childAges,
    tempChildAges,
    flightBlocks,
    selectedFlightBlock,

    // Setters
    setSelectedHotel,
    setSelectedDate,
    setSelectedFlightBlock,

    // Computed values
    selectedPrice: calculateAdjustedPrice(),
    sortedHotels: getSortedHotels(),

    // Utility functions
    calculateNights,

    // Actions
    handleBooking,
    updateAdults,
    updateChildren,
    updateChildAge,
    applyChildAges,
    hasUnappliedAgeChanges
  };
}
