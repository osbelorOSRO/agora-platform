-- Tabla singleton para configuración Meta/Facebook Developer App
-- Ejecutar manualmente en la DB antes de hacer rebuild del backend
CREATE TABLE IF NOT EXISTS meta_app_config (
  id                     INTEGER PRIMARY KEY DEFAULT 1,
  app_id                 TEXT,
  app_secret             TEXT,
  display_name           TEXT,
  namespace              TEXT,
  app_domains            TEXT,
  contact_email          TEXT,
  privacy_policy_url     TEXT,
  terms_of_service_url   TEXT,
  meta_verify_token      TEXT,
  meta_page_access_token TEXT,
  meta_ig_verify_token   TEXT,
  meta_ig_access_token   TEXT,
  admin_access_token     TEXT,
  updated_at             TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
