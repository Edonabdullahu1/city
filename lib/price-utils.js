/**
 * Calculate the display price for a package based on double occupancy
 * @param packagePrices - Array of pre-calculated package prices
 * @param basePrice - Fallback base price if no prices available
 * @returns Rounded price per person ending in 9
 */
export function calculateDisplayPrice(packagePrices, basePrice) {
    // Find the lowest price for 2 adults, 0 children (standard double occupancy)
    const doubleOccupancyPrices = packagePrices.filter(p => p.adults === 2 && p.children === 0);
    let minPrice;
    if (doubleOccupancyPrices.length > 0) {
        // Get the lowest double occupancy price
        const lowestDoublePrice = Math.min(...doubleOccupancyPrices.map(p => Number(p.totalPrice)));
        // Divide by 2 to get per person price
        minPrice = lowestDoublePrice / 2;
    }
    else if (packagePrices.length > 0) {
        // Fallback: if no double occupancy, use any 2-adult price or calculate from available prices
        const twoAdultPrices = packagePrices.filter(p => p.adults === 2);
        if (twoAdultPrices.length > 0) {
            const lowestTwoAdultPrice = Math.min(...twoAdultPrices.map(p => Number(p.totalPrice)));
            minPrice = lowestTwoAdultPrice / 2;
        }
        else {
            // Last resort: use the absolute minimum and adjust
            const absoluteMin = Math.min(...packagePrices.map(p => Number(p.totalPrice)));
            const firstPrice = packagePrices.find(p => Number(p.totalPrice) === absoluteMin);
            if (firstPrice && firstPrice.adults > 0) {
                // Adjust for double occupancy estimate
                minPrice = (absoluteMin / firstPrice.adults) * 1.1; // Add 10% for double occupancy estimate
            }
            else {
                minPrice = absoluteMin;
            }
        }
    }
    else if (basePrice) {
        // Use base price as fallback
        minPrice = basePrice / 2;
    }
    else {
        // Default fallback
        minPrice = 299;
    }
    // Round to nearest 9
    return roundToNearestNine(minPrice);
}
/**
 * Round a price to the nearest number ending in 9
 * Examples: 264 -> 259, 267 -> 269, 195 -> 199
 */
export function roundToNearestNine(price) {
    // Round to nearest integer first
    const rounded = Math.round(price);
    // Get the last digit
    const lastDigit = rounded % 10;
    // Calculate adjustment needed
    let adjustment;
    if (lastDigit === 9) {
        adjustment = 0; // Already ends in 9
    }
    else if (lastDigit < 4) {
        adjustment = 9 - lastDigit - 10; // Round down to previous 9
    }
    else {
        adjustment = 9 - lastDigit; // Round up to next 9
    }
    const result = rounded + adjustment;
    // Ensure we don't go below 99
    return Math.max(99, result);
}
