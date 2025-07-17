/*
  # Update storage system for automatic dummy file creation
  
  1. Changes
    - Fix syntax error in update_storage_allocation_usage function
    - Add proper subquery handling for ORDER BY
    - Add encryption key handling for dummy files
*/

-- Create or replace function to handle dummy file creation
CREATE OR REPLACE FUNCTION create_provider_dummy_file()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Generate encryption key
  encryption_key := encode(gen_random_bytes(32), 'hex');

  -- Find provider with allocation for the user
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
    sa.provider_id,
    sa.id,
    NEW.file_name || '.encrypted',
    NEW.file_size,
    '/storage/' || NEW.id || '.encrypted',
    encryption_key,
    NEW.id
  FROM storage_allocations sa
  WHERE sa.user_address = NEW.user_address
    AND sa.expires_at > now()
  ORDER BY sa.created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update storage allocation usage
CREATE OR REPLACE FUNCTION update_storage_allocation_usage()
RETURNS TRIGGER AS $$
DECLARE
  target_allocation_id uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.upload_status = 'complete' THEN
    -- Get the most recent allocation ID
    SELECT id INTO target_allocation_id
    FROM storage_allocations
    WHERE user_address = NEW.user_address
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update used_gb when a new file is completed
    IF target_allocation_id IS NOT NULL THEN
      UPDATE storage_allocations
      SET used_gb = used_gb + (NEW.file_size::numeric / (1024*1024*1024))
      WHERE id = target_allocation_id;
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.upload_status = 'complete' THEN
    -- Get the most recent allocation ID
    SELECT id INTO target_allocation_id
    FROM storage_allocations
    WHERE user_address = OLD.user_address
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Decrease used_gb when a file is deleted
    IF target_allocation_id IS NOT NULL THEN
      UPDATE storage_allocations
      SET used_gb = GREATEST(0, used_gb - (OLD.file_size::numeric / (1024*1024*1024)))
      WHERE id = target_allocation_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update provider storage
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

-- Drop existing triggers
DROP TRIGGER IF EXISTS create_dummy_file_trigger ON stored_files;
DROP TRIGGER IF EXISTS update_storage_usage_trigger ON stored_files;
DROP TRIGGER IF EXISTS update_provider_storage_trigger ON storage_allocations;

-- Create triggers
CREATE TRIGGER create_dummy_file_trigger
  AFTER INSERT ON stored_files
  FOR EACH ROW
  WHEN (NEW.upload_status = 'complete')
  EXECUTE FUNCTION create_provider_dummy_file();

CREATE TRIGGER update_storage_usage_trigger
  AFTER INSERT OR DELETE ON stored_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_allocation_usage();

CREATE TRIGGER update_provider_storage_trigger
  AFTER INSERT ON storage_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_storage();

-- Update existing storage allocations with correct usage
UPDATE storage_allocations sa
SET used_gb = COALESCE(
  (
    SELECT SUM(file_size::numeric / (1024*1024*1024))
    FROM stored_files sf
    WHERE sf.user_address = sa.user_address
    AND sf.upload_status = 'complete'
  ),
  0
);