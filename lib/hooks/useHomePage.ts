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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchData.destinationId || !searchData.departureDate) {
      alert('Please select a destination and date');
      return;
    }

    // Fetch the package for this city and date
    try {
      const params = new URLSearchParams({
        cityId: searchData.destinationId,
        date: searchData.departureDate,
        adults: searchData.adults.toString(),
        children: searchData.children.toString()
      });

      const response = await fetch(`/api/public/search?${params}`);
      if (response.ok) {
        const packages = await response.json();
        if (packages.length > 0) {
          // Redirect directly to the package details page
          const packageSlug = packages[0].slug || packages[0].id;
          router.push(`/packages/${packageSlug}`);
        } else {
          alert('No packages found for this destination and date');
        }
      }
    } catch (error) {
      console.error('Error searching for packages:', error);
      alert('Error searching for packages');
    }
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
