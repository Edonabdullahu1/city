'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, MapPin, Users, Calendar, ChevronRight } from 'lucide-react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { calculateDisplayPrice } from '@/lib/price-utils';

interface Package {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  primaryImage: string | null;
  images: any;
  featured: boolean;
  nights: number;
  hotel: {
    name: string;
    rating: number;
    address: string;
  };
  departureFlight: {
    departureTime: string;
    arrivalTime: string;
  };
  returnFlight: {
    departureTime: string;
  };
  packagePrices: Array<{
    totalPrice: number;
  }>;
}

interface Hotel {
  id: string;
  name: string;
  slug: string;
  rating: number;
  address: string;
  primaryImage: string | null;
  images: any;
  _count: {
    packages: number;
  };
}

interface Excursion {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  capacity: number;
  meetingPoint: string;
  includes: string[];
  images: string[];
}

interface CityDetails {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  profileImage: string | null;
  popular: boolean;
  country: {
    id: string;
    name: string;
    code: string;
  };
  packages: Package[];
  hotelsInCity: Hotel[];
  excursions: Excursion[];
  totalPackages: number;
  totalHotels: number;
  totalExcursions: number;
}

export default function DestinationDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [cityData, setCityData] = useState<CityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'packages' | 'hotels' | 'excursions'>('overview');

  useEffect(() => {
    fetchCityDetails();
  }, [resolvedParams.slug]);

  const fetchCityDetails = async () => {
    try {
      const response = await fetch(`/api/public/destinations/${resolvedParams.slug}`);
      if (response.ok) {
        const data = await response.json();
        setCityData(data);
      }
    } catch (error) {
      console.error('Error fetching city details:', error);
    } finally {
      setLoading(false);
    }
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

  if (!cityData) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Destination not found</p>
        </div>
        <Footer />
      </>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${mins} minutes`;
    }
  };

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-96">
        {cityData.profileImage ? (
          <>
            <img
              src={cityData.profileImage}
              alt={cityData.name}
              className="w-full h-full object-cover"
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
              <Link href="/destinations" className="hover:underline">Destinations</Link>
              <ChevronRight className="w-4 h-4" />
              <span>{cityData.country.name}</span>
              <ChevronRight className="w-4 h-4" />
              <span>{cityData.name}</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">{cityData.name}</h1>
            <p className="text-xl">{cityData.country.name}</p>
            {cityData.popular && (
              <span className="inline-block mt-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                Popular Destination
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
        {/* About Section */}
        {cityData.about && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">About {cityData.name}</h2>
            <div 
              className="prose prose-lg max-w-none text-gray-700 [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:my-4"
              dangerouslySetInnerHTML={{ __html: cityData.about }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{cityData.totalPackages}</div>
            <div className="text-gray-600">Available Packages</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{cityData.totalHotels}</div>
            <div className="text-gray-600">Partner Hotels</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{cityData.totalExcursions}</div>
            <div className="text-gray-600">Excursions & Tours</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('packages')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'packages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Packages ({cityData.packages.length})
            </button>
            <button
              onClick={() => setSelectedTab('hotels')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'hotels'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Hotels ({cityData.hotelsInCity.length})
            </button>
            <button
              onClick={() => setSelectedTab('excursions')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'excursions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Excursions ({cityData.excursions.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-12">
            {/* Featured Packages */}
            {cityData.packages.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Featured Packages</h2>
                  {cityData.totalPackages > 3 && (
                    <Link href="/tours" className="text-blue-600 hover:underline">
                      View all {cityData.totalPackages} packages →
                    </Link>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {cityData.packages.slice(0, 3).map(pkg => {
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
                          <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>
                          <div className="flex items-center justify-between">
                          <div>
                          <span className="text-gray-500 text-sm">From</span>
                          <p className="text-2xl font-bold text-blue-600">€{displayPrice}</p>
                          <p className="text-xs text-gray-500">per person</p>
                          </div>
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                              View Details
                              </button>
                            </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Hotels */}
            {cityData.hotelsInCity.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Top Hotels</h2>
                  {cityData.totalHotels > 3 && (
                    <Link href="/hotels" className="text-blue-600 hover:underline">
                      View all {cityData.totalHotels} hotels →
                    </Link>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {cityData.hotelsInCity.slice(0, 3).map(hotel => (
                    <Link
                      key={hotel.id}
                      href={`/hotels/${hotel.slug}`}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                    >
                      <div className="h-48 relative">
                        {hotel.primaryImage ? (
                          <Image
                            src={hotel.primaryImage}
                            alt={hotel.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600" />
                        )}
                        <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                          <div className="flex text-yellow-400">
                            {[...Array(hotel.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">{hotel.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{hotel.address}</p>
                        <div className="flex items-center justify-between">
                          {hotel._count.packages > 0 ? (
                            <span className="text-sm text-gray-500">
                              {hotel._count.packages} {hotel._count.packages === 1 ? 'Package' : 'Packages'}
                            </span>
                          ) : (
                            <span></span>
                          )}
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Excursions */}
            {cityData.excursions.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Popular Excursions</h2>
                  {cityData.totalExcursions > 3 && (
                    <span className="text-gray-600">
                      {cityData.totalExcursions - 3} more excursions available
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {cityData.excursions.slice(0, 3).map(excursion => (
                    <div
                      key={excursion.id}
                      className="bg-white rounded-lg shadow overflow-hidden"
                    >
                      <div className="h-48 bg-gradient-to-br from-green-400 to-green-600"></div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{excursion.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline">
                            <p className="text-2xl font-bold text-blue-600">€{excursion.price}</p>
                            <span className="text-sm text-gray-500 ml-2">Per Person</span>
                          </div>
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'packages' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cityData.packages.map(pkg => {
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
                    <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">Hotel: {pkg.hotel.name}</p>
                    <div className="flex text-yellow-400 mb-4">
                      {[...Array(pkg.hotel.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-500 text-sm">From</span>
                        <p className="text-2xl font-bold text-blue-600">€{displayPrice}</p>
                        <p className="text-xs text-gray-500">per person</p>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {selectedTab === 'hotels' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cityData.hotelsInCity.map(hotel => (
              <Link
                key={hotel.id}
                href={`/hotels/${hotel.slug}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="h-48 relative">
                  {hotel.primaryImage ? (
                    <Image
                      src={hotel.primaryImage}
                      alt={hotel.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600" />
                  )}
                  <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
                    <div className="flex text-yellow-400">
                      {[...Array(hotel.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{hotel.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{hotel.address}</p>
                  <div className="flex items-center justify-between">
                    {hotel._count.packages > 0 ? (
                      <span className="text-sm text-gray-500">
                        {hotel._count.packages} {hotel._count.packages === 1 ? 'Package' : 'Packages'}
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {selectedTab === 'excursions' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cityData.excursions.map(excursion => (
              <div
                key={excursion.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-green-400 to-green-600"></div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{excursion.title}</h3>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline">
                        <p className="text-2xl font-bold text-blue-600">€{excursion.price}</p>
                        <span className="text-sm text-gray-500 ml-2">Per Person</span>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>

          {/* Right Sidebar - Fixed 300px width */}
          <div className="w-full lg:w-[300px] flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              {/* Featured Package */}
              {cityData.packages.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Featured Tour Package
                    </h3>
                  </div>
                  {(() => {
                    const featuredPkg = cityData.packages.find(p => p.featured) || cityData.packages[0];
                    const displayPrice = calculateDisplayPrice(featuredPkg.packagePrices, featuredPkg.basePrice);
                    
                    return (
                      <Link href={`/packages/${featuredPkg.slug}`}>
                        <div className="relative h-48">
                          {featuredPkg.primaryImage ? (
                            <img
                              src={featuredPkg.primaryImage}
                              alt={featuredPkg.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
                          )}
                          {featuredPkg.featured && (
                            <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-4 line-clamp-2">
                            {featuredPkg.name}
                          </h4>
                          <div className="border-t pt-3 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-500">From</span>
                              <p className="text-2xl font-bold text-blue-600">€{displayPrice}</p>
                              <p className="text-xs text-gray-500">per person</p>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              View Details
                            </button>
                          </div>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              )}

              {/* Featured Excursion */}
              {cityData.excursions.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Popular Excursion
                    </h3>
                  </div>
                  {(() => {
                    const excursion = cityData.excursions[0];
                    return (
                      <div>
                        <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-20 h-20 text-white opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-4">
                            {excursion.title}
                          </h4>
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline">
                                <p className="text-2xl font-bold text-green-600">€{excursion.price}</p>
                                <span className="text-sm text-gray-500 ml-2">Per Person</span>
                              </div>
                              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Book Now
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Quick Contact */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Our travel experts are here to help you plan your perfect trip to {cityData.name}.
                </p>
                <div className="space-y-3">
                  <a href="tel:+1234567890" className="flex items-center text-sm text-gray-700 hover:text-blue-600">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    +1 (234) 567-890
                  </a>
                  <a href="mailto:info@travel.com" className="flex items-center text-sm text-gray-700 hover:text-blue-600">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    info@travel.com
                  </a>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                    Request Custom Quote
                  </button>
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