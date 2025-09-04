'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { 
  BuildingOfficeIcon, 
  DocumentTextIcon, 
  PhotoIcon, 
  CurrencyEuroIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface Hotel {
  id: string;
  hotelId: number;
  name: string;
  location: string;
  address: string;
  starRating: number;
  description: string;
  facilities: string[];
  images: any[];
  primaryImage: string | null;
  hotelPrices: HotelPrice[];
}

interface HotelPrice {
  id: string;
  board: string;
  roomType: string;
  fromDate: string;
  tillDate: string;
  single: number;
  double: number;
  extraBed: number;
  payingKidsAge: string;
  paymentKids: number;
}

interface City {
  id: string;
  name: string;
  countryName: string;
  active: boolean;
}

export default function HotelEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const hotelId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<'details' | 'description' | 'gallery' | 'pricing'>('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [description, setDescription] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [importingPrices, setImportingPrices] = useState(false);
  const [reorderingImages, setReorderingImages] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchCities();
      if (hotelId !== 'new') {
        fetchHotel();
      } else {
        generateHotelId();
        setLoading(false);
      }
    }
  }, [status, session, router, hotelId]);

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      if (response.ok) {
        const data = await response.json();
        // Handle both direct array and wrapped object responses
        const citiesArray = Array.isArray(data) ? data : (data.cities || []);
        setCities(citiesArray.filter((city: City) => city.active));
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const generateHotelId = async () => {
    try {
      const response = await fetch('/api/admin/hotels/generate-id');
      const data = await response.json();
      setHotel({
        id: '',
        hotelId: data.hotelId,
        name: '',
        location: '',
        address: '',
        starRating: 3,
        description: '',
        facilities: [],
        images: [],
        primaryImage: null,
        hotelPrices: []
      });
    } catch (error) {
      console.error('Error generating hotel ID:', error);
    }
  };

  const fetchHotel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/hotels/${hotelId}`);
      if (!response.ok) throw new Error('Failed to fetch hotel');
      const data = await response.json();
      setHotel(data);
      setDescription(data.description || '');
    } catch (error) {
      console.error('Error fetching hotel:', error);
      router.push('/admin/hotels');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!hotel) return;
    
    try {
      setSaving(true);
      const endpoint = hotelId === 'new' ? '/api/admin/hotels' : `/api/admin/hotels/${hotelId}`;
      const method = hotelId === 'new' ? 'POST' : 'PUT';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: Number(hotel.hotelId),
          name: hotel.name,
          location: hotel.location,
          address: hotel.address,
          starRating: Number(hotel.starRating),
          facilities: hotel.facilities || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save hotel error:', errorData);
        throw new Error(errorData.error || 'Failed to save hotel');
      }
      
      if (hotelId === 'new') {
        const data = await response.json();
        router.push(`/admin/hotels/${data.id}`);
      }
    } catch (error) {
      console.error('Error saving hotel:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!hotel) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/hotels/${hotelId}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      if (!response.ok) throw new Error('Failed to save description');
    } catch (error) {
      console.error('Error saving description:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      if (file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        formData.append('images', file);
      }
    });

    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload images');
      const data = await response.json();
      
      // Reload hotel to get updated images
      await fetchHotel();
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });

      if (!response.ok) throw new Error('Failed to delete image');
      
      // Reload hotel to get updated images
      await fetchHotel();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleSetPrimaryImage = async (imageUrl: string) => {
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/primary-image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryImage: imageUrl })
      });

      if (!response.ok) throw new Error('Failed to set primary image');
      
      setHotel(prev => prev ? { ...prev, primaryImage: imageUrl } : null);
    } catch (error) {
      console.error('Error setting primary image:', error);
    }
  };

  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    if (!hotel || !hotel.images) return;
    
    const images = Array.isArray(hotel.images) ? [...hotel.images] : [];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= images.length) return;
    
    // Swap images
    [images[index], images[newIndex]] = [images[newIndex], images[index]];
    
    setReorderingImages(true);
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/images/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      if (!response.ok) throw new Error('Failed to reorder images');
      
      setHotel(prev => prev ? { ...prev, images } : null);
    } catch (error) {
      console.error('Error reordering images:', error);
    } finally {
      setReorderingImages(false);
    }
  };

  const handlePriceImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingPrices(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/import-prices`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to import prices');
      const data = await response.json();
      
      setHotel(prev => prev ? { ...prev, hotelPrices: data.prices } : null);
      alert(`Successfully imported ${data.count} price entries`);
    } catch (error) {
      console.error('Error importing prices:', error);
      alert('Failed to import prices. Please check the file format.');
    } finally {
      setImportingPrices(false);
    }
  };

  const tabs = [
    { key: 'details', label: 'Hotel Details', icon: BuildingOfficeIcon },
    { key: 'description', label: 'Description', icon: DocumentTextIcon },
    { key: 'gallery', label: 'Gallery', icon: PhotoIcon },
    { key: 'pricing', label: 'Pricing', icon: CurrencyEuroIcon }
  ];

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!hotel) return null;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {hotelId === 'new' ? 'New Hotel' : `Edit Hotel #${hotel.hotelId}`}
              </h1>
              <p className="text-gray-600 mt-2">{hotel.name || 'Configure hotel details'}</p>
            </div>
            <button
              onClick={() => router.push('/admin/hotels')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Hotels
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Hotel Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 font-semibold">Hotel ID: #{hotel.hotelId}</p>
                  <p className="text-blue-600 text-sm mt-1">This unique 5-digit ID will be used across all hotel operations</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                    <input
                      type="text"
                      value={hotel.name}
                      onChange={(e) => setHotel({ ...hotel, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter hotel name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <select
                      value={hotel.location}
                      onChange={(e) => setHotel({ ...hotel, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a city</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.name}>
                          {city.name}, {city.countryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={hotel.address}
                      onChange={(e) => setHotel({ ...hotel, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full hotel address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating</label>
                    <select
                      value={hotel.starRating}
                      onChange={(e) => setHotel({ ...hotel, starRating: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5].map(rating => (
                        <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>


                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving || !hotel.name || !hotel.location}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Description Tab */}
            {activeTab === 'description' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a detailed description of the hotel, its amenities, location benefits, and unique features..."
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Tip: You can use simple formatting like paragraphs. HTML tags can be used for rich formatting if needed.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveDescription}
                    disabled={saving || hotelId === 'new'}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Description'}
                  </button>
                </div>
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Images</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImages || hotelId === 'new'}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex flex-col items-center cursor-pointer ${
                        uploadingImages || hotelId === 'new' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-700">
                        {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {hotelId === 'new' ? 'Save hotel details first' : 'JPG, PNG, WebP up to 10MB'}
                      </span>
                    </label>
                  </div>
                </div>

                {hotel.images && hotel.images.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Image Gallery</h3>
                      <p className="text-xs text-gray-500">Drag images to reorder. The first image will be used as thumbnail if no primary image is set.</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {(Array.isArray(hotel.images) ? hotel.images : []).map((image, index) => {
                        const imageUrl = typeof image === 'string' ? image : image.url;
                        const isPrimary = hotel.primaryImage === imageUrl;
                        return (
                          <div key={index} className={`relative group border-2 rounded-lg overflow-hidden ${
                            isPrimary ? 'border-blue-500' : 'border-transparent'
                          }`}>
                            {isPrimary && (
                              <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-xs py-1 px-2 text-center z-10">
                                Primary Image
                              </div>
                            )}
                            <img
                              src={imageUrl}
                              alt={`Hotel image ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex gap-1">
                                {index > 0 && (
                                  <button
                                    onClick={() => handleMoveImage(index, 'up')}
                                    disabled={reorderingImages}
                                    className="p-1 bg-white rounded hover:bg-gray-100"
                                    title="Move up"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
                                    </svg>
                                  </button>
                                )}
                                {index < hotel.images.length - 1 && (
                                  <button
                                    onClick={() => handleMoveImage(index, 'down')}
                                    disabled={reorderingImages}
                                    className="p-1 bg-white rounded hover:bg-gray-100"
                                    title="Move down"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                  </button>
                                )}
                                {!isPrimary && (
                                  <button
                                    onClick={() => handleSetPrimaryImage(imageUrl)}
                                    className="p-1 bg-white rounded hover:bg-gray-100"
                                    title="Set as primary"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteImage(imageUrl)}
                                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Import Prices from Excel/CSV</h3>
                      <p className="text-sm text-gray-600">
                        File format: Board | Room Type | From Date | Till Date | Single | Double | Extra Bed | Paying Kids Age | Payment Kids
                      </p>
                    </div>
                    <a
                      href="/templates/hotel-prices-template.csv"
                      download="hotel-prices-template.csv"
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      Download Template
                    </a>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      id="price-upload"
                      accept=".xlsx,.xls,.csv"
                      onChange={handlePriceImport}
                      className="hidden"
                      disabled={importingPrices || hotelId === 'new'}
                    />
                    <label
                      htmlFor="price-upload"
                      className={`px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 ${
                        importingPrices || hotelId === 'new' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {importingPrices ? 'Importing...' : 'Import Price File'}
                    </label>
                    {hotelId === 'new' && (
                      <span className="text-sm text-gray-500">Save hotel details first</span>
                    )}
                  </div>
                </div>

                {hotel.hotelPrices && hotel.hotelPrices.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Board</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Single</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Double</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extra Bed</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kids</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {hotel.hotelPrices.map((price) => (
                          <tr key={price.id}>
                            <td className="px-4 py-3 text-sm">{price.board}</td>
                            <td className="px-4 py-3 text-sm">{price.roomType}</td>
                            <td className="px-4 py-3 text-sm">
                              {new Date(price.fromDate).toLocaleDateString()} - {new Date(price.tillDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm">€{price.single}</td>
                            <td className="px-4 py-3 text-sm">€{price.double}</td>
                            <td className="px-4 py-3 text-sm">€{price.extraBed}</td>
                            <td className="px-4 py-3 text-sm">
                              {price.payingKidsAge} (€{price.paymentKids})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(!hotel.hotelPrices || hotel.hotelPrices.length === 0) && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <CurrencyEuroIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No prices imported yet</p>
                    <p className="text-sm text-gray-500 mt-1">Import an Excel or CSV file to add pricing</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}