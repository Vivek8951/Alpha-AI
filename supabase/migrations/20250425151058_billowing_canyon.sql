/*
  # Update stored_files schema for Pinata integration
  
  1. Changes
    - Remove provider_id column and related constraints
    - Update RLS policies to work without provider dependency
    - Remove storage allocation checks
*/

-- Drop existing policies first to remove dependencies
DROP POLICY IF EXISTS "Users can view their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can upload their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can update their own files" ON stored_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON stored_files;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS check_storage_allocation_trigger ON stored_files;
DROP FUNCTION IF EXISTS check_storage_allocation;

-- Now we can safely remove the provider_id column
ALTER TABLE stored_files DROP COLUMN IF EXISTS provider_id;

-- Create updated policies without provider dependency
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