-- disable_transactions
-- ALTER TYPE ADD VALUE cannot run inside a transaction on PostgreSQL < 12.
-- IF NOT EXISTS makes this idempotent (safe to re-run).
ALTER TYPE "provider_type" ADD VALUE IF NOT EXISTS 'FCA';
ALTER TYPE "meta_object_type" ADD VALUE IF NOT EXISTS 'FACEBOOK';
