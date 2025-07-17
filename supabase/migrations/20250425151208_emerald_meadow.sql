/*
  # Update stored_files schema for Pinata integration
  
  1. Changes
    - Remove provider_id column and related constraints
    - Update RLS policies to work without provider dependency
    - Remove storage allocation checks
    - Fix RLS policies to allow authenticated users to create files
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
    TO authenticated
    USING (
        LOWER(user_address) = LOWER(auth.uid()::text)
    );

CREATE POLICY "Users can upload their own files"
    ON stored_files FOR INSERT
    TO authenticated
    WITH CHECK (
        user_address IS NOT NULL AND
        file_name IS NOT NULL AND
        file_size IS NOT NULL AND
        mime_type IS NOT NULL AND
        LOWER(user_address) = LOWER(auth.uid()::text)
    );

CREATE POLICY "Users can update their own files"
    ON stored_files FOR UPDATE
    TO authenticated
    USING (
        LOWER(user_address) = LOWER(auth.uid()::text)
    )
    WITH CHECK (
        LOWER(user_address) = LOWER(auth.uid()::text)
    );

CREATE POLICY "Users can delete their own files"
    ON stored_files FOR DELETE
    TO authenticated
    USING (
        LOWER(user_address) = LOWER(auth.uid()::text)
    );