/*
  # Update Database Schema with Existence Checks
  
  1. Changes
    - Add IF NOT EXISTS checks for all table creations
    - Add DROP IF EXISTS for all policies and triggers
    - Maintain all existing functionality
*/

-- Create storage_providers table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    wallet_address text NOT NULL UNIQUE,
    available_storage bigint NOT NULL DEFAULT 0,
    price_per_gb numeric NOT NULL DEFAULT 0,
    ipfs_node_id text NOT NULL,
    is_active boolean NOT NULL DEFAULT false,
    ipfs_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    health_status text DEFAULT 'offline',
    last_health_check timestamptz DEFAULT now(),
    uptime_percentage numeric DEFAULT 100.0,
    total_storage_used bigint DEFAULT 0,
    total_bandwidth_used bigint DEFAULT 0
);

-- Create storage_allocations table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address text NOT NULL,
    provider_id uuid REFERENCES storage_providers(id) ON DELETE CASCADE,
    allocated_gb numeric NOT NULL,
    paid_amount numeric NOT NULL,
    transaction_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create stored_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS stored_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address text NOT NULL,
    provider_id uuid REFERENCES storage_providers(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    ipfs_cid text,
    mime_type text NOT NULL,
    encrypted_key text,
    upload_status text DEFAULT 'pending' CHECK (upload_status IN ('pending', 'complete')),
    created_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stored_files_user_address') THEN
        CREATE INDEX idx_stored_files_user_address ON stored_files(user_address);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stored_files_provider_id') THEN
        CREATE INDEX idx_stored_files_provider_id ON stored_files(provider_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_allocations_user_address') THEN
        CREATE INDEX idx_storage_allocations_user_address ON storage_allocations(user_address);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_storage_providers_wallet_address') THEN
        CREATE INDEX idx_storage_providers_wallet_address ON storage_providers(wallet_address);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE storage_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Anyone can view storage providers" ON storage_providers;
DROP POLICY IF EXISTS "Users can view their own storage allocations" ON storage_allocations;
DROP POLICY IF EXISTS "Users can create their own storage allocations" ON storage_allocations;
DROP POLICY IF EXISTS "Users can view their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can upload their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can update their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON stored_files;

-- Create policies
CREATE POLICY "Anyone can view storage providers"
    ON storage_providers FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can view their own storage allocations"
    ON storage_allocations FOR SELECT
    TO public
    USING (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    );

CREATE POLICY "Users can create their own storage allocations"
    ON storage_allocations FOR INSERT
    TO public
    WITH CHECK (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    );

CREATE POLICY "Users can view their own files"
    ON stored_files FOR SELECT
    TO public
    USING (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    );

CREATE POLICY "Users can upload their own files"
    ON stored_files FOR INSERT
    TO public
    WITH CHECK (
        user_address IS NOT NULL AND
        provider_id IS NOT NULL AND
        file_name IS NOT NULL AND
        file_size IS NOT NULL AND
        mime_type IS NOT NULL AND
        (
            LOWER(user_address) = LOWER(current_user) OR
            current_user = 'authenticated'
        )
    );

CREATE POLICY "Users can update their own files"
    ON stored_files FOR UPDATE
    TO public
    USING (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    )
    WITH CHECK (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    );

CREATE POLICY "Users can delete their own files"
    ON stored_files FOR DELETE
    TO public
    USING (
        LOWER(user_address) = LOWER(current_user) OR
        current_user = 'authenticated'
    );

-- Create or replace helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION validate_file_size()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.file_size <= 0 THEN
        RAISE EXCEPTION 'File size must be greater than 0';
    END IF;
    
    IF NEW.upload_status = 'pending' THEN
        RETURN NEW;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'File size validation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_storage_allocation()
RETURNS TRIGGER AS $$
DECLARE
    allocated_storage numeric;
    used_storage numeric;
BEGIN
    SELECT COALESCE(SUM(allocated_gb), 0) * 1024 * 1024 * 1024 INTO allocated_storage
    FROM storage_allocations
    WHERE LOWER(user_address) = LOWER(NEW.user_address)
    AND expires_at > NOW();

    IF allocated_storage = 0 THEN
        RAISE EXCEPTION 'No active storage allocation found';
    END IF;

    SELECT COALESCE(SUM(file_size), 0) INTO used_storage
    FROM stored_files
    WHERE LOWER(user_address) = LOWER(NEW.user_address)
    AND upload_status = 'complete';

    IF used_storage + NEW.file_size > allocated_storage THEN
        RAISE EXCEPTION 'Storage allocation exceeded. Available: %, Required: %', 
            (allocated_storage - used_storage), NEW.file_size;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Storage allocation check failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before recreating
DROP TRIGGER IF EXISTS update_storage_providers_updated_at ON storage_providers;
DROP TRIGGER IF EXISTS validate_file_size_trigger ON stored_files;
DROP TRIGGER IF EXISTS check_storage_allocation_trigger ON stored_files;

-- Create triggers
CREATE TRIGGER update_storage_providers_updated_at
    BEFORE UPDATE ON storage_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_file_size_trigger
    BEFORE INSERT OR UPDATE ON stored_files
    FOR EACH ROW
    EXECUTE FUNCTION validate_file_size();

CREATE TRIGGER check_storage_allocation_trigger
    BEFORE INSERT ON stored_files
    FOR EACH ROW
    EXECUTE FUNCTION check_storage_allocation();

-- Insert test provider
INSERT INTO storage_providers (
    name,
    wallet_address,
    available_storage,
    price_per_gb,
    ipfs_node_id,
    is_active,
    ipfs_url,
    health_status
) VALUES (
    'Test Provider',
    '0x5DC1612cca4E375e825b7f3EcD7B6725E3D4aDCB',
    1000,
    1.5,
    'QmTest123',
    true,
    'http://localhost:5001',
    'online'
) ON CONFLICT (wallet_address) DO NOTHING;