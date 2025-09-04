'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from './components/Header';
import Footer from './components/Footer';

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

export default function Home() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [availableDates, setAvailableDates] = useState<FlightDate[]>([]);
  const [searchData, setSearchData] = useState({
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Perfect City Break Awaits
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover amazing destinations with our all-inclusive city break packages. 
            Flights, hotels, transfers, and excursions - all in one place.
          </p>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Destination */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Destination
                </label>
                <select
                  value={searchData.destinationId}
                  onChange={(e) => setSearchData({ ...searchData, destinationId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select destination...</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Departure Date
                </label>
                <select
                  value={searchData.departureDate}
                  onChange={(e) => setSearchData({ ...searchData, departureDate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!searchData.destinationId}
                  required
                >
                  <option value="">Select date...</option>
                  {availableDates.map(date => (
                    <option key={date.date} value={date.date}>
                      {new Date(date.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })} ({date.availableSeats} seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* Adults */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Adults
                </label>
                <select
                  value={searchData.adults}
                  onChange={(e) => setSearchData({ ...searchData, adults: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Adult</option>
                  <option value={2}>2 Adults</option>
                  <option value={3}>3 Adults</option>
                  <option value={4}>4 Adults</option>
                </select>
              </div>

              {/* Children */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Children
                </label>
                <select
                  value={searchData.children}
                  onChange={(e) => setSearchData({ ...searchData, children: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>No Children</option>
                  <option value={1}>1 Child</option>
                  <option value={2}>2 Children</option>
                  <option value={3}>3 Children</option>
                </select>
              </div>
            </div>
            
            <button 
              type="submit"
              className="mt-6 w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search Packages
            </button>
          </form>
        </div>
      </section>

      {/* Featured Destinations */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Popular Destinations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cities.slice(0, 6).map(city => (
              <Link 
                key={city.id}
                href={`/destinations/${city.slug || city.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <div className="h-48 relative overflow-hidden">
                  {city.profileImage ? (
                    <Image
                      src={city.profileImage}
                      alt={city.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900">{city.name}</h3>
                  <p className="text-gray-600">{city.country.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}