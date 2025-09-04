'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, MapPin, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface Airport {
  id: string;
  code: string;
  name: string;
  cityId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HotelData {
  id: string;
  name: string;
  description: string;
  rating: number;
  address: string;
  amenities: string[];
  primaryImage: string | null;
  images: string[];
  city: {
    name: string;
    country: {
      name: string;
    };
  };
  packages: Array<{
    id: string;
    name: string;
    slug: string;
    nights: number;
    basePrice: number;
    departureFlight: {
      departureTime: string;
      arrivalTime: string;
      departureAirport: Airport;
    };
    returnFlight: {
      departureTime: string;
    };
    packagePrices: Array<{
      totalPrice: number;
    }>;
  }>;
  hotelPrices: Array<{
    dateFrom: string;
    dateTo: string;
    single: number;
    double: number;
    extraBed: number;
    childPrice: number;
  }>;
}

export default function HotelDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'packages' | 'gallery'>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchHotelDetails();
  }, [resolvedParams.slug]);

  const fetchHotelDetails = async () => {
    try {
      const response = await fetch(`/api/public/hotels/${resolvedParams.slug}`);
      if (response.ok) {
        const data = await response.json();
        setHotelData(data);
      }
    } catch (error) {
      console.error('Error fetching hotel details:', error);
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
      </>
    );
  }

  if (!hotelData) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Hotel not found</p>
        </div>
      </>
    );
  }

  const allImages = hotelData.images || [];
  const displayImages = allImages.length > 0 ? allImages : ['/placeholder-hotel.jpg'];

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-200">
        {hotelData.primaryImage || displayImages[0] ? (
          <Image
            src={hotelData.primaryImage || displayImages[0]}
            alt={hotelData.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">{hotelData.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < hotelData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {hotelData.city.name}, {hotelData.city.country.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              Packages ({hotelData.packages.length})
            </button>
            <button
              onClick={() => setSelectedTab('gallery')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                selectedTab === 'gallery'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Gallery
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold mb-4">About this hotel</h2>
              <p className="text-gray-700 mb-6">{hotelData.description}</p>

              <h3 className="text-xl font-bold mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hotelData.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-green-600">✓</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Location</h3>
                <p className="text-gray-700">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  {hotelData.address}
                </p>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < hotelData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span>{hotelData.city.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Packages:</span>
                    <span>{hotelData.packages.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'packages' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Available Packages</h2>
            {hotelData.packages.length === 0 ? (
              <p className="text-gray-600">No packages available for this hotel at the moment.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotelData.packages.map((pkg) => {
                  const minPrice = pkg.packagePrices.length > 0 
                    ? Math.min(...pkg.packagePrices.map(p => p.totalPrice))
                    : pkg.basePrice;
                  
                  const departureAirport = pkg.departureFlight?.departureAirport;
                  const airportName = departureAirport?.name || 'Unknown Airport';

                  return (
                    <div key={pkg.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {pkg.nights} nights
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            From {airportName}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            Per person
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-gray-500 text-sm">From</span>
                            <p className="text-2xl font-bold text-blue-600">
                              €{minPrice.toLocaleString()}
                            </p>
                          </div>
                          <Link
                            href={`/packages/${pkg.slug}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'gallery' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Gallery</h2>
            {displayImages.length === 0 ? (
              <p className="text-gray-600">No images available for this hotel.</p>
            ) : (
              <div>
                {/* Main Image Display */}
                <div className="relative aspect-video mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={displayImages[selectedImageIndex]}
                    alt={`${hotelData.name} - Image ${selectedImageIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Grid */}
                {displayImages.length > 1 && (
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                    {displayImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative aspect-square rounded overflow-hidden ${
                          selectedImageIndex === index ? 'ring-2 ring-blue-600' : ''
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}