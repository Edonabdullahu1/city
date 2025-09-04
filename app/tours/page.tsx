'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { calculateDisplayPrice } from '@/lib/price-utils';

interface Package {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration: string;
  basePrice: number;
  featured: boolean;
  primaryImage: string | null;
  hotel: {
    name: string;
    rating: number;
  };
  city: {
    name: string;
    slug: string;
    country: {
      name: string;
    };
  };
  departureFlight: {
    departureTime: string;
  };
  returnFlight: {
    departureTime: string;
  };
  packagePrices: Array<{
    totalPrice: number;
  }>;
}

export default function ToursPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState<'price' | 'date' | 'featured'>('featured');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/public/search?cityId=all&date=all');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPackages = () => {
    let filtered = packages;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(pkg =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.hotel.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(pkg => pkg.city.slug === selectedCity);
    }

    // Sort packages
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const aPrice = calculateDisplayPrice(a.packagePrices, a.basePrice);
          const bPrice = calculateDisplayPrice(b.packagePrices, b.basePrice);
          return aPrice - bPrice;
        case 'date':
          return new Date(a.departureFlight.departureTime).getTime() - 
                 new Date(b.departureFlight.departureTime).getTime();
        case 'featured':
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getUniqueCities = () => {
    const cities = new Map();
    packages.forEach(pkg => {
      if (!cities.has(pkg.city.slug)) {
        cities.set(pkg.city.slug, pkg.city);
      }
    });
    return Array.from(cities.values());
  };

  const filteredPackages = getFilteredPackages();
  const cities = getUniqueCities();

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading packages...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">All Travel Packages</h1>
          <p className="text-xl opacity-90">
            Browse our complete collection of city break packages
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
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Destinations</option>
              {cities.map(city => (
                <option key={city.slug} value={city.slug}>
                  {city.name}, {city.country.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="featured">Featured First</option>
              <option value="price">Price: Low to High</option>
              <option value="date">Departure Date</option>
            </select>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredPackages.length} {filteredPackages.length === 1 ? 'Package' : 'Packages'} Available
            </h2>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600 text-lg">
                No packages found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages.map(pkg => {
                const departureDate = new Date(pkg.departureFlight.departureTime);
                const returnDate = new Date(pkg.returnFlight.departureTime);
                const nights = Math.ceil((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
                const displayPrice = calculateDisplayPrice(pkg.packagePrices, pkg.basePrice);
                
                return (
                  <Link
                    key={pkg.id}
                    href={`/packages/${pkg.slug}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="h-48 relative">
                      {pkg.primaryImage ? (
                        <Image
                          src={pkg.primaryImage}
                          alt={pkg.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
                      )}
                      {pkg.featured && (
                        <span className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Destination:</span>
                          <span>{pkg.city.name}, {pkg.city.country.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Hotel:</span>
                          <span>{pkg.hotel.name}</span>
                          <div className="flex text-yellow-400 ml-2">
                            {[...Array(pkg.hotel.rating)].map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Duration:</span>
                          <span>{nights} nights</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Departure:</span>
                          <span>
                            {departureDate.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <p className="text-sm text-gray-600">From</p>
                          <p className="text-2xl font-bold text-blue-600">
                            €{displayPrice}
                          </p>
                          <p className="text-xs text-gray-500">per person</p>
                        </div>
                        <span className="text-blue-600 font-medium">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}