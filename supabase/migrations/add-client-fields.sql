-- Add client dashboard fields to events table

ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS gameplay_mode TEXT DEFAULT 'normal' CHECK (gameplay_mode IN ('tight', 'normal', 'loose'));

ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS ticket_cap INTEGER;

-- Update existing events to have normal gameplay mode
UPDATE events SET gameplay_mode = 'normal' WHERE gameplay_mode IS NULL;
