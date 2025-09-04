'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ImageUpload from '@/components/ImageUpload';
import dynamic from 'next/dynamic';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
});

interface Country {
  id: string;
  name: string;
  code: string;
}

interface City {
  id: string;
  name: string;
  countryId: string;
  countryName?: string;
  timezone: string;
  popular: boolean;
  active: boolean;
  about?: string | null;
  profileImage?: string | null;
}

export default function EditCityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const cityId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cityData, setCityData] = useState<City | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    countryId: '',
    timezone: 'Europe/London',
    popular: false,
    active: true,
    about: '',
    profileImage: null as string | null,
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, status, router, cityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch countries
      const countriesRes = await fetch('/api/admin/countries');
      const countriesData = await countriesRes.json();
      setCountries(Array.isArray(countriesData) ? countriesData : []);

      // Fetch city data
      const citiesRes = await fetch('/api/admin/cities');
      const citiesData = await citiesRes.json();
      
      const city = citiesData.find((c: City) => c.id === cityId);
      if (city) {
        setCityData(city);
        setFormData({
          name: city.name,
          countryId: city.countryId,
          timezone: city.timezone,
          popular: city.popular,
          active: city.active,
          about: city.about || '',
          profileImage: city.profileImage || null,
        });
      } else {
        alert('City not found');
        router.push('/admin/locations');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load city data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/admin/cities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cityId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update city');
      }

      alert('City updated successfully!');
      router.push('/admin/locations?tab=cities');
    } catch (error: any) {
      console.error('Error updating city:', error);
      alert(error.message || 'Failed to update city');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/locations?tab=cities')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Locations
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Edit City: {cityData?.name}</h1>
          <p className="mt-2 text-gray-600">Update city information, profile image, and description</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Barcelona"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  required
                  value={formData.countryId}
                  onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a country</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Europe/Rome">Europe/Rome</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="Europe/Athens">Europe/Athens</option>
                  <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                  <option value="Europe/Vienna">Europe/Vienna</option>
                  <option value="Europe/Prague">Europe/Prague</option>
                  <option value="Europe/Budapest">Europe/Budapest</option>
                  <option value="Europe/Warsaw">Europe/Warsaw</option>
                  <option value="Europe/Tirane">Europe/Tirane</option>
                  <option value="Europe/Skopje">Europe/Skopje</option>
                  <option value="America/New_York">America/New York</option>
                  <option value="America/Los_Angeles">America/Los Angeles</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Popular Destination</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Image</h2>
            <p className="text-sm text-gray-600 mb-4">
              This image will be displayed throughout the website when showing this destination
            </p>
            <ImageUpload
              value={formData.profileImage}
              onChange={(value) => setFormData({ ...formData, profileImage: value })}
              label=""
            />
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About This City</h2>
            <p className="text-sm text-gray-600 mb-4">
              This description will be displayed on the destination display page (DDP). 
              You can format the text with headings, links, bold text, and more.
            </p>
            <RichTextEditor
              content={formData.about}
              onChange={(content) => setFormData({ ...formData, about: content })}
              placeholder="Enter a detailed description about this city..."
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/locations?tab=cities')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}