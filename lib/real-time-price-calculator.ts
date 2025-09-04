// Real-time price calculation from database data
export interface PriceCalculationInput {
  adults: number;
  children: number;
  childAges?: number[];
  flightBlock?: {
    blockGroupId: string;
    outbound: {
      pricePerSeat: number;
    };
    return: {
      pricePerSeat: number;
    };
  };
  hotel?: {
    id: string;
    name: string;
    hotelPrices?: Array<{
      single: number;
      double: number;
      extraBed: number;
      paymentKids: number;
      fromDate: string;
      tillDate: string;
      board: string;
    }>;
  };
  nights: number;
  travelDate?: Date;
}

export interface PriceCalculationResult {
  flightPrice: number;
  hotelPrice: number;
  transferPrice: number;
  totalPrice: number;
  breakdown: {
    flightPerPerson: number;
    hotelPerNight: number;
    childrenCost: number;
  };
}

/**
 * Calculate package price in real-time from database data
 * Based on the admin panel calculation template
 */
export function calculateRealTimePrice(input: PriceCalculationInput): PriceCalculationResult {
  let flightPrice = 0;
  let hotelPrice = 0;
  let transferPrice = 0;
  
  const totalPeople = input.adults + input.children;
  
  // Debug logging
  if (input.nights > 100) {
    console.warn('WARNING: Unusually high nights value:', input.nights);
    console.warn('Input data:', JSON.stringify(input, null, 2));
  }
  
  // 1. Calculate Flight Cost
  // IMPORTANT: The pricePerSeat in database is the COMPLETE ROUND TRIP price per person
  // For example: €120 (12000 cents) = full return ticket price per person
  // We store the same price in both outbound and return flights for consistency
  if (input.flightBlock) {
    // Use actual flight block prices if available
    // Price is stored in cents, divide by 100 to get euros
    // Use either outbound or return price (they should be the same) for the COMPLETE round trip
    const roundTripPricePerPerson = (Number(input.flightBlock.outbound.pricePerSeat) / 100) || 120;
    
    // Adults pay full price for round trip
    flightPrice = input.adults * roundTripPricePerPerson;
    
    // Children pricing based on age
    if (input.children > 0 && input.childAges) {
      input.childAges.forEach(age => {
        if (age <= 1) {
          // Infants (0-1): Free
          // No charge
        } else if (age >= 2 && age <= 11) {
          // Children (2-11): Full flight price (round trip)
          flightPrice += roundTripPricePerPerson;
        }
      });
    } else if (input.children > 0) {
      // If no ages specified, assume all children pay full round trip price
      flightPrice += input.children * roundTripPricePerPerson;
    }
  } else {
    // Fallback to standard €120 per person if no flight block
    flightPrice = totalPeople * 120;
  }
  
  // 2. Calculate Hotel Cost
  if (input.hotel && input.hotel.hotelPrices && input.hotel.hotelPrices.length > 0) {
    // Find applicable hotel price based on travel date
    let hotelPriceData = input.hotel.hotelPrices[0]; // Default to first price
    
    if (input.travelDate) {
      const travelTime = input.travelDate.getTime();
      hotelPriceData = input.hotel.hotelPrices.find(hp => {
        const fromTime = new Date(hp.fromDate).getTime();
        const tillTime = new Date(hp.tillDate).getTime();
        return travelTime >= fromTime && travelTime <= tillTime;
      }) || hotelPriceData;
    }
    
    // Calculate base room cost
    if (input.adults === 1) {
      // Single room
      hotelPrice = Number(hotelPriceData.single) * input.nights;
    } else if (input.adults === 2) {
      // Double room
      hotelPrice = Number(hotelPriceData.double) * input.nights;
    } else if (input.adults === 3) {
      // Double + extra bed
      hotelPrice = (Number(hotelPriceData.double) + Number(hotelPriceData.extraBed)) * input.nights;
    } else if (input.adults === 4) {
      // Two double rooms or family room
      hotelPrice = (Number(hotelPriceData.double) * 2) * input.nights;
    }
    
    // Add children costs
    if (input.children > 0) {
      let payingChildren = 0;
      let freeChildUsed = false;
      
      if (input.childAges) {
        input.childAges.forEach(age => {
          if (age <= 1) {
            // Infants (0-1): Free accommodation
            // No charge
          } else if (age >= 2 && age <= 6) {
            // Young children (2-6): First one free, others pay
            if (!freeChildUsed) {
              freeChildUsed = true;
              // First child 2-6 is free at hotel
            } else {
              payingChildren++;
            }
          } else if (age >= 7 && age <= 11) {
            // Older children (7-11): All pay
            payingChildren++;
          }
        });
      } else {
        // If no ages specified, assume all children pay
        payingChildren = input.children;
      }
      
      // Add paying children cost
      if (payingChildren > 0 && hotelPriceData.paymentKids) {
        hotelPrice += Number(hotelPriceData.paymentKids) * payingChildren * input.nights;
      }
    }
  } else {
    // Fallback hotel pricing if no specific prices
    if (input.adults === 1) {
      hotelPrice = 100 * input.nights;
    } else if (input.adults === 2) {
      hotelPrice = 160 * input.nights;
    } else if (input.adults === 3) {
      hotelPrice = 260 * input.nights;
    } else if (input.adults === 4) {
      hotelPrice = 320 * input.nights;
    }
    
    // Add basic child cost
    if (input.children > 0) {
      hotelPrice += input.children * 30 * input.nights;
    }
  }
  
  // 3. Calculate Transfer Cost (if applicable)
  // Basic transfer pricing
  if (totalPeople <= 3) {
    transferPrice = 0; // Included in package
  } else if (totalPeople <= 7) {
    transferPrice = 0; // Included in package
  }
  
  // 4. Calculate total (profit margin already included in database prices)
  const totalPrice = flightPrice + hotelPrice + transferPrice;
  
  return {
    flightPrice,
    hotelPrice,
    transferPrice,
    totalPrice,
    breakdown: {
      flightPerPerson: flightPrice / Math.max(1, totalPeople),
      hotelPerNight: hotelPrice / Math.max(1, input.nights),
      childrenCost: 0 // Will be calculated if needed
    }
  };
}

/**
 * Format price for display (round to nearest 9)
 */
export function formatDisplayPrice(price: number): number {
  // Round to nearest integer first
  const rounded = Math.round(price);
  
  // Get the last digit
  const lastDigit = rounded % 10;
  
  // Calculate adjustment needed
  let adjustment: number;
  if (lastDigit === 9) {
    adjustment = 0; // Already ends in 9
  } else if (lastDigit < 4) {
    adjustment = 9 - lastDigit - 10; // Round down to previous 9
  } else {
    adjustment = 9 - lastDigit; // Round up to next 9
  }
  
  const result = rounded + adjustment;
  
  // Ensure we don't go below 99
  return Math.max(99, result);
}