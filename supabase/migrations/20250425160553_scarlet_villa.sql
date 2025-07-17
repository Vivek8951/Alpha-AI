/*
  # Fix RLS policies for provider validations and storage allocations

  1. Changes
    - Add RLS policy for provider_validations table to allow inserts
    - Add RLS policy for storage_allocations table to allow reads
    - Fix query handling for empty results
    
  2. Security
    - Enable RLS on provider_validations table
    - Add policies for authenticated users
*/

-- Enable RLS for provider_validations if not already enabled
ALTER TABLE provider_validations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Providers can read their own validations" ON provider_validations;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON provider_validations;

-- Add policy to allow providers to read their validations
CREATE POLICY "Providers can read their own validations"
ON provider_validations
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT id 
    FROM storage_providers 
    WHERE wallet_address = CURRENT_USER
  )
);

-- Add policy to allow authenticated users to insert validations
CREATE POLICY "Allow insert for authenticated users"
ON provider_validations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy to allow users to read their storage allocations
CREATE POLICY "Users can read their storage allocations"
ON storage_allocations
FOR SELECT
TO authenticated
USING (
  user_address = CURRENT_USER OR
  LOWER(user_address) = LOWER(CURRENT_USER)
);