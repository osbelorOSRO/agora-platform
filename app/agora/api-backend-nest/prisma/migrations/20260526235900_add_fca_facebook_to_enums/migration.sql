-- Add FCA to provider_type and FACEBOOK to meta_object_type.
-- Direct pg_enum insert is used instead of ALTER TYPE ADD VALUE because
-- ALTER TYPE ADD VALUE cannot run inside a transaction (Prisma wraps migrations in BEGIN/COMMIT).
INSERT INTO pg_enum (enumtypid, enumlabel, enumsortorder)
SELECT t.oid,
       'FCA',
       COALESCE((SELECT MAX(enumsortorder) FROM pg_enum WHERE enumtypid = t.oid), 0) + 1
FROM pg_type t
WHERE t.typname = 'provider_type' AND t.typcategory = 'E'
ON CONFLICT DO NOTHING;

INSERT INTO pg_enum (enumtypid, enumlabel, enumsortorder)
SELECT t.oid,
       'FACEBOOK',
       COALESCE((SELECT MAX(enumsortorder) FROM pg_enum WHERE enumtypid = t.oid), 0) + 1
FROM pg_type t
WHERE t.typname = 'meta_object_type' AND t.typcategory = 'E'
ON CONFLICT DO NOTHING;
