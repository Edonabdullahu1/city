import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export interface PassengerDetails {
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
}

export interface ContactDetails {
  phone: string;
  countryCode: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  isExistingUser: boolean;
}

export interface BookingData {
  packageId: string;
  hotelId: string;
  adults: number;
  children: number;
  price: string;
}

export interface BookingFormStep {
  id: number;
  name: string;
  icon: any;
}

export function useBookingForm() {
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
    if (currentStep < 3) {
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
    } catch (error: any) {
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
          p.title.length > 0
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

  return {
    // State
    currentStep,
    loading,
    packageData,
    hotelData,
    bookingData,
    passengers,
    contactDetails,
    termsAccepted,
    countrySearch,
    showCountryDropdown,
    session,

    // Setters
    setCurrentStep,
    setContactDetails,
    setTermsAccepted,
    setCountrySearch,
    setShowCountryDropdown,

    // Actions
    handleNext,
    handlePrevious,
    handlePassengerChange,
    handleSubmitBooking,
    updatePassengerType,
    calculateAge,
    validateStep,

    // Utilities
    router
  };
}
