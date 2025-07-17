/*
  # Fix provider storage and RLS policies

  1. Changes
    - Add trigger to update provider storage on allocation
    - Fix RLS policies for provider_dummy_files
    - Add proper type casting for wallet address comparison
*/

-- Enable RLS on the table
ALTER TABLE provider_dummy_files ENABLE ROW LEVEL SECURITY;

-- Create function to update provider storage
CREATE OR REPLACE FUNCTION update_provider_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update provider's available storage when allocation is created
  UPDATE storage_providers
  SET available_storage = available_storage - NEW.allocated_gb
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating provider storage
DROP TRIGGER IF EXISTS update_provider_storage_trigger ON storage_allocations;
CREATE TRIGGER update_provider_storage_trigger
  AFTER INSERT ON storage_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_storage();

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Allow trigger operations on provider_dummy_files" ON provider_dummy_files;
DROP POLICY IF EXISTS "Providers can manage their own dummy files" ON provider_dummy_files;
DROP POLICY IF EXISTS "Providers can view and manage their dummy files" ON provider_dummy_files;

-- Policy for trigger-based operations
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
    WHERE LOWER(wallet_address) = LOWER((auth.uid())::text)
  )
)
WITH CHECK (
  provider_id IN (
    SELECT id 
    FROM storage_providers 
    WHERE LOWER(wallet_address) = LOWER((auth.uid())::text)
  )
);

-- Update existing provider storage based on allocations
UPDATE storage_providers sp
SET available_storage = sp.available_storage - COALESCE(
  (SELECT SUM(allocated_gb)
   FROM storage_allocations sa
   WHERE sa.provider_id = sp.id
   AND sa.expires_at > NOW()),
  0
);