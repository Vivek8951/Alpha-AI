/*
  # Add used_gb column to storage_allocations table
  
  1. Changes
    - Add used_gb column to track storage usage per allocation
    - Set default value to 0
    - Make column not nullable
*/

ALTER TABLE storage_allocations 
ADD COLUMN IF NOT EXISTS used_gb numeric NOT NULL DEFAULT 0;

-- Update existing records to have 0 used_gb
UPDATE storage_allocations 
SET used_gb = 0 
WHERE used_gb IS NULL;