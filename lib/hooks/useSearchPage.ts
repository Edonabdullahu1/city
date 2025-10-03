import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Package {
  id: string;
  name: string;
  slug: string;
  description: string;
  nights: number;
  basePrice: number;
  featured: boolean;
  images: string[];
  hotel: {
    name: string;
    rating: number;
  };
  city: {
    name: string;
    country: {
      name: string;
    };
  };
  packagePrices: Array<{
    adults: number;
    children: number;
    totalPrice: number;
  }>;
}

export function useSearchPage() {
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const cityId = searchParams.get('city');
  const date = searchParams.get('date');
  const adults = parseInt(searchParams.get('adults') || '2');
  const children = parseInt(searchParams.get('children') || '0');

  useEffect(() => {
    if (cityId && date) {
      fetchPackages();
    }
  }, [cityId, date, adults, children]);

  const fetchPackages = async () => {
    try {
      const params = new URLSearchParams({
        cityId: cityId!,
        date: date!,
        adults: adults.toString(),
        children: children.toString()
      });

      const response = await fetch(`/api/public/search?${params}`);
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

  const getPackagePrice = (pkg: Package) => {
    // Find matching price for the selected occupancy
    const matchingPrice = pkg.packagePrices.find(
      price => price.adults === adults && price.children === children
    );
    return matchingPrice?.totalPrice || pkg.basePrice;
  };

  return {
    packages,
    loading,
    cityId,
    date,
    adults,
    children,
    getPackagePrice
  };
}

export type { Package };
