"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRealTimePrice = calculateRealTimePrice;
exports.formatDisplayPrice = formatDisplayPrice;
/**
 * Calculate package price in real-time from database data
 * Based on the admin panel calculation template
 */
function calculateRealTimePrice(input) {
    let flightPrice = 0;
    let hotelPrice = 0;
    let transferPrice = 0;
    const totalPeople = input.adults + input.children;
    // 1. Calculate Flight Cost
    // Standard rate: €120 per person for return flight (€60 each way)
    if (input.flightBlock) {
        // Use actual flight block prices if available
        // IMPORTANT: Flight prices are stored in cents in the database, so divide by 100
        const outboundPrice = (Number(input.flightBlock.outbound.pricePerSeat) / 100) || 60;
        const returnPrice = (Number(input.flightBlock.return?.pricePerSeat) / 100) || 60;
        // Adults pay full price
        flightPrice = input.adults * (outboundPrice + returnPrice);
        // Children pricing based on age
        if (input.children > 0 && input.childAges) {
            input.childAges.forEach(age => {
                if (age <= 1) {
                    // Infants (0-1): Free
                    // No charge
                }
                else if (age >= 2 && age <= 11) {
                    // Children (2-11): Full flight price
                    flightPrice += (outboundPrice + returnPrice);
                }
            });
        }
        else if (input.children > 0) {
            // If no ages specified, assume all children pay
            flightPrice += input.children * (outboundPrice + returnPrice);
        }
    }
    else {
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
        }
        else if (input.adults === 2) {
            // Double room
            hotelPrice = Number(hotelPriceData.double) * input.nights;
        }
        else if (input.adults === 3) {
            // Double + extra bed
            hotelPrice = (Number(hotelPriceData.double) + Number(hotelPriceData.extraBed)) * input.nights;
        }
        else if (input.adults === 4) {
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
                    }
                    else if (age >= 2 && age <= 6) {
                        // Young children (2-6): First one free, others pay
                        if (!freeChildUsed) {
                            freeChildUsed = true;
                            // First child 2-6 is free at hotel
                        }
                        else {
                            payingChildren++;
                        }
                    }
                    else if (age >= 7 && age <= 11) {
                        // Older children (7-11): All pay
                        payingChildren++;
                    }
                });
            }
            else {
                // If no ages specified, assume all children pay
                payingChildren = input.children;
            }
            // Add paying children cost
            if (payingChildren > 0 && hotelPriceData.paymentKids) {
                hotelPrice += Number(hotelPriceData.paymentKids) * payingChildren * input.nights;
            }
        }
    }
    else {
        // Fallback hotel pricing if no specific prices
        if (input.adults === 1) {
            hotelPrice = 100 * input.nights;
        }
        else if (input.adults === 2) {
            hotelPrice = 160 * input.nights;
        }
        else if (input.adults === 3) {
            hotelPrice = 260 * input.nights;
        }
        else if (input.adults === 4) {
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
    }
    else if (totalPeople <= 7) {
        transferPrice = 0; // Included in package
    }
    // 4. Add profit margin (20%)
    const subtotal = flightPrice + hotelPrice + transferPrice;
    const profitMargin = subtotal * 0.20;
    const totalPrice = subtotal + profitMargin;
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
function formatDisplayPrice(price) {
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
