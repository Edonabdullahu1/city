-- Business Rule Constraints for Travel Agency Database
-- Run after schema deployment to enforce business logic at the database level

-- 1. Booking Status Progression Constraints
-- Ensure bookings follow proper status flow: SOFT -> CONFIRMED -> PAID (or CANCELLED at any point)
CREATE OR REPLACE FUNCTION check_booking_status_transition() 
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any status for new records
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Status transition validation for updates
  IF OLD.status = 'CANCELLED' AND NEW.status != 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot change status from CANCELLED to %', NEW.status;
  END IF;
  
  IF OLD.status = 'PAID' AND NEW.status NOT IN ('PAID', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot change status from PAID to %', NEW.status;
  END IF;
  
  IF OLD.status = 'CONFIRMED' AND NEW.status = 'SOFT' THEN
    RAISE EXCEPTION 'Cannot downgrade status from CONFIRMED to SOFT';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_status_transition_check ON bookings;
CREATE TRIGGER booking_status_transition_check
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_status_transition();

-- 2. Reservation Code Format Constraint
-- Ensure all reservation codes follow MXi-XXXX format
ALTER TABLE bookings 
ADD CONSTRAINT booking_reservation_code_format 
CHECK (reservation_code ~ '^MXi-\d{4}$');

-- 3. Hotel Room Capacity Constraints
-- Ensure room capacity makes business sense
ALTER TABLE rooms 
ADD CONSTRAINT room_capacity_valid 
CHECK (capacity BETWEEN 1 AND 8);

ALTER TABLE rooms 
ADD CONSTRAINT room_total_rooms_valid 
CHECK (total_rooms > 0);

-- 4. Booking Date Validation
-- Check-in must be before check-out
CREATE OR REPLACE FUNCTION check_booking_dates() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in_date IS NOT NULL AND NEW.check_out_date IS NOT NULL THEN
    IF NEW.check_in_date >= NEW.check_out_date THEN
      RAISE EXCEPTION 'Check-in date must be before check-out date';
    END IF;
    
    -- Check-in cannot be more than 2 years in advance
    IF NEW.check_in_date > CURRENT_DATE + INTERVAL '2 years' THEN
      RAISE EXCEPTION 'Check-in date cannot be more than 2 years in advance';
    END IF;
    
    -- Check-in cannot be in the past (except for admin modifications)
    IF NEW.check_in_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Check-in date cannot be in the past';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_dates_check ON bookings;
CREATE TRIGGER booking_dates_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_dates();

-- 5. Hotel Booking Date Validation
CREATE OR REPLACE FUNCTION check_hotel_booking_dates() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in >= NEW.check_out THEN
    RAISE EXCEPTION 'Hotel check-in must be before check-out';
  END IF;
  
  IF NEW.nights <= 0 THEN
    RAISE EXCEPTION 'Hotel booking must have at least 1 night';
  END IF;
  
  -- Validate nights calculation matches date difference
  IF NEW.nights != (NEW.check_out::date - NEW.check_in::date) THEN
    RAISE EXCEPTION 'Nights count does not match date difference';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hotel_booking_dates_check ON hotel_bookings;
CREATE TRIGGER hotel_booking_dates_check
  BEFORE INSERT OR UPDATE ON hotel_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_hotel_booking_dates();

-- 6. Flight Booking Date Validation
CREATE OR REPLACE FUNCTION check_flight_booking_dates() 
RETURNS TRIGGER AS $$
BEGIN
  -- Departure must be in the future (except for admin modifications)
  IF NEW.departure_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Flight departure cannot be in the past';
  END IF;
  
  -- If return date exists, it must be after departure
  IF NEW.return_date IS NOT NULL AND NEW.return_date <= NEW.departure_date THEN
    RAISE EXCEPTION 'Return flight must be after departure';
  END IF;
  
  -- Passenger count validation
  IF NEW.passengers < 1 OR NEW.passengers > 9 THEN
    RAISE EXCEPTION 'Passenger count must be between 1 and 9';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flight_booking_dates_check ON flight_bookings;
CREATE TRIGGER flight_booking_dates_check
  BEFORE INSERT OR UPDATE ON flight_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_flight_booking_dates();

-- 7. Package Booking Validation
CREATE OR REPLACE FUNCTION check_package_booking() 
RETURNS TRIGGER AS $$
BEGIN
  -- Adult count validation (at least 1 adult required)
  IF NEW.adults < 1 THEN
    RAISE EXCEPTION 'At least 1 adult is required for package booking';
  END IF;
  
  -- Maximum occupancy validation (reasonable limits)
  IF (NEW.adults + NEW.children + NEW.infants) > 8 THEN
    RAISE EXCEPTION 'Total occupancy cannot exceed 8 persons';
  END IF;
  
  -- Children/infants cannot exceed adults by too much
  IF NEW.children > (NEW.adults * 2) THEN
    RAISE EXCEPTION 'Too many children relative to adults';
  END IF;
  
  -- Date validation
  IF NEW.check_in >= NEW.check_out THEN
    RAISE EXCEPTION 'Package check-in must be before check-out';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS package_booking_check ON package_bookings;
CREATE TRIGGER package_booking_check
  BEFORE INSERT OR UPDATE ON package_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_package_booking();

-- 8. Room Availability Constraints
-- Available rooms cannot be negative
ALTER TABLE room_availability 
ADD CONSTRAINT available_rooms_non_negative 
CHECK (available_rooms >= 0);

-- Booked rooms cannot exceed available + booked total
CREATE OR REPLACE FUNCTION check_room_availability() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booked_rooms > (NEW.available_rooms + NEW.booked_rooms) THEN
    RAISE EXCEPTION 'Booked rooms cannot exceed total capacity';
  END IF;
  
  IF NEW.booked_rooms < 0 THEN
    RAISE EXCEPTION 'Booked rooms cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_availability_check ON room_availability;
CREATE TRIGGER room_availability_check
  BEFORE INSERT OR UPDATE ON room_availability
  FOR EACH ROW
  EXECUTE FUNCTION check_room_availability();

-- 9. Financial Validation
-- All prices must be non-negative
ALTER TABLE hotel_bookings 
ADD CONSTRAINT hotel_booking_price_non_negative 
CHECK (price_per_night >= 0 AND total_price >= 0);

ALTER TABLE flight_bookings 
ADD CONSTRAINT flight_booking_price_non_negative 
CHECK (price >= 0);

ALTER TABLE transfer_bookings 
ADD CONSTRAINT transfer_booking_price_non_negative 
CHECK (price >= 0);

ALTER TABLE excursion_bookings 
ADD CONSTRAINT excursion_booking_price_non_negative 
CHECK (price >= 0 AND total_price >= 0);

ALTER TABLE package_bookings 
ADD CONSTRAINT package_booking_price_non_negative 
CHECK (total_price >= 0);

ALTER TABLE bookings 
ADD CONSTRAINT booking_total_amount_non_negative 
CHECK (total_amount >= 0);

-- 10. Flight Capacity Constraints
ALTER TABLE flights 
ADD CONSTRAINT flight_available_seats_valid 
CHECK (available_seats >= 0 AND available_seats <= total_seats);

ALTER TABLE flights 
ADD CONSTRAINT flight_total_seats_valid 
CHECK (total_seats > 0);

-- 11. Hotel Rating Constraints
ALTER TABLE hotels 
ADD CONSTRAINT hotel_rating_valid 
CHECK (rating BETWEEN 1 AND 5);

-- 12. Transfer Capacity Constraints
ALTER TABLE transfers 
ADD CONSTRAINT transfer_capacity_valid 
CHECK (capacity BETWEEN 1 AND 50);

-- 13. Excursion Capacity Constraints
ALTER TABLE excursions 
ADD CONSTRAINT excursion_capacity_valid 
CHECK (capacity > 0);

ALTER TABLE excursions 
ADD CONSTRAINT excursion_duration_valid 
CHECK (duration > 0);

-- 14. User Role Validation (already handled by enum, but add comment)
-- User roles are constrained by the UserRole enum: USER, AGENT, ADMIN

-- 15. Booking Expiration Logic
-- Soft bookings should expire after 3 hours
CREATE OR REPLACE FUNCTION check_booking_expiration() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiration for new SOFT bookings
  IF NEW.status = 'SOFT' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '3 hours';
  END IF;
  
  -- Clear expiration when booking is confirmed or paid
  IF NEW.status IN ('CONFIRMED', 'PAID', 'CANCELLED') AND OLD.expires_at IS NOT NULL THEN
    NEW.expires_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_expiration_check ON bookings;
CREATE TRIGGER booking_expiration_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_expiration();

-- 16. Email Format Validation
CREATE OR REPLACE FUNCTION check_email_format() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NOT (NEW.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  IF NEW.customer_email IS NOT NULL AND NOT (NEW.customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
    RAISE EXCEPTION 'Invalid customer email format: %', NEW.customer_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_email_check ON users;
CREATE TRIGGER user_email_check
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_email_format();

DROP TRIGGER IF EXISTS booking_email_check ON bookings;
CREATE TRIGGER booking_email_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_email_format();

-- 17. Index Performance Optimizations for Business Rules
-- Add indexes for frequently queried constraints

-- Booking status and expiration queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_expires 
ON bookings (status, expires_at) 
WHERE expires_at IS NOT NULL;

-- Room availability by date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_availability_date_range 
ON room_availability (room_id, date, available_rooms) 
WHERE available_rooms > 0;

-- Flight availability queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flights_availability 
ON flights (origin_city_id, destination_city_id, departure_time, available_seats) 
WHERE available_seats > 0;

-- Booking audit trail performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_audits_booking_date 
ON booking_audits (booking_id, created_at);

COMMENT ON FUNCTION check_booking_status_transition() IS 'Enforces proper booking status progression: SOFT -> CONFIRMED -> PAID -> CANCELLED';
COMMENT ON FUNCTION check_booking_dates() IS 'Validates booking check-in/out dates are logical and not in the past';
COMMENT ON FUNCTION check_hotel_booking_dates() IS 'Validates hotel booking dates and nights calculation';
COMMENT ON FUNCTION check_flight_booking_dates() IS 'Validates flight booking dates and passenger counts';
COMMENT ON FUNCTION check_package_booking() IS 'Validates package booking occupancy and dates';
COMMENT ON FUNCTION check_room_availability() IS 'Prevents overbooking of hotel rooms';
COMMENT ON FUNCTION check_booking_expiration() IS 'Manages 3-hour expiration for soft bookings';
COMMENT ON FUNCTION check_email_format() IS 'Validates email address format using regex';

-- Success message
SELECT 'Database business rule constraints added successfully!' as result;