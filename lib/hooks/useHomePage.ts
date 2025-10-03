import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface City {
  id: string;
  name: string;
  slug: string;
  profileImage?: string;
  country: {
    name: string;
  };
}

interface FlightDate {
  date: string;
  availableSeats: number;
}

interface SearchData {
  destinationId: string;
  departureDate: string;
  adults: number;
  children: number;
}

export function useHomePage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [availableDates, setAvailableDates] = useState<FlightDate[]>([]);
  const [searchData, setSearchData] = useState<SearchData>({
    destinationId: '',
    departureDate: '',
    adults: 2,
    children: 0
  });

  useEffect(() => {
    fetchCitiesWithPackages();
  }, []);

  useEffect(() => {
    if (searchData.destinationId) {
      fetchAvailableDates(searchData.destinationId);
    }
  }, [searchData.destinationId]);

  const fetchCitiesWithPackages = async () => {
    try {
      const response = await fetch('/api/public/destinations');
      if (response.ok) {
        const data = await response.json();
        setCities(data);
      }
    } catch (error) {
      console.error('Error fetching destinations:', error);
    }
  };

  const fetchAvailableDates = async (cityId: string) => {
    try {
      const response = await fetch(`/api/public/available-dates?cityId=${cityId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchData.destinationId || !searchData.departureDate) {
      alert('Please select a destination and date');
      return;
    }

    // Navigate to search results page
    const params = new URLSearchParams({
      city: searchData.destinationId,
      date: searchData.departureDate,
      adults: searchData.adults.toString(),
      children: searchData.children.toString()
    });

    router.push(`/search?${params.toString()}`);
  };

  const updateSearchData = (updates: Partial<SearchData>) => {
    setSearchData(prev => ({ ...prev, ...updates }));
  };

  return {
    cities,
    availableDates,
    searchData,
    updateSearchData,
    handleSearch
  };
}

export type { City, FlightDate, SearchData };
