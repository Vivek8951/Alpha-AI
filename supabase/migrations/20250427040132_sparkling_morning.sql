/*
  # Update dummy file creation system
  
  1. Changes
    - Improve dummy file naming
    - Add automatic encryption key generation
    - Add received_at timestamp
*/

-- Update dummy file creation function
CREATE OR REPLACE FUNCTION create_provider_dummy_file()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key text;
  provider_id uuid;
  timestamp_str text;
BEGIN
  -- Generate encryption key
  encryption_key := encode(gen_random_bytes(32), 'hex');
  
  -- Generate timestamp string
  timestamp_str := to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');

  -- Get provider ID from storage allocation
  SELECT sa.provider_id INTO provider_id
  FROM storage_allocations sa
  WHERE sa.user_address = NEW.user_address
    AND sa.expires_at > now()
  ORDER BY sa.created_at DESC
  LIMIT 1;

  IF provider_id IS NOT NULL THEN
    -- Insert dummy file record with generic name
    INSERT INTO provider_dummy_files (
      provider_id,
      allocation_id,
      file_name,
      file_size,
      dummy_path,
      encryption_key,
      original_file_id,
      received_at
    )
    SELECT 
      provider_id,
      sa.id,
      'received_file_' || timestamp_str || '.encrypted',
      NEW.file_size,
      '/storage/received_file_' || timestamp_str || '.encrypted',
      encryption_key,
      NEW.id,
      now()
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

-- Update trigger
DROP TRIGGER IF EXISTS create_dummy_file_trigger ON stored_files;
CREATE TRIGGER create_dummy_file_trigger
  AFTER INSERT ON stored_files
  FOR EACH ROW
  WHEN (NEW.upload_status = 'complete')
  EXECUTE FUNCTION create_provider_dummy_file();