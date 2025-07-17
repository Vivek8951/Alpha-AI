/*
  # Add provider validations table

  1. New Tables
    - `provider_validations`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references storage_providers)
      - `file_hash` (text)
      - `validation_key` (text)
      - `original_name` (text)
      - `original_size` (bigint)
      - `dummy_size` (bigint)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for providers to read their own validations
*/

CREATE TABLE IF NOT EXISTS provider_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES storage_providers(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  validation_key text NOT NULL,
  original_name text NOT NULL,
  original_size bigint NOT NULL,
  dummy_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can read their own validations"
  ON provider_validations
  FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM storage_providers 
    WHERE wallet_address = current_user
  ));