-- Fix availableSeats for flights that have been incorrectly set to 0
-- This script resets availableSeats to totalSeats minus actual bookings

UPDATE "Flight" f
SET "availableSeats" = f."totalSeats" - COALESCE(
  (
    SELECT SUM(fb.passengers)
    FROM "flight_bookings" fb
    INNER JOIN "bookings" b ON fb."bookingId" = b.id
    WHERE fb."flightId" = f.id
      AND b.status IN ('SOFT', 'CONFIRMED', 'PAID')
  ), 0
)
WHERE f."availableSeats" = 0
  AND f."totalSeats" > 0;
