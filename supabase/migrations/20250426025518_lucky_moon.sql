/*
  # Update provider files handling
  
  1. Changes
    - Add encryption_key column to provider_dummy_files
    - Add original_file_id column to track source file
    - Update RLS policies
*/

-- Add new columns to provider_dummy_files
ALTER TABLE provider_dummy_files 
ADD COLUMN IF NOT EXISTS encryption_key text,
ADD COLUMN IF NOT EXISTS original_file_id uuid REFERENCES stored_files(id) ON DELETE CASCADE;

-- Update RLS policies
DROP POLICY IF EXISTS "Providers can view their dummy files" ON provider_dummy_files;

CREATE POLICY "Providers can view and manage their dummy files"
ON provider_dummy_files
FOR ALL
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM storage_providers 
    WHERE wallet_address = current_user
  )
)
WITH CHECK (
  provider_id IN (
    SELECT id FROM storage_providers 
    WHERE wallet_address = current_user
  )
);

-- Function to create dummy file record when file is uploaded
CREATE OR REPLACE FUNCTION create_provider_dummy_file()
RETURNS TRIGGER AS $$
DECLARE
  provider_record RECORD;
BEGIN
  -- Find online provider with allocation for the user
  SELECT sp.* INTO provider_record
  FROM storage_providers sp
  JOIN storage_allocations sa ON sa.provider_id = sp.id
  WHERE sa.user_address = NEW.user_address
    AND sa.expires_at > now()
    AND sp.is_active = true
    AND sp.updated_at > (now() - interval '30 seconds');

  -- If we found an online provider, create dummy file
  IF FOUND THEN
    INSERT INTO provider_dummy_files (
      provider_id,
      allocation_id,
      file_name,
      file_size,
      dummy_path,
      encryption_key,
      original_file_id
    )
    VALUES (
      provider_record.id,
      (SELECT id FROM storage_allocations 
       WHERE provider_id = provider_record.id 
       AND user_address = NEW.user_address
       AND expires_at > now()
       LIMIT 1),
      NEW.file_name || '.encrypted',
      NEW.file_size,
      '/storage/' || NEW.id || '.encrypted',
      encode(gen_random_bytes(32), 'hex'),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dummy file creation
DROP TRIGGER IF EXISTS create_dummy_file_trigger ON stored_files;
CREATE TRIGGER create_dummy_file_trigger
    AFTER INSERT ON stored_files
    FOR EACH ROW
    WHEN (NEW.upload_status = 'complete')
    EXECUTE FUNCTION create_provider_dummy_file();