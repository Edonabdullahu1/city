/**
 * Get the correct price for a package based on selected options
 * This follows a simple formula:
 * - Flight price (fixed per person based on block)
 * - Hotel price (based on occupancy and hotel selection)
 * - Service charge (fixed)
 * - Profit margin (percentage)
 */
export function getPackagePrice(
  packagePrices: Array<{
    adults: number;
    children: number;
    flightPrice: number | string;
    hotelPrice: number | string;
    transferPrice: number | string;
    totalPrice: number | string;
    hotelName?: string;
    flightBlockId?: string;
  }>,
  selectedHotel: { name: string } | null,
  selectedFlightBlockId: string | null,
  adults: number,
  children: number
): {
  flightPrice: number;
  hotelPrice: number;
  transferPrice: number;
  totalPrice: number;
  found: boolean;
} | null {
  if (!selectedHotel || !selectedFlightBlockId) {
    return null;
  }

  // Find exact match for adults, children, hotel, and flight block
  const exactMatch = packagePrices.find(
    price =>
      price.adults === adults &&
      price.children === children &&
      price.hotelName === selectedHotel.name &&
      price.flightBlockId === selectedFlightBlockId
  );

  if (exactMatch) {
    return {
      flightPrice: Number(exactMatch.flightPrice),
      hotelPrice: Number(exactMatch.hotelPrice),
      transferPrice: Number(exactMatch.transferPrice),
      totalPrice: Number(exactMatch.totalPrice),
      found: true
    };
  }

  // If no exact match, return null (price not available for this combination)
  return null;
}