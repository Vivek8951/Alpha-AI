/*
  # Fix column references for provider queries
  
  1. Changes
    - Add user_address column to storage_allocations if not exists
    - Fix provider_id references in provider_dummy_files
    - Update existing triggers and functions
*/

-- Add user_address column to storage_allocations if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'storage_allocations' 
    AND column_name = 'user_address'
  ) THEN
    ALTER TABLE storage_allocations ADD COLUMN user_address text NOT NULL;
  END IF;
END $$;

-- Create index on user_address if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'storage_allocations' 
    AND indexname = 'idx_storage_allocations_user_address'
  ) THEN
    CREATE INDEX idx_storage_allocations_user_address ON storage_allocations(user_address);
  END IF;
END $$;

-- Update provider_dummy_files queries
CREATE OR REPLACE FUNCTION create_provider_dummy_file()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key text;
  provider_id uuid;
BEGIN
  -- Generate encryption key
  encryption_key := encode(gen_random_bytes(32), 'hex');

  -- Get provider ID from storage allocation
  SELECT sa.provider_id INTO provider_id
  FROM storage_allocations sa
  WHERE sa.user_address = NEW.user_address
    AND sa.expires_at > now()
  ORDER BY sa.created_at DESC
  LIMIT 1;

  IF provider_id IS NOT NULL THEN
    -- Insert dummy file record
    INSERT INTO provider_dummy_files (
      provider_id,
      allocation_id,
      file_name,
      file_size,
      dummy_path,
      encryption_key,
      original_file_id
    )
    SELECT 
      provider_id,
      sa.id,
      NEW.file_name || '.encrypted',
      NEW.file_size,
      '/storage/' || NEW.id || '.encrypted',
      encryption_key,
      NEW.id
    FROM storage_allocations sa
    WHERE sa.provider_id = provider_id
      AND sa.user_address = NEW.user_address
      AND sa.expires_at > now()
    ORDER BY sa.created_at DESC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing triggers
DROP TRIGGER IF EXISTS create_dummy_file_trigger ON stored_files;
CREATE TRIGGER create_dummy_file_trigger
  AFTER INSERT ON stored_files
  FOR EACH ROW
  WHEN (NEW.upload_status = 'complete')
  EXECUTE FUNCTION create_provider_dummy_file();