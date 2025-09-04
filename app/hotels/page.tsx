'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Hotel {
  id: string;
  name: string;
  slug: string;
  rating: number;
  address: string;
  primaryImage: string | null;
  images: any;
  city: {
    id: string;
    name: string;
    slug: string;
    country: {
      name: string;
    };
  };
  _count: {
    packages: number;
  };
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await fetch('/api/public/hotels');
      if (response.ok) {
        const data = await response.json();
        setHotels(data);
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHotels = () => {
    let filtered = hotels;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(hotel =>
        hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hotel.city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hotel.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by rating
    if (selectedRating !== 'all') {
      const rating = parseInt(selectedRating);
      filtered = filtered.filter(hotel => hotel.rating === rating);
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(hotel => hotel.city.id === selectedCity);
    }

    return filtered;
  };

  const getUniqueCities = () => {
    const cities = new Map();
    hotels.forEach(hotel => {
      if (!cities.has(hotel.city.id)) {
        cities.set(hotel.city.id, hotel.city);
      }
    });
    return Array.from(cities.values());
  };

  const filteredHotels = getFilteredHotels();
  const cities = getUniqueCities();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading hotels...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Our Partner Hotels</h1>
          <p className="text-xl opacity-90">
            Stay at carefully selected hotels offering comfort and excellent service
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search hotels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Star</option>
              <option value="4">4 Star</option>
              <option value="3">3 Star</option>
            </select>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cities</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Hotels Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredHotels.length} Hotels Available
            </h2>
          </div>

          {filteredHotels.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600 text-lg">
                No hotels found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map(hotel => (
                <Link
                  key={hotel.id}
                  href={`/hotels/${hotel.slug}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="h-48 relative overflow-hidden">
                    {(() => {
                      const imageUrl = hotel.primaryImage || 
                        (hotel.images && Array.isArray(hotel.images) && hotel.images.length > 0 
                          ? (typeof hotel.images[0] === 'string' ? hotel.images[0] : hotel.images[0].url)
                          : null);
                      
                      if (imageUrl) {
                        return (
                          <img 
                            src={imageUrl} 
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                          />
                        );
                      } else {
                        return (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600" />
                        );
                      }
                    })()}
                    <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                      <div className="flex text-yellow-400">
                        {[...Array(hotel.rating)].map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {hotel.name}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      📍 {hotel.city.name}, {hotel.city.country.name}
                    </p>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                      {hotel.address}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {hotel._count.packages} {hotel._count.packages === 1 ? 'Package' : 'Packages'}
                      </span>
                      <span className="text-blue-600 font-medium">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}