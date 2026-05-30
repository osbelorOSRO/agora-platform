CREATE TYPE "lead_age_range" AS ENUM (
    'NO_DEFINIDO',
    'RANGO_18_24',
    'RANGO_25_34',
    'RANGO_35_44',
    'RANGO_45_54',
    'RANGO_55_64',
    'RANGO_65_PLUS'
);

CREATE TYPE "lead_sex" AS ENUM (
    'NO_IDENTIFICADO',
    'MASCULINO',
    'FEMENINO'
);

CREATE TYPE "lead_customer_type" AS ENUM (
    'NO_DEFINIDO',
    'AUTONOMO',
    'ASISTIDO',
    'ABANDONO_BOT',
    'DIRECTO'
);

CREATE TYPE "lead_purchase_intent" AS ENUM (
    'NO_DEFINIDO',
    'LINEA_NUEVA',
    'PORTABILIDAD'
);

CREATE TYPE "lead_result" AS ENUM (
    'EN_PROCESO',
    'GANADO',
    'PERDIDO'
);

CREATE TYPE "lead_sale_type" AS ENUM (
    'NO_DEFINIDO',
    'PORTABILIDAD_POSTPAGO',
    'PORTABILIDAD_PREPAGO',
    'ALTA',
    'SALTA'
);

CREATE TYPE "lead_loss_reason" AS ENUM (
    'NO_CALIFICO_SCORE',
    'NUMERO_NO_PORTABLE',
    'PRECIO_NO_CONVENCIO',
    'DECIDIO_NO_CONTRATAR',
    'NO_RESPONDIO_MAS',
    'DERIVADO_TIENDA_FISICA',
    'OTRO'
);

CREATE TYPE "lead_type" AS ENUM (
    'DESCONOCIDO',
    'LEAD',
    'ORGANICO'
);

CREATE TABLE "lead_sales_analysis" (
    "id"                 UUID                    NOT NULL DEFAULT gen_random_uuid(),
    "session_id"         VARCHAR(255)            NOT NULL,
    "lead_type"          "lead_type"             NOT NULL DEFAULT 'DESCONOCIDO',
    "age_range"          "lead_age_range"        NOT NULL DEFAULT 'NO_DEFINIDO',
    "sex"                "lead_sex"              NOT NULL DEFAULT 'NO_IDENTIFICADO',
    "customer_type"      "lead_customer_type"    NOT NULL DEFAULT 'NO_DEFINIDO',
    "purchase_intent"    "lead_purchase_intent"  NOT NULL DEFAULT 'NO_DEFINIDO',
    "result"             "lead_result"           NOT NULL DEFAULT 'EN_PROCESO',
    "plan_contracted"    VARCHAR,
    "sale_type"          "lead_sale_type",
    "loss_reason"        "lead_loss_reason",
    "verbalization_tags" TEXT[]                  NOT NULL DEFAULT '{}',
    "verbalization_text" TEXT,
    "created_at"         TIMESTAMPTZ(6)          NOT NULL DEFAULT now(),
    "updated_at"         TIMESTAMPTZ(6),

    CONSTRAINT "lead_sales_analysis_pkey"           PRIMARY KEY ("id"),
    CONSTRAINT "lead_sales_analysis_session_id_key" UNIQUE ("session_id"),
    CONSTRAINT "lead_sales_analysis_plan_fk"        FOREIGN KEY ("plan_contracted")
        REFERENCES "precios_planes"("codigo") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_lead_sales_analysis_session"
    ON "lead_sales_analysis"("session_id");

CREATE INDEX "idx_lead_sales_analysis_result"
    ON "lead_sales_analysis"("result");

CREATE INDEX "idx_lead_sales_analysis_lead_type"
    ON "lead_sales_analysis"("lead_type");
