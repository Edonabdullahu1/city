'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, Phone, Mail, Calendar, ChevronLeft, ChevronRight, Users, Check, Star, MapPin } from 'lucide-react';

// Country codes for phone numbers
const COUNTRY_CODES = [
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
  { code: '+355', country: 'Albania', flag: '🇦🇱' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+376', country: 'Andorra', flag: '🇦🇩' },
  { code: '+244', country: 'Angola', flag: '🇦🇴' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+374', country: 'Armenia', flag: '🇦🇲' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+994', country: 'Azerbaijan', flag: '🇦🇿' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+375', country: 'Belarus', flag: '🇧🇾' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+501', country: 'Belize', flag: '🇧🇿' },
  { code: '+229', country: 'Benin', flag: '🇧🇯' },
  { code: '+975', country: 'Bhutan', flag: '🇧🇹' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+387', country: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+673', country: 'Brunei', flag: '🇧🇳' },
  { code: '+359', country: 'Bulgaria', flag: '🇧🇬' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+257', country: 'Burundi', flag: '🇧🇮' },
  { code: '+855', country: 'Cambodia', flag: '🇰🇭' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+1', country: 'Canada', flag: '🇨🇦' },
  { code: '+238', country: 'Cape Verde', flag: '🇨🇻' },
  { code: '+236', country: 'Central African Republic', flag: '🇨🇫' },
  { code: '+235', country: 'Chad', flag: '🇹🇩' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+269', country: 'Comoros', flag: '🇰🇲' },
  { code: '+242', country: 'Congo', flag: '🇨🇬' },
  { code: '+243', country: 'Congo (DRC)', flag: '🇨🇩' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: '+385', country: 'Croatia', flag: '🇭🇷' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+357', country: 'Cyprus', flag: '🇨🇾' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: '+291', country: 'Eritrea', flag: '🇪🇷' },
  { code: '+372', country: 'Estonia', flag: '🇪🇪' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+241', country: 'Gabon', flag: '🇬🇦' },
  { code: '+220', country: 'Gambia', flag: '🇬🇲' },
  { code: '+995', country: 'Georgia', flag: '🇬🇪' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+224', country: 'Guinea', flag: '🇬🇳' },
  { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+592', country: 'Guyana', flag: '🇬🇾' },
  { code: '+509', country: 'Haiti', flag: '🇭🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+354', country: 'Iceland', flag: '🇮🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+1876', country: 'Jamaica', flag: '🇯🇲' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+77', country: 'Kazakhstan', flag: '🇰🇿' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: '+856', country: 'Laos', flag: '🇱🇦' },
  { code: '+371', country: 'Latvia', flag: '🇱🇻' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
  { code: '+231', country: 'Liberia', flag: '🇱🇷' },
  { code: '+218', country: 'Libya', flag: '🇱🇾' },
  { code: '+423', country: 'Liechtenstein', flag: '🇱🇮' },
  { code: '+370', country: 'Lithuania', flag: '🇱🇹' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
  { code: '+853', country: 'Macau', flag: '🇲🇴' },
  { code: '+389', country: 'Macedonia', flag: '🇲🇰' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  { code: '+265', country: 'Malawi', flag: '🇲🇼' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+960', country: 'Maldives', flag: '🇲🇻' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+356', country: 'Malta', flag: '🇲🇹' },
  { code: '+692', country: 'Marshall Islands', flag: '🇲🇭' },
  { code: '+222', country: 'Mauritania', flag: '🇲🇷' },
  { code: '+230', country: 'Mauritius', flag: '🇲🇺' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+691', country: 'Micronesia', flag: '🇫🇲' },
  { code: '+373', country: 'Moldova', flag: '🇲🇩' },
  { code: '+377', country: 'Monaco', flag: '🇲🇨' },
  { code: '+976', country: 'Mongolia', flag: '🇲🇳' },
  { code: '+382', country: 'Montenegro', flag: '🇲🇪' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
  { code: '+264', country: 'Namibia', flag: '🇳🇦' },
  { code: '+674', country: 'Nauru', flag: '🇳🇷' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+850', country: 'North Korea', flag: '🇰🇵' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+680', country: 'Palau', flag: '🇵🇼' },
  { code: '+507', country: 'Panama', flag: '🇵🇦' },
  { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+383', country: 'Kosovo', flag: '🇽🇰' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+381', country: 'Serbia', flag: '🇷🇸' },
  { code: '+248', country: 'Seychelles', flag: '🇸🇨' },
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+421', country: 'Slovakia', flag: '🇸🇰' },
  { code: '+386', country: 'Slovenia', flag: '🇸🇮' },
  { code: '+677', country: 'Solomon Islands', flag: '🇸🇧' },
  { code: '+252', country: 'Somalia', flag: '🇸🇴' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+211', country: 'South Sudan', flag: '🇸🇸' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
  { code: '+597', country: 'Suriname', flag: '🇸🇷' },
  { code: '+268', country: 'Swaziland', flag: '🇸🇿' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+963', country: 'Syria', flag: '🇸🇾' },
  { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
  { code: '+992', country: 'Tajikistan', flag: '🇹🇯' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+676', country: 'Tonga', flag: '🇹🇴' },
  { code: '+1868', country: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+993', country: 'Turkmenistan', flag: '🇹🇲' },
  { code: '+688', country: 'Tuvalu', flag: '🇹🇻' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+998', country: 'Uzbekistan', flag: '🇺🇿' },
  { code: '+678', country: 'Vanuatu', flag: '🇻🇺' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+967', country: 'Yemen', flag: '🇾🇪' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
];

interface PassengerDetails {
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
}

interface ContactDetails {
  phone: string;
  countryCode: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  isExistingUser: boolean;
}

interface BookingData {
  packageId: string;
  hotelId: string;
  adults: number;
  children: number;
  price: string;
}

const STEPS = [
  { id: 1, name: 'Passenger Details', icon: Users },
  { id: 2, name: 'Contact Information', icon: Phone },
  { id: 3, name: 'Summary', icon: Check }
];

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState<any>(null);
  const [hotelData, setHotelData] = useState<any>(null);
  
  // Extract booking parameters from URL
  const [bookingData, setBookingData] = useState<BookingData>({
    packageId: searchParams.get('packageId') || '',
    hotelId: searchParams.get('hotelId') || '',
    adults: parseInt(searchParams.get('adults') || '2'),
    children: parseInt(searchParams.get('children') || '0'),
    price: searchParams.get('price') || '0'
  });

  // Passenger details state
  const [passengers, setPassengers] = useState<PassengerDetails[]>([]);
  
  // Contact details state
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    phone: '',
    countryCode: '+38',
    email: session?.user?.email || '',
    password: '',
    confirmPassword: '',
    isExistingUser: !!session?.user
  });

  // Terms and conditions acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Country code search functionality
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Generate initial passenger array based on adults + children
  useEffect(() => {
    const totalPassengers = bookingData.adults + bookingData.children;
    const newPassengers: PassengerDetails[] = [];
    
    // Add adults
    for (let i = 0; i < bookingData.adults; i++) {
      newPassengers.push({
        title: 'Mr',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'M',
        type: 'ADULT'
      });
    }
    
    // Add children
    for (let i = 0; i < bookingData.children; i++) {
      newPassengers.push({
        title: 'CHD',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'M',
        type: 'CHILD'
      });
    }
    
    setPassengers(newPassengers);
  }, [bookingData.adults, bookingData.children]);

  // Fetch package and hotel data
  useEffect(() => {
    if (bookingData.packageId) {
      fetchPackageData();
    }
    if (bookingData.hotelId) {
      fetchHotelData();
    }
  }, [bookingData.packageId, bookingData.hotelId]);

  const fetchPackageData = async () => {
    try {
      const response = await fetch(`/api/public/packages/id/${bookingData.packageId}`);
      if (response.ok) {
        const data = await response.json();
        setPackageData(data);
        console.log('Package data loaded:', data);
      } else {
        console.error('Failed to fetch package data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching package data:', error);
    }
  };

  const fetchHotelData = async () => {
    try {
      const response = await fetch(`/api/public/hotels/id/${bookingData.hotelId}`);
      if (response.ok) {
        const data = await response.json();
        setHotelData(data);
        console.log('Hotel data loaded:', data);
      } else {
        console.error('Failed to fetch hotel data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching hotel data:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePassengerChange = (index: number, field: keyof PassengerDetails, value: string) => {
    setPassengers(prevPassengers => {
      const newPassengers = [...prevPassengers];
      newPassengers[index] = { ...newPassengers[index], [field]: value };
      return newPassengers;
    });
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const updatePassengerType = (index: number, dateOfBirth: string) => {
    const age = calculateAge(dateOfBirth);
    setPassengers(prevPassengers => {
      const newPassengers = [...prevPassengers];
      
      if (age >= 0 && age <= 1) {
        newPassengers[index].type = 'INFANT';
        newPassengers[index].title = 'INF';
      } else if (age >= 2 && age <= 11) {
        newPassengers[index].type = 'CHILD';
        newPassengers[index].title = 'CHD';
      } else {
        newPassengers[index].type = 'ADULT';
        if (newPassengers[index].title === 'CHD' || newPassengers[index].title === 'INF') {
          newPassengers[index].title = 'Mr';
        }
      }
      
      return newPassengers;
    });
  };

  const handleSubmitBooking = async () => {
    setLoading(true);
    
    // Validate required fields one more time
    if (!contactDetails.email || !contactDetails.phone || passengers.length === 0) {
      alert('Please ensure all required fields are filled out correctly.');
      setLoading(false);
      return;
    }

    try {
      const bookingPayload = {
        packageId: bookingData.packageId,
        hotelId: bookingData.hotelId,
        totalAmount: parseFloat(bookingData.price) * 100, // Convert to cents
        currency: 'EUR',
        passengers: passengers.map(p => ({
          ...p,
          age: calculateAge(p.dateOfBirth)
        })),
        contactDetails: {
          phone: `${contactDetails.countryCode}${contactDetails.phone}`,
          email: contactDetails.email
        },
        customerName: passengers[0] ? `${passengers[0].firstName} ${passengers[0].lastName}` : '',
        customerEmail: contactDetails.email,
        customerPhone: `${contactDetails.countryCode}${contactDetails.phone}`,
        adults: bookingData.adults,
        children: bookingData.children
      };

      console.log('Submitting booking payload:', bookingPayload);

      const response = await fetch('/api/bookings/soft-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
      });

      console.log('Booking response status:', response.status);
      const result = await response.json();
      console.log('Booking response:', result);

      if (response.ok) {
        // Show success message first
        alert(`Booking created successfully! Reservation code: ${result.booking?.reservationCode || 'TBA'}`);
        
        // Redirect to booking confirmation or success page
        if (result.booking?.reservationCode) {
          router.push(`/bookings/${result.booking.reservationCode}`);
        } else {
          // Fallback redirect
          router.push('/bookings?status=success');
        }
      } else {
        const errorMessage = result.message || result.error || 'Unknown error occurred';
        console.error('Booking failed:', result);
        alert(`Booking failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(`An error occurred while creating your booking: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return passengers.every(p => 
          p.firstName.trim().length > 0 && 
          p.lastName.trim().length > 0 && 
          p.dateOfBirth.length > 0 && 
          p.title.length > 0 && 
          p.gender.length > 0
        );
      case 2:
        const phoneValid = contactDetails.phone.trim().length >= 6;
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDetails.email.trim());
        const passwordValid = contactDetails.isExistingUser || 
          (contactDetails.password && contactDetails.password.length >= 6 && 
           contactDetails.password === contactDetails.confirmPassword);
        
        return phoneValid && emailValid && passwordValid;
      case 3:
        return termsAccepted;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Passenger Details</h2>
              <p className="text-gray-600">Please provide details for all travelers</p>
            </div>

            <div className="space-y-6">
              {passengers.map((passenger, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Passenger {index + 1}
                    {passenger.type === 'ADULT' && ' (Adult)'}
                    {passenger.type === 'CHILD' && ' (Child)'}
                    {passenger.type === 'INFANT' && ' (Infant)'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <select
                        value={passenger.title}
                        onChange={(e) => handlePassengerChange(index, 'title', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={passenger.type === 'CHILD' || passenger.type === 'INFANT'}
                      >
                        {passenger.type === 'ADULT' && (
                          <>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                          </>
                        )}
                        {passenger.type === 'CHILD' && <option value="CHD">CHD</option>}
                        {passenger.type === 'INFANT' && <option value="INF">INF</option>}
                      </select>
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.firstName}
                        onChange={(e) => handlePassengerChange(index, 'firstName', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter first name"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={passenger.lastName}
                        onChange={(e) => handlePassengerChange(index, 'lastName', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={passenger.dateOfBirth}
                        onChange={(e) => {
                          handlePassengerChange(index, 'dateOfBirth', e.target.value);
                          if (e.target.value) {
                            updatePassengerType(index, e.target.value);
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        max={new Date().toISOString().split('T')[0]}
                        placeholder="YYYY-MM-DD"
                      />
                      {passenger.dateOfBirth && (
                        <p className="text-sm text-gray-500 mt-1">
                          Age: {calculateAge(passenger.dateOfBirth)} years
                        </p>
                      )}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        value={passenger.gender}
                        onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-600">We'll use this information to send your booking confirmation</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <input
                    type="text"
                    value={countrySearch || COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.code || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCountrySearch(value);
                      setShowCountryDropdown(true);
                      
                      // If user types a valid country code directly, select it
                      const matchingCountry = COUNTRY_CODES.find(c => 
                        c.code === value || 
                        c.country.toLowerCase().startsWith(value.toLowerCase())
                      );
                      if (matchingCountry) {
                        setContactDetails({ ...contactDetails, countryCode: matchingCountry.code });
                      }
                    }}
                    onFocus={() => {
                      setShowCountryDropdown(true);
                      setCountrySearch('');
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow selection
                      setTimeout(() => {
                        setShowCountryDropdown(false);
                        setCountrySearch('');
                      }, 150);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Country code or name"
                  />
                  
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {COUNTRY_CODES
                        .filter(country => 
                          !countrySearch || 
                          country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          country.code.includes(countrySearch)
                        )
                        .slice(0, 10) // Show max 10 results
                        .map((country, index) => (
                          <button
                            key={`${country.code}-${country.country}-${index}`}
                            type="button"
                            onClick={() => {
                              setContactDetails({ ...contactDetails, countryCode: country.code });
                              setShowCountryDropdown(false);
                              setCountrySearch('');
                            }}
                            className={`w-full text-left p-3 hover:bg-gray-100 flex items-center gap-2 ${
                              contactDetails.countryCode === country.code ? 'bg-blue-50 text-blue-600' : ''
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="font-medium">{country.code}</span>
                            <span className="text-gray-600 text-sm">{country.country}</span>
                          </button>
                        ))}
                      {countrySearch && COUNTRY_CODES.filter(country => 
                        country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                        country.code.includes(countrySearch)
                      ).length === 0 && (
                        <div className="p-3 text-gray-500 text-center">
                          No countries found matching "{countrySearch}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show selected country */}
                  {!showCountryDropdown && contactDetails.countryCode && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      <span className="text-sm">
                        {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.flag}
                      </span>
                    </div>
                  )}
                </div>
                
                <input
                  type="tel"
                  value={contactDetails.phone}
                  onChange={(e) => setContactDetails({ ...contactDetails, phone: e.target.value })}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              {/* Show selected country info */}
              {contactDetails.countryCode && (
                <div className="mt-1 text-xs text-gray-500">
                  Selected: {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.flag} {' '}
                  {COUNTRY_CODES.find(c => c.code === contactDetails.countryCode)?.country} {' '}
                  ({contactDetails.countryCode})
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={contactDetails.email}
                onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
                disabled={!!session?.user}
              />
              {session?.user && (
                <p className="text-sm text-blue-600 mt-1">
                  You're signed in as {session.user.email}
                </p>
              )}
            </div>

            {/* Authentication */}
            {!session?.user && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setContactDetails({ ...contactDetails, isExistingUser: true })}
                    className={`px-4 py-2 rounded-lg ${contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    I have an account
                  </button>
                  <button
                    onClick={() => setContactDetails({ ...contactDetails, isExistingUser: false })}
                    className={`px-4 py-2 rounded-lg ${!contactDetails.isExistingUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Create new account
                  </button>
                </div>

                {contactDetails.isExistingUser ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={contactDetails.password}
                      onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your password"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Create Password *
                      </label>
                      <input
                        type="password"
                        value={contactDetails.password}
                        onChange={(e) => setContactDetails({ ...contactDetails, password: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Create a password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={contactDetails.confirmPassword}
                        onChange={(e) => setContactDetails({ ...contactDetails, confirmPassword: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Summary</h2>
              <p className="text-gray-600">Please review your booking details before confirming</p>
            </div>

            {/* Package Details */}
            {packageData && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
                <div className="flex items-start gap-4">
                  {packageData.primaryImage && (
                    <img 
                      src={packageData.primaryImage} 
                      alt={packageData.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{packageData.name}</h4>
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {packageData.city?.name}, {packageData.city?.country?.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{packageData.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hotel Details */}
            {hotelData ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                <div className="flex items-start gap-4">
                  {hotelData.primaryImage && (
                    <img 
                      src={hotelData.primaryImage} 
                      alt={hotelData.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{hotelData.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(hotelData.rating || 0)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                      <span className="text-gray-600 ml-1">{hotelData.rating} Star</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{hotelData.address}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
                <div className="text-gray-600">
                  <p>Selected hotel will be confirmed after booking completion</p>
                  <p className="text-sm mt-1">Hotel ID: {bookingData.hotelId}</p>
                </div>
              </div>
            )}

            {/* Flight Information */}
            {/* Debug packageData */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-yellow-800">Debug: Package Data</h4>
                <p className="text-xs text-yellow-700">Flights count: {packageData?.flights?.length || 0}</p>
                <p className="text-xs text-yellow-700">Departure flight: {packageData?.departureFlight ? 'Yes' : 'No'}</p>
                <p className="text-xs text-yellow-700">Return flight: {packageData?.returnFlight ? 'Yes' : 'No'}</p>
              </div>
            )}

            {packageData?.flights?.length > 0 ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="space-y-4">
                  {packageData.flights.map((flight: any, index: number) => (
                    <div key={flight.id || index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {flight.flightNumber} - {flight.direction === 'outbound' ? 'Outbound' : 'Return'}
                          </h4>
                          <p className="text-gray-600">
                            {flight.departureAirport?.name || flight.departureAirport?.code || 'Unknown'} → {flight.arrivalAirport?.name || flight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(flight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {flight.duration} | Aircraft: {flight.aircraft || 'TBA'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (packageData?.departureFlight || packageData?.returnFlight) ? (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="space-y-4">
                  {packageData?.departureFlight && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {packageData.departureFlight.flightNumber} - Outbound
                          </h4>
                          <p className="text-gray-600">
                            {packageData.departureFlight.departureAirport?.name || packageData.departureFlight.departureAirport?.code || 'Unknown'} → {packageData.departureFlight.arrivalAirport?.name || packageData.departureFlight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(packageData.departureFlight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(packageData.departureFlight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(packageData.departureFlight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {packageData.departureFlight.duration} | Aircraft: {packageData.departureFlight.aircraft || 'TBA'}
                      </p>
                    </div>
                  )}
                  {packageData?.returnFlight && (
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {packageData.returnFlight.flightNumber} - Return
                          </h4>
                          <p className="text-gray-600">
                            {packageData.returnFlight.departureAirport?.name || packageData.returnFlight.departureAirport?.code || 'Unknown'} → {packageData.returnFlight.arrivalAirport?.name || packageData.returnFlight.arrivalAirport?.code || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p>{new Date(packageData.returnFlight.departureTime).toLocaleDateString()}</p>
                          <p>{new Date(packageData.returnFlight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(packageData.returnFlight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Duration: {packageData.returnFlight.duration} | Aircraft: {packageData.returnFlight.aircraft || 'TBA'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                <div className="text-gray-600">
                  <p>Flight details will be confirmed after booking completion</p>
                  <p className="text-sm mt-1">Package includes round-trip flights</p>
                </div>
              </div>
            )}

            {/* Passenger Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Passengers</h3>
              <div className="space-y-3">
                {passengers.map((passenger, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-900">
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {passenger.type} ({calculateAge(passenger.dateOfBirth)} years)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{contactDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{contactDetails.countryCode} {contactDetails.phone}</span>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">€{parseFloat(bookingData.price).toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                For {bookingData.adults} adult{bookingData.adults > 1 ? 's' : ''}
                {bookingData.children > 0 && ` and ${bookingData.children} child${bookingData.children > 1 ? 'ren' : ''}`}
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required 
                />
                <span className="text-sm text-gray-700">
                  I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</a> and 
                  <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                </span>
              </label>
              {!termsAccepted && (
                <p className="text-red-600 text-xs mt-2">
                  Please accept the terms and conditions to proceed
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!bookingData.packageId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking Request</h1>
          <p className="text-gray-600 mb-6">Please select a package first</p>
          <button
            onClick={() => router.push('/packages')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Browse Packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="ml-2 hidden md:block">
                    <p
                      className={`text-sm ${
                        currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-3 rounded-lg ${
              currentStep === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="mr-2" size={20} />
            Previous
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className={`flex items-center px-6 py-3 rounded-lg ${
                !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ChevronRight className="ml-2" size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmitBooking}
              disabled={loading || !validateStep(currentStep)}
              className={`flex items-center px-6 py-3 rounded-lg ${
                loading || !validateStep(currentStep)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}