/*
  # Update storage allocations and add provider validation system
  
  1. Changes
    - Add used_gb column to storage_allocations
    - Add trigger to update used_gb when files are added/removed
    - Add provider_dummy_files table for provider storage validation
    
  2. Security
    - Enable RLS on new table
    - Add appropriate policies
*/

-- Add used_gb column if it doesn't exist
ALTER TABLE storage_allocations 
ADD COLUMN IF NOT EXISTS used_gb numeric NOT NULL DEFAULT 0;

-- Create table for provider dummy files
CREATE TABLE IF NOT EXISTS provider_dummy_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES storage_providers(id) ON DELETE CASCADE,
    allocation_id uuid REFERENCES storage_allocations(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    dummy_path text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE provider_dummy_files ENABLE ROW LEVEL SECURITY;

-- Create policy for providers to view their dummy files
CREATE POLICY "Providers can view their dummy files"
    ON provider_dummy_files
    FOR SELECT
    TO authenticated
    USING (
        provider_id IN (
            SELECT id FROM storage_providers 
            WHERE wallet_address = current_user
        )
    );

-- Function to update storage allocation usage
CREATE OR REPLACE FUNCTION update_storage_allocation_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.upload_status = 'complete' THEN
        -- Update used_gb when a new file is completed
        UPDATE storage_allocations
        SET used_gb = used_gb + (NEW.file_size::numeric / (1024*1024*1024))
        WHERE user_address = NEW.user_address
        AND expires_at > now();
    ELSIF TG_OP = 'DELETE' AND OLD.upload_status = 'complete' THEN
        -- Decrease used_gb when a file is deleted
        UPDATE storage_allocations
        SET used_gb = GREATEST(0, used_gb - (OLD.file_size::numeric / (1024*1024*1024)))
        WHERE user_address = OLD.user_address
        AND expires_at > now();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating storage usage
DROP TRIGGER IF EXISTS update_storage_usage_trigger ON stored_files;
CREATE TRIGGER update_storage_usage_trigger
    AFTER INSERT OR DELETE ON stored_files
    FOR EACH ROW
    EXECUTE FUNCTION update_storage_allocation_usage();

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