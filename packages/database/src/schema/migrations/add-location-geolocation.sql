-- Add geolocation columns to the locations table.
-- All nullable — not every location needs a map pin.

ALTER TABLE locations
  ADD COLUMN latitude NUMERIC(10,8),
  ADD COLUMN longitude NUMERIC(11,8),
  ADD COLUMN geo_address TEXT;
