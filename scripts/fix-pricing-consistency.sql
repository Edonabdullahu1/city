-- Fix Pricing Consistency Migration
-- Convert all Decimal pricing fields to Int (cents) for financial accuracy
-- This prevents floating point calculation errors

-- Start transaction
BEGIN;

-- 1. Add new Int columns for cents-based pricing
ALTER TABLE hotel_prices 
  ADD COLUMN single_cents INTEGER,
  ADD COLUMN double_cents INTEGER,
  ADD COLUMN extra_bed_cents INTEGER,
  ADD COLUMN payment_kids_cents INTEGER;

-- 2. Convert existing Decimal values to cents (multiply by 100)
UPDATE hotel_prices 
SET 
  single_cents = ROUND(single * 100)::INTEGER,
  double_cents = ROUND(double * 100)::INTEGER,
  extra_bed_cents = ROUND(extra_bed * 100)::INTEGER,
  payment_kids_cents = ROUND(payment_kids * 100)::INTEGER;

-- 3. Add new Int columns for package prices
ALTER TABLE package_prices
  ADD COLUMN flight_price_cents INTEGER,
  ADD COLUMN hotel_price_cents INTEGER,
  ADD COLUMN transfer_price_cents INTEGER,
  ADD COLUMN total_price_cents INTEGER;

-- 4. Convert package pricing to cents
UPDATE package_prices
SET
  flight_price_cents = ROUND(flight_price * 100)::INTEGER,
  hotel_price_cents = ROUND(hotel_price * 100)::INTEGER,
  transfer_price_cents = ROUND(transfer_price * 100)::INTEGER,
  total_price_cents = ROUND(total_price * 100)::INTEGER;

-- 5. Add new Int columns for packages
ALTER TABLE packages
  ADD COLUMN base_price_cents INTEGER,
  ADD COLUMN profit_margin_cents INTEGER,
  ADD COLUMN service_charge_cents INTEGER;

-- 6. Convert package base pricing to cents
UPDATE packages
SET
  base_price_cents = base_price, -- base_price is already in cents (Int)
  profit_margin_cents = CASE 
    WHEN profit_margin IS NOT NULL THEN ROUND(profit_margin * 100)::INTEGER
    ELSE NULL
  END,
  service_charge_cents = CASE
    WHEN service_charge IS NOT NULL THEN ROUND(service_charge * 100)::INTEGER
    ELSE NULL
  END;

-- 7. Add NOT NULL constraints after data migration
ALTER TABLE hotel_prices
  ALTER COLUMN single_cents SET NOT NULL,
  ALTER COLUMN double_cents SET NOT NULL,
  ALTER COLUMN extra_bed_cents SET NOT NULL,
  ALTER COLUMN payment_kids_cents SET NOT NULL;

ALTER TABLE package_prices
  ALTER COLUMN flight_price_cents SET NOT NULL,
  ALTER COLUMN hotel_price_cents SET NOT NULL,
  ALTER COLUMN transfer_price_cents SET NOT NULL,
  ALTER COLUMN total_price_cents SET NOT NULL;

-- 8. Add indexes for performance on new price columns
CREATE INDEX idx_hotel_prices_single_cents ON hotel_prices(single_cents);
CREATE INDEX idx_hotel_prices_double_cents ON hotel_prices(double_cents);
CREATE INDEX idx_package_prices_total_cents ON package_prices(total_price_cents);

-- 9. Create a function to safely convert cents to display currency
CREATE OR REPLACE FUNCTION cents_to_currency(cents INTEGER, currency_code TEXT DEFAULT 'EUR')
RETURNS TEXT AS $$
BEGIN
  RETURN ROUND(cents / 100.0, 2)::TEXT || ' ' || currency_code;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Create a function to safely convert currency to cents
CREATE OR REPLACE FUNCTION currency_to_cents(amount DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(amount * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. Add check constraints to ensure prices are positive
ALTER TABLE hotel_prices
  ADD CONSTRAINT chk_hotel_prices_single_positive CHECK (single_cents >= 0),
  ADD CONSTRAINT chk_hotel_prices_double_positive CHECK (double_cents >= 0),
  ADD CONSTRAINT chk_hotel_prices_extra_bed_positive CHECK (extra_bed_cents >= 0),
  ADD CONSTRAINT chk_hotel_prices_payment_kids_positive CHECK (payment_kids_cents >= 0);

ALTER TABLE package_prices
  ADD CONSTRAINT chk_package_prices_flight_positive CHECK (flight_price_cents >= 0),
  ADD CONSTRAINT chk_package_prices_hotel_positive CHECK (hotel_price_cents >= 0),
  ADD CONSTRAINT chk_package_prices_transfer_positive CHECK (transfer_price_cents >= 0),
  ADD CONSTRAINT chk_package_prices_total_positive CHECK (total_price_cents >= 0);

-- 12. Add comments for documentation
COMMENT ON COLUMN hotel_prices.single_cents IS 'Single room price in cents (e.g., 12000 = €120.00)';
COMMENT ON COLUMN hotel_prices.double_cents IS 'Double room price in cents (e.g., 15000 = €150.00)';
COMMENT ON COLUMN hotel_prices.extra_bed_cents IS 'Extra bed price in cents';
COMMENT ON COLUMN hotel_prices.payment_kids_cents IS 'Children payment price in cents';

COMMENT ON COLUMN package_prices.flight_price_cents IS 'Flight price in cents';
COMMENT ON COLUMN package_prices.hotel_price_cents IS 'Hotel price in cents';
COMMENT ON COLUMN package_prices.transfer_price_cents IS 'Transfer price in cents';
COMMENT ON COLUMN package_prices.total_price_cents IS 'Total package price in cents';

-- Commit transaction
COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Pricing consistency migration completed successfully!';
  RAISE NOTICE 'All prices are now stored in cents for financial accuracy.';
  RAISE NOTICE 'Use cents_to_currency() function to display prices.';
  RAISE NOTICE 'Use currency_to_cents() function to convert input prices.';
END $$;