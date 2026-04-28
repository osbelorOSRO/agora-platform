-- Amplia meta_inbox_contacts para usarla como perfil de contacto comun
-- entre Meta Inbox y Baileys.
--
-- Aplicar manualmente en la base Postgres usada por api-backend-nest.

ALTER TABLE meta_inbox_contacts
  ADD COLUMN IF NOT EXISTS first_name varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS last_name varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS rut varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS address varchar(250) NULL,
  ADD COLUMN IF NOT EXISTS region varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Validacion rapida.
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'meta_inbox_contacts'
  AND column_name IN ('first_name', 'last_name', 'rut', 'address', 'region', 'metadata')
ORDER BY column_name;
