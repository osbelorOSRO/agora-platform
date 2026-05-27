-- Add FCA to provider_type and FACEBOOK to meta_object_type.
-- Uses DO $$ blocks to safely skip if value already exists.
-- ON CONFLICT is not supported on system catalog tables (pg_enum).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'provider_type' AND e.enumlabel = 'FCA'
  ) THEN
    INSERT INTO pg_enum (enumtypid, enumlabel, enumsortorder)
    SELECT t.oid,
           'FCA',
           COALESCE((SELECT MAX(enumsortorder) FROM pg_enum WHERE enumtypid = t.oid), 0) + 1
    FROM pg_type t
    WHERE t.typname = 'provider_type' AND t.typcategory = 'E';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'meta_object_type' AND e.enumlabel = 'FACEBOOK'
  ) THEN
    INSERT INTO pg_enum (enumtypid, enumlabel, enumsortorder)
    SELECT t.oid,
           'FACEBOOK',
           COALESCE((SELECT MAX(enumsortorder) FROM pg_enum WHERE enumtypid = t.oid), 0) + 1
    FROM pg_type t
    WHERE t.typname = 'meta_object_type' AND t.typcategory = 'E';
  END IF;
END $$;
