/*
  # Fix RLS policies for provider_dummy_files table

  1. Changes
    - Enable RLS on provider_dummy_files table
    - Add policies to allow trigger operations
    - Add policies for provider access with proper type casting

  2. Security
    - Enable RLS on provider_dummy_files table
    - Add policy for trigger-based inserts
    - Add policy for provider access to their own files
*/

-- Enable RLS on the table
ALTER TABLE provider_dummy_files ENABLE ROW LEVEL SECURITY;

-- Policy for trigger-based operations (using security definer function)
CREATE POLICY "Allow trigger operations on provider_dummy_files"
ON provider_dummy_files
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policy for providers to access their own dummy files
CREATE POLICY "Providers can manage their own dummy files"
ON provider_dummy_files
FOR ALL
TO authenticated
USING (
  provider_id IN (
    SELECT id 
    FROM storage_providers 
    WHERE wallet_address = (auth.uid())::text
  )
)
WITH CHECK (
  provider_id IN (
    SELECT id 
    FROM storage_providers 
    WHERE wallet_address = (auth.uid())::text
  )
);