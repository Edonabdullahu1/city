/**
 * Pricing utilities for consistent financial calculations
 * All prices are stored in cents to avoid floating point errors
 */

export interface Price {
  cents: number;
  currency: string;
}

export class PricingUtils {
  /**
   * Convert euros to cents for database storage
   */
  static eurosToCents(euros: number): number {
    return Math.round(euros * 100);
  }

  /**
   * Convert cents to euros for display
   */
  static centsToEuros(cents: number): number {
    return cents / 100;
  }

  /**
   * Format cents as currency string
   */
  static formatPrice(cents: number, currency: string = 'EUR', locale: string = 'en-US'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Parse currency string to cents
   */
  static parsePriceToCents(priceString: string): number {
    // Remove currency symbols and non-numeric characters except decimal point
    const cleanPrice = priceString.replace(/[^\d.,]/g, '');
    
    // Handle both comma and dot as decimal separators
    const normalizedPrice = cleanPrice.replace(',', '.');
    
    const amount = parseFloat(normalizedPrice);
    
    if (isNaN(amount)) {
      throw new Error(`Invalid price format: ${priceString}`);
    }
    
    return Math.round(amount * 100);
  }

  /**
   * Add multiple prices safely (all in cents)
   */
  static addPrices(...pricesInCents: number[]): number {
    return pricesInCents.reduce((sum, price) => sum + price, 0);
  }

  /**
   * Subtract prices safely (all in cents)
   */
  static subtractPrices(basePrice: number, ...deductionsInCents: number[]): number {
    const totalDeductions = deductionsInCents.reduce((sum, price) => sum + price, 0);
    return Math.max(0, basePrice - totalDeductions);
  }

  /**
   * Multiply price by quantity (cents * quantity)
   */
  static multiplyPrice(priceInCents: number, quantity: number): number {
    return Math.round(priceInCents * quantity);
  }

  /**
   * Apply percentage discount to price
   */
  static applyDiscount(priceInCents: number, discountPercentage: number): number {
    const discountAmount = Math.round(priceInCents * (discountPercentage / 100));
    return Math.max(0, priceInCents - discountAmount);
  }

  /**
   * Apply percentage markup to price
   */
  static applyMarkup(priceInCents: number, markupPercentage: number): number {
    const markupAmount = Math.round(priceInCents * (markupPercentage / 100));
    return priceInCents + markupAmount;
  }

  /**
   * Calculate tax amount
   */
  static calculateTax(priceInCents: number, taxPercentage: number): number {
    return Math.round(priceInCents * (taxPercentage / 100));
  }

  /**
   * Add tax to price
   */
  static addTax(priceInCents: number, taxPercentage: number): number {
    const taxAmount = this.calculateTax(priceInCents, taxPercentage);
    return priceInCents + taxAmount;
  }

  /**
   * Calculate price per person for group bookings
   */
  static calculatePricePerPerson(
    totalPriceInCents: number, 
    adults: number, 
    children: number = 0,
    childDiscount: number = 0 // percentage discount for children
  ): { adultPrice: number; childPrice: number; totalPrice: number } {
    
    const childPrice = this.applyDiscount(totalPriceInCents, childDiscount);
    const totalPersons = adults + children;
    
    if (totalPersons === 0) {
      return { adultPrice: 0, childPrice: 0, totalPrice: 0 };
    }

    // Calculate weighted average
    const totalWeightedPersons = adults + (children * (1 - childDiscount / 100));
    const adultPrice = Math.round(totalPriceInCents / totalWeightedPersons);
    
    const calculatedChildPrice = this.applyDiscount(adultPrice, childDiscount);
    const calculatedTotal = (adultPrice * adults) + (calculatedChildPrice * children);

    return {
      adultPrice,
      childPrice: calculatedChildPrice,
      totalPrice: calculatedTotal,
    };
  }

  /**
   * Validate price ranges and business rules
   */
  static validatePrice(priceInCents: number, minPrice: number = 0, maxPrice: number = 1000000): boolean {
    return priceInCents >= minPrice && priceInCents <= maxPrice && Number.isInteger(priceInCents);
  }

  /**
   * Convert legacy decimal prices to cents
   */
  static convertDecimalToCents(decimalPrice: number | string): number {
    if (typeof decimalPrice === 'string') {
      decimalPrice = parseFloat(decimalPrice);
    }
    
    if (isNaN(decimalPrice)) {
      throw new Error(`Invalid decimal price: ${decimalPrice}`);
    }
    
    return Math.round(decimalPrice * 100);
  }

  /**
   * Calculate hotel pricing based on occupancy
   */
  static calculateHotelPrice(
    basePricePerNight: number, // in cents
    nights: number,
    adults: number,
    children: number = 0,
    extraBedPrice: number = 0, // in cents
    childAge: number[] = []
  ): {
    subtotal: number;
    extraBedTotal: number;
    total: number;
    breakdown: {
      nights: number;
      pricePerNight: number;
      adults: number;
      children: number;
      extraBeds: number;
    };
  } {
    
    const subtotal = this.multiplyPrice(basePricePerNight, nights);
    const extraBeds = Math.max(0, (adults + children) - 2); // Assuming standard room fits 2 people
    const extraBedTotal = this.multiplyPrice(extraBedPrice, extraBeds * nights);
    
    const total = this.addPrices(subtotal, extraBedTotal);

    return {
      subtotal,
      extraBedTotal,
      total,
      breakdown: {
        nights,
        pricePerNight: basePricePerNight,
        adults,
        children,
        extraBeds,
      },
    };
  }

  /**
   * Calculate flight pricing based on passengers
   */
  static calculateFlightPrice(
    pricePerSeat: number, // in cents - complete round trip price
    adults: number,
    children: number = 0,
    infants: number = 0,
    childDiscount: number = 0, // children pay full price unless specified
    infantPrice: number = 0 // infants typically fly free
  ): {
    adultTotal: number;
    childTotal: number;
    infantTotal: number;
    total: number;
    breakdown: {
      adults: number;
      children: number;
      infants: number;
      pricePerAdult: number;
      pricePerChild: number;
      pricePerInfant: number;
    };
  } {
    
    const pricePerChild = children > 0 && childDiscount > 0 
      ? this.applyDiscount(pricePerSeat, childDiscount)
      : pricePerSeat; // Children pay full price by default

    const adultTotal = this.multiplyPrice(pricePerSeat, adults);
    const childTotal = this.multiplyPrice(pricePerChild, children);
    const infantTotal = this.multiplyPrice(infantPrice, infants);
    
    const total = this.addPrices(adultTotal, childTotal, infantTotal);

    return {
      adultTotal,
      childTotal,
      infantTotal,
      total,
      breakdown: {
        adults,
        children,
        infants,
        pricePerAdult: pricePerSeat,
        pricePerChild,
        pricePerInfant: infantPrice,
      },
    };
  }

  /**
   * Round to nearest 5 cents for display purposes
   */
  static roundToNearestFiveCents(priceInCents: number): number {
    return Math.round(priceInCents / 5) * 5;
  }

  /**
   * Compare prices safely
   */
  static comparePrices(price1: number, price2: number): number {
    return price1 - price2;
  }

  /**
   * Get the minimum/maximum price from array
   */
  static getMinPrice(prices: number[]): number {
    return Math.min(...prices);
  }

  static getMaxPrice(prices: number[]): number {
    return Math.max(...prices);
  }

  /**
   * Calculate average price
   */
  static getAveragePrice(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / prices.length);
  }
}