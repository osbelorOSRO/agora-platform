-- Habilita Baileys/WhatsApp como provider/object_type del pipeline conversacional.
-- Aplicar manualmente en la base Postgres usada por api-backend-nest.

ALTER TYPE provider_type ADD VALUE IF NOT EXISTS 'BAILEYS';
ALTER TYPE meta_object_type ADD VALUE IF NOT EXISTS 'WHATSAPP';

-- Validacion rapida.
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'provider_type'::regtype
ORDER BY enumsortorder;

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'meta_object_type'::regtype
ORDER BY enumsortorder;
