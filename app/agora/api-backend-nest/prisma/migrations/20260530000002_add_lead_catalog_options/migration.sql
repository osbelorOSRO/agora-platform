-- Tabla de catálogo editable para listas de opciones del formulario de ventas
CREATE TABLE "lead_catalog_options" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "category"   VARCHAR(64)    NOT NULL,
    "value"      VARCHAR(128)   NOT NULL,
    "label"      VARCHAR(255)   NOT NULL,
    "sort_order" INTEGER        NOT NULL DEFAULT 0,
    "active"     BOOLEAN        NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "lead_catalog_options_pkey"           PRIMARY KEY ("id"),
    CONSTRAINT "lead_catalog_options_category_value" UNIQUE ("category", "value")
);

CREATE INDEX "idx_lead_catalog_options_category_active"
    ON "lead_catalog_options"("category", "active", "sort_order");

-- Quitar defaults ligados a enums antes de cambiar el tipo
ALTER TABLE "lead_sales_analysis"
    ALTER COLUMN "customer_type"   DROP DEFAULT,
    ALTER COLUMN "purchase_intent" DROP DEFAULT,
    ALTER COLUMN "sale_type"       DROP DEFAULT,
    ALTER COLUMN "loss_reason"     DROP DEFAULT;

-- Cambiar columnas de enum a varchar (tablas vacías, sin datos que migrar)
ALTER TABLE "lead_sales_analysis"
    ALTER COLUMN "customer_type"   TYPE VARCHAR(128) USING customer_type::text,
    ALTER COLUMN "purchase_intent" TYPE VARCHAR(128) USING purchase_intent::text,
    ALTER COLUMN "sale_type"       TYPE VARCHAR(128) USING sale_type::text,
    ALTER COLUMN "loss_reason"     TYPE VARCHAR(128) USING loss_reason::text;

-- Restaurar defaults como strings
ALTER TABLE "lead_sales_analysis"
    ALTER COLUMN "customer_type"   SET DEFAULT 'NO_DEFINIDO',
    ALTER COLUMN "purchase_intent" SET DEFAULT 'NO_DEFINIDO';

-- Eliminar enums reemplazados por catálogo
DROP TYPE "lead_customer_type";
DROP TYPE "lead_purchase_intent";
DROP TYPE "lead_sale_type";
DROP TYPE "lead_loss_reason";

-- Datos iniciales — customer_type
INSERT INTO "lead_catalog_options" (category, value, label, sort_order) VALUES
    ('customer_type', 'NO_DEFINIDO',   'Sin definir',       0),
    ('customer_type', 'AUTONOMO',      'Autónomo',          1),
    ('customer_type', 'ASISTIDO',      'Asistido',          2),
    ('customer_type', 'ABANDONO_BOT',  'Abandonó bot',      3),
    ('customer_type', 'DIRECTO',       'Directo',           4);

-- Datos iniciales — purchase_intent
INSERT INTO "lead_catalog_options" (category, value, label, sort_order) VALUES
    ('purchase_intent', 'NO_DEFINIDO',  'Sin definir',   0),
    ('purchase_intent', 'LINEA_NUEVA',  'Línea nueva',   1),
    ('purchase_intent', 'PORTABILIDAD', 'Portabilidad',  2);

-- Datos iniciales — sale_type (modalidad)
INSERT INTO "lead_catalog_options" (category, value, label, sort_order) VALUES
    ('sale_type', 'NO_DEFINIDO',           'Sin definir',              0),
    ('sale_type', 'PORTABILIDAD_POSTPAGO', 'Portabilidad postpago',    1),
    ('sale_type', 'PORTABILIDAD_PREPAGO',  'Portabilidad prepago',     2),
    ('sale_type', 'ALTA',                  'Alta',                     3),
    ('sale_type', 'SALTA',                 'Salta',                    4);

-- Datos iniciales — loss_reason
INSERT INTO "lead_catalog_options" (category, value, label, sort_order) VALUES
    ('loss_reason', 'NO_CALIFICO_SCORE',      'No calificó score Movistar',  1),
    ('loss_reason', 'NUMERO_NO_PORTABLE',     'Número no portable',          2),
    ('loss_reason', 'PRECIO_NO_CONVENCIO',    'Precio no convenció',         3),
    ('loss_reason', 'DECIDIO_NO_CONTRATAR',   'Decidió no contratar',        4),
    ('loss_reason', 'NO_RESPONDIO_MAS',       'No respondió más',            5),
    ('loss_reason', 'DERIVADO_TIENDA_FISICA', 'Derivado a tienda física',    6),
    ('loss_reason', 'OTRO',                   'Otro',                        7);

-- Datos iniciales — verbalization_tag
INSERT INTO "lead_catalog_options" (category, value, label, sort_order) VALUES
    ('verbalization_tag', 'objecion_precio',         'Objeción de precio',          1),
    ('verbalization_tag', 'duda_tecnica',             'Duda técnica',                2),
    ('verbalization_tag', 'comparacion_competencia',  'Comparación con competencia', 3),
    ('verbalization_tag', 'frase_cierre',             'Frase de cierre',             4),
    ('verbalization_tag', 'frase_abandono',           'Frase de abandono',           5),
    ('verbalization_tag', 'elogio_servicio',          'Elogio del servicio',         6),
    ('verbalization_tag', 'confusion_proceso',        'Confusión con el proceso',    7),
    ('verbalization_tag', 'pregunta_frecuente',       'Pregunta frecuente',          8);
