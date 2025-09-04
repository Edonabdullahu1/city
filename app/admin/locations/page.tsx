'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MapPinIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Country {
  id: string;
  code: string;
  name: string;
  currency: string;
  active: boolean;
  _count?: {
    cities: number;
  };
}

interface City {
  id: string;
  name: string;
  countryId: string;
  country?: Country;
  countryName?: string;
  timezone: string;
  popular: boolean;
  active: boolean;
  about?: string | null;
  profileImage?: string | null;
  _count?: {
    airports: number;
    hotels: number;
  };
  airportCount?: number;
  hotelCount?: number;
  excursionCount?: number;
}

interface Airport {
  id: string;
  code: string;
  name: string;
  cityId: string;
  city?: City;
  cityName?: string;
  countryName?: string;
  active: boolean;
}

interface Airline {
  id: string;
  name: string;
  iataCode: string;
  active: boolean;
  _count?: {
    flights: number;
  };
}

interface Flight {
  id: string;
  flightNumber: string;
  airlineId: string;
  airline?: Airline;
  departureAirportId: string;
  arrivalAirportId: string;
  departureAirport?: Airport & { city?: City };
  arrivalAirport?: Airport & { city?: City };
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  isBlockSeat: boolean;
  _count?: {
    bookings: number;
  };
}

type TabType = 'countries' | 'cities' | 'airports' | 'airlines' | 'flights';

export default function AdminLocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State for each tab
  const [activeTab, setActiveTab] = useState<TabType>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [showAirlineModal, setShowAirlineModal] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  
  // Form data
  const [countryForm, setCountryForm] = useState({
    code: '',
    name: '',
    currency: 'EUR',
    active: true
  });
  
  const [cityForm, setCityForm] = useState({
    name: '',
    countryId: '',
    timezone: 'Europe/London',
    popular: false,
    active: true
  });
  
  const [airportForm, setAirportForm] = useState({
    code: '',
    name: '',
    cityId: '',
    active: true
  });
  
  const [airlineForm, setAirlineForm] = useState({
    name: '',
    iataCode: '',
    active: true
  });
  
  const [flightForm, setFlightForm] = useState({
    flightNumber: '',
    airlineId: '',
    departureAirportId: '',
    arrivalAirportId: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchAllData();
  }, [session, status, router]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCountries(),
      fetchCities(),
      fetchAirports(),
      fetchAirlines(),
      fetchFlights()
    ]);
    setLoading(false);
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/admin/countries');
      const data = await response.json();
      // Countries API returns array directly
      setCountries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      const data = await response.json();
      // Cities API returns array directly
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchAirports = async () => {
    try {
      const response = await fetch('/api/admin/airports');
      const data = await response.json();
      // Airports API returns { airports: [...] }
      setAirports(data.airports || []);
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };
  
  const fetchAirlines = async () => {
    try {
      const response = await fetch('/api/admin/airlines');
      const data = await response.json();
      // Airlines API returns { airlines: [...] }
      setAirlines(data.airlines || []);
    } catch (error) {
      console.error('Error fetching airlines:', error);
    }
  };
  
  const fetchFlights = async () => {
    try {
      const response = await fetch('/api/admin/flights');
      const data = await response.json();
      setFlights(data.flights || []);
    } catch (error) {
      console.error('Error fetching flights:', error);
    }
  };

  // Country CRUD
  const handleCountrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCountry 
        ? `/api/admin/countries`
        : '/api/admin/countries';
      
      const method = editingCountry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCountry ? { ...countryForm, id: editingCountry.id } : countryForm)
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error(`Country with code "${countryForm.code}" already exists`);
        }
        throw new Error(data.error || 'Failed to save country');
      }
      
      await fetchCountries();
      setShowCountryModal(false);
      resetCountryForm();
    } catch (error: any) {
      console.error('Error saving country:', error);
      alert(error.message || 'Failed to save country');
    }
  };

  const handleCountryDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all related cities and airports.')) return;
    
    try {
      const response = await fetch(`/api/admin/countries?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete country');
      await fetchCountries();
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('Failed to delete country');
    }
  };

  // City CRUD
  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCity 
        ? `/api/admin/cities`
        : '/api/admin/cities';
      
      const method = editingCity ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCity ? { ...cityForm, id: editingCity.id } : cityForm)
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error(`City "${cityForm.name}" already exists in this country`);
        }
        throw new Error(data.error || 'Failed to save city');
      }
      
      await fetchCities();
      setShowCityModal(false);
      resetCityForm();
    } catch (error: any) {
      console.error('Error saving city:', error);
      alert(error.message || 'Failed to save city');
    }
  };

  const handleCityDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all related airports and services.')) return;
    
    try {
      const response = await fetch(`/api/admin/cities?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete city');
      await fetchCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('Failed to delete city');
    }
  };

  // Airport CRUD
  const handleAirportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAirport 
        ? `/api/admin/airports`
        : '/api/admin/airports';
      
      const method = editingAirport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAirport ? { ...airportForm, id: editingAirport.id } : airportForm)
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error(`Airport with code "${airportForm.code}" already exists`);
        }
        throw new Error(data.error || 'Failed to save airport');
      }
      
      await fetchAirports();
      setShowAirportModal(false);
      resetAirportForm();
    } catch (error: any) {
      console.error('Error saving airport:', error);
      alert(error.message || 'Failed to save airport');
    }
  };

  const handleAirportDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all related flights.')) return;
    
    try {
      const response = await fetch(`/api/admin/airports?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete airport');
      await fetchAirports();
    } catch (error) {
      console.error('Error deleting airport:', error);
      alert('Failed to delete airport');
    }
  };

  // Airline CRUD
  const handleAirlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingAirline ? '/api/admin/airlines' : '/api/admin/airlines';
      const method = editingAirline ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAirline ? { ...airlineForm, id: editingAirline.id } : airlineForm)
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error(`Airline with code "${airlineForm.iataCode}" already exists`);
        }
        throw new Error(data.error || 'Failed to save airline');
      }
      
      await fetchAirlines();
      setShowAirlineModal(false);
      resetAirlineForm();
    } catch (error: any) {
      console.error('Error saving airline:', error);
      alert(error.message || 'Failed to save airline');
    }
  };

  const handleAirlineDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all related flights.')) return;
    
    try {
      const response = await fetch(`/api/admin/airlines?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete airline');
      await fetchAirlines();
    } catch (error) {
      console.error('Error deleting airline:', error);
      alert('Failed to delete airline. It may have associated flights.');
    }
  };

  // Flight CRUD
  const handleFlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingFlight ? '/api/admin/flights' : '/api/admin/flights';
      const method = editingFlight ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFlight ? { ...flightForm, id: editingFlight.id } : flightForm)
      });

      if (!response.ok) throw new Error('Failed to save flight');
      
      await fetchFlights();
      setShowFlightModal(false);
      resetFlightForm();
    } catch (error) {
      console.error('Error saving flight:', error);
      alert('Failed to save flight');
    }
  };

  const handleFlightDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all related bookings.')) return;
    
    try {
      const response = await fetch(`/api/admin/flights?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete flight');
      await fetchFlights();
    } catch (error) {
      console.error('Error deleting flight:', error);
      alert('Failed to delete flight. It may have associated bookings.');
    }
  };

  // Edit handlers
  const handleEditCountry = (country: Country) => {
    setEditingCountry(country);
    setCountryForm({
      code: country.code,
      name: country.name,
      currency: country.currency,
      active: country.active
    });
    setShowCountryModal(true);
  };

  const handleEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm({
      name: city.name,
      countryId: city.countryId,
      timezone: city.timezone,
      popular: city.popular,
      active: city.active
    });
    setShowCityModal(true);
  };

  const handleEditAirport = (airport: Airport) => {
    setEditingAirport(airport);
    setAirportForm({
      code: airport.code,
      name: airport.name,
      cityId: airport.cityId,
      active: airport.active
    });
    setShowAirportModal(true);
  };

  const handleEditAirline = (airline: Airline) => {
    setEditingAirline(airline);
    setAirlineForm({
      name: airline.name,
      iataCode: airline.iataCode,
      active: airline.active
    });
    setShowAirlineModal(true);
  };

  const handleEditFlight = (flight: Flight) => {
    setEditingFlight(flight);
    setFlightForm({
      flightNumber: flight.flightNumber,
      airlineId: flight.airlineId,
      departureAirportId: flight.departureAirportId,
      arrivalAirportId: flight.arrivalAirportId
    });
    setShowFlightModal(true);
  };

  // Reset forms
  const resetCountryForm = () => {
    setEditingCountry(null);
    setCountryForm({ code: '', name: '', currency: 'EUR', active: true });
  };

  const resetCityForm = () => {
    setEditingCity(null);
    setCityForm({ name: '', countryId: '', timezone: 'Europe/London', popular: false, active: true });
  };

  const resetAirportForm = () => {
    setEditingAirport(null);
    setAirportForm({ code: '', name: '', cityId: '', active: true });
  };
  
  const resetAirlineForm = () => {
    setEditingAirline(null);
    setAirlineForm({ name: '', iataCode: '', active: true });
  };
  
  const resetFlightForm = () => {
    setEditingFlight(null);
    setFlightForm({ 
      flightNumber: '',
      airlineId: '',
      departureAirportId: '',
      arrivalAirportId: ''
    });
  };

  // Filter data based on search
  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCities = cities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAirports = airports.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.city?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredAirlines = airlines.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.iataCode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredFlights = flights.filter(f =>
    f.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.airline?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.departureAirport?.city?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.arrivalAirport?.city?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
          <p className="mt-2 text-gray-600">Manage countries, cities, and airports for your travel services</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 rounded-t-lg">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('countries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'countries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GlobeAltIcon className="h-5 w-5 mr-2" />
              Countries ({countries.length})
            </button>
            <button
              onClick={() => setActiveTab('cities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'cities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BuildingOffice2Icon className="h-5 w-5 mr-2" />
              Cities ({cities.length})
            </button>
            <button
              onClick={() => setActiveTab('airports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'airports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Airports ({airports.length})
            </button>
            <button
              onClick={() => setActiveTab('airlines')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'airlines'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Airlines ({airlines.length})
            </button>
            <button
              onClick={() => setActiveTab('flights')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'flights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Flights ({flights.length})
            </button>
          </nav>
        </div>

        {/* Search and Actions */}
        <div className="bg-white p-4 shadow mb-6">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                if (activeTab === 'countries') {
                  resetCountryForm();
                  setShowCountryModal(true);
                } else if (activeTab === 'cities') {
                  resetCityForm();
                  setShowCityModal(true);
                } else if (activeTab === 'airports') {
                  resetAirportForm();
                  setShowAirportModal(true);
                } else if (activeTab === 'airlines') {
                  resetAirlineForm();
                  setShowAirlineModal(true);
                } else if (activeTab === 'flights') {
                  resetFlightForm();
                  setShowFlightModal(true);
                }
              }}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add {
                activeTab === 'countries' ? 'Country' : 
                activeTab === 'cities' ? 'City' : 
                activeTab === 'airports' ? 'Airport' :
                activeTab === 'airlines' ? 'Airline' : 'Flight'
              }
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <>
              {/* Countries Tab */}
              {activeTab === 'countries' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cities
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCountries.map((country) => (
                        <tr key={country.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-gray-900">{country.code}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-900">{country.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{country.currency}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{country._count?.cities || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              country.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {country.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditCountry(country)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <PencilIcon className="h-5 w-5 inline" />
                            </button>
                            <button
                              onClick={() => handleCountryDelete(country.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cities Tab */}
              {activeTab === 'cities' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timezone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airports
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hotels
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Popular
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCities.map((city) => (
                        <tr key={city.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{city.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{city.countryName || city.country?.name || ''}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{city.timezone}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{city.airportCount || city._count?.airports || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{city.hotelCount || city._count?.hotels || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {city.popular && (
                              <span className="text-yellow-500">⭐</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              city.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {city.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/admin/locations/cities/${city.id}`)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              title="Edit city details, profile image, and description"
                            >
                              <PencilIcon className="h-5 w-5 inline" />
                            </button>
                            <button
                              onClick={() => handleCityDelete(city.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Airports Tab */}
              {activeTab === 'airports' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IATA Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airport Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAirports.map((airport) => (
                        <tr key={airport.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-gray-900">{airport.code}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-900">{airport.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{airport.cityName || airport.city?.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-600">{airport.countryName || airport.city?.country?.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              airport.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {airport.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditAirport(airport)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <PencilIcon className="h-5 w-5 inline" />
                            </button>
                            <button
                              onClick={() => handleAirportDelete(airport.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Airlines Tab */}
              {activeTab === 'airlines' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IATA Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airline Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flights
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAirlines.map((airline) => (
                        <tr key={airline.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-gray-900">{airline.iataCode}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-900">{airline.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-700">{airline._count?.flights || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              airline.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {airline.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditAirline(airline)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAirlineDelete(airline.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Flights Tab */}
              {activeTab === 'flights' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flight Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airline
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFlights.map((flight) => (
                        <tr key={flight.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-gray-900">{flight.flightNumber}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-900">{flight.airline?.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900">
                                {flight.departureAirport?.code} → {flight.arrivalAirport?.code}
                              </div>
                              <div className="text-gray-500">
                                {flight.departureAirport?.city?.name} → {flight.arrivalAirport?.city?.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active Route
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEditFlight(flight)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleFlightDelete(flight.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Country Modal */}
        {showCountryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingCountry ? 'Edit Country' : 'Add New Country'}
              </h2>
              
              <form onSubmit={handleCountrySubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country Code (ISO)
                    </label>
                    <input
                      type="text"
                      required
                      value={countryForm.code}
                      onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="US"
                      maxLength={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country Name
                    </label>
                    <input
                      type="text"
                      required
                      value={countryForm.name}
                      onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="United States"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={countryForm.currency}
                      onChange={(e) => setCountryForm({ ...countryForm, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="ALL">ALL - Albanian Lek</option>
                      <option value="MKD">MKD - Macedonian Denar</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={countryForm.active}
                        onChange={(e) => setCountryForm({ ...countryForm, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCountryModal(false);
                      resetCountryForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingCountry ? 'Update' : 'Add'} Country
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* City Modal */}
        {showCityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingCity ? 'Edit City' : 'Add New City'}
              </h2>
              
              <form onSubmit={handleCitySubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cityForm.name}
                      onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Barcelona"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      required
                      value={cityForm.countryId}
                      onChange={(e) => setCityForm({ ...cityForm, countryId: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={cityForm.timezone}
                      onChange={(e) => setCityForm({ ...cityForm, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Europe/Rome">Europe/Rome</option>
                      <option value="Europe/Madrid">Europe/Madrid</option>
                      <option value="Europe/Tirane">Europe/Tirane</option>
                      <option value="Europe/Skopje">Europe/Skopje</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cityForm.popular}
                        onChange={(e) => setCityForm({ ...cityForm, popular: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Popular Destination</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cityForm.active}
                        onChange={(e) => setCityForm({ ...cityForm, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCityModal(false);
                      resetCityForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingCity ? 'Update' : 'Add'} City
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Airport Modal */}
        {showAirportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingAirport ? 'Edit Airport' : 'Add New Airport'}
              </h2>
              
              <form onSubmit={handleAirportSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IATA Code
                    </label>
                    <input
                      type="text"
                      required
                      value={airportForm.code}
                      onChange={(e) => setAirportForm({ ...airportForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="BCN"
                      maxLength={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Airport Name
                    </label>
                    <input
                      type="text"
                      required
                      value={airportForm.name}
                      onChange={(e) => setAirportForm({ ...airportForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Barcelona El Prat Airport"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <select
                      required
                      value={airportForm.cityId}
                      onChange={(e) => setAirportForm({ ...airportForm, cityId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a city</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.id}>
                          {city.name}, {city.country?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={airportForm.active}
                        onChange={(e) => setAirportForm({ ...airportForm, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAirportModal(false);
                      resetAirportForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAirport ? 'Update' : 'Add'} Airport
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Airline Modal */}
        {showAirlineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingAirline ? 'Edit Airline' : 'Add New Airline'}
              </h2>
              
              <form onSubmit={handleAirlineSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IATA Code
                    </label>
                    <input
                      type="text"
                      required
                      value={airlineForm.iataCode}
                      onChange={(e) => setAirlineForm({ ...airlineForm, iataCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="BA"
                      maxLength={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Airline Name
                    </label>
                    <input
                      type="text"
                      required
                      value={airlineForm.name}
                      onChange={(e) => setAirlineForm({ ...airlineForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="British Airways"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={airlineForm.active}
                        onChange={(e) => setAirlineForm({ ...airlineForm, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAirlineModal(false);
                      resetAirlineForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAirline ? 'Update' : 'Add'} Airline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Flight Modal */}
        {showFlightModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingFlight ? 'Edit Flight Route' : 'Add New Flight Route'}
              </h2>
              
              <form onSubmit={handleFlightSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flight Number
                    </label>
                    <input
                      type="text"
                      required
                      value={flightForm.flightNumber}
                      onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="BA123"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Airline
                    </label>
                    <select
                      required
                      value={flightForm.airlineId}
                      onChange={(e) => setFlightForm({ ...flightForm, airlineId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an airline</option>
                      {airlines.filter(a => a.active).map(airline => (
                        <option key={airline.id} value={airline.id}>
                          {airline.name} ({airline.iataCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departure Airport
                    </label>
                    <select
                      required
                      value={flightForm.departureAirportId}
                      onChange={(e) => setFlightForm({ ...flightForm, departureAirportId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select departure airport</option>
                      {airports.filter(a => a.active).map(airport => (
                        <option key={airport.id} value={airport.id}>
                          {airport.code} - {airport.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arrival Airport
                    </label>
                    <select
                      required
                      value={flightForm.arrivalAirportId}
                      onChange={(e) => setFlightForm({ ...flightForm, arrivalAirportId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select arrival airport</option>
                      {airports.filter(a => a.active).map(airport => (
                        <option key={airport.id} value={airport.id}>
                          {airport.code} - {airport.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFlightModal(false);
                      resetFlightForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingFlight ? 'Update' : 'Add'} Flight
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}