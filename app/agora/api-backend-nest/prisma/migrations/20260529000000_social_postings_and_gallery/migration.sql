-- AlterTable: agregar fanpage_id a meta_app_config
ALTER TABLE "meta_app_config" ADD COLUMN IF NOT EXISTS "fanpage_id" TEXT;

-- CreateTable: galeria_imagenes_ofertas
CREATE TABLE "galeria_imagenes_ofertas" (
    "id"         SERIAL PRIMARY KEY,
    "nombre"     TEXT NOT NULL,
    "url"        TEXT NOT NULL,
    "bucket"     TEXT NOT NULL DEFAULT 'ofertas',
    "mime_type"  TEXT,
    "size_bytes" INTEGER,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateTable: posteos_programados
CREATE TABLE "posteos_programados" (
    "id"            SERIAL PRIMARY KEY,
    "fecha"         DATE NOT NULL,
    "caption"       TEXT,
    "url_imagen"    TEXT,
    "imagen_id"     INTEGER,
    "estado"        TEXT NOT NULL DEFAULT 'pendiente',
    "red_social"    TEXT NOT NULL DEFAULT 'FANPAGE',
    "id_red_social" TEXT,
    "id_post"       TEXT,
    "raw"           JSONB,
    "deleted_at"    TIMESTAMPTZ,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CreateIndex
CREATE INDEX "idx_posteos_programados_fecha" ON "posteos_programados"("fecha");
CREATE INDEX "idx_posteos_programados_estado_fecha" ON "posteos_programados"("estado", "fecha");
