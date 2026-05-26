-- CreateEnum
CREATE TYPE "offer_modality" AS ENUM ('POST_A_POST', 'SALTA', 'PRE_A_POST', 'ALTA');

-- CreateTable: catálogo de ofertas
CREATE TABLE "offers" (
    "id"       SERIAL NOT NULL,
    "code"     VARCHAR(20) NOT NULL,
    "modality" "offer_modality" NOT NULL,
    "level"    INTEGER NOT NULL,
    "points"   DECIMAL(3,1) NOT NULL,
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offers_level_check" CHECK (level >= 1 AND level <= 9),
    CONSTRAINT "offers_points_check" CHECK (points >= 0 AND points <= 3)
);

CREATE UNIQUE INDEX "offers_code_modality_key" ON "offers"("code", "modality");

-- CreateTable: matriz de precios
CREATE TABLE "price_level" (
    "id"    SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "range" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "price_level_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "price_level_level_check" CHECK (level >= 1 AND level <= 9),
    CONSTRAINT "price_level_range_check" CHECK ("range" >= 1 AND "range" <= 3)
);

CREATE UNIQUE INDEX "price_level_level_range_key" ON "price_level"("level", "range");

-- CreateTable: acumulado mensual de puntos
CREATE TABLE "points_level" (
    "id"           SERIAL NOT NULL,
    "year"         SMALLINT NOT NULL,
    "month"        SMALLINT NOT NULL,
    "total_points" DECIMAL(8,1) NOT NULL DEFAULT 0,
    CONSTRAINT "points_level_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "points_level_month_check" CHECK (month >= 1 AND month <= 12),
    CONSTRAINT "points_level_total_check" CHECK (total_points >= 0)
);

CREATE UNIQUE INDEX "points_level_year_month_key" ON "points_level"("year", "month");

-- CreateTable: ventas manuales
CREATE TABLE "sales_record" (
    "id"              SERIAL NOT NULL,
    "fecha"           DATE NOT NULL,
    "run"             VARCHAR(12) NOT NULL,
    "full_name"       VARCHAR(200) NOT NULL,
    "phone"           VARCHAR(30) NOT NULL,
    "address"         VARCHAR(300) NOT NULL,
    "city"            VARCHAR(100) NOT NULL,
    "province"        VARCHAR(100) NOT NULL,
    "country"         VARCHAR(100) NOT NULL,
    "contract_number" VARCHAR(100) NOT NULL,
    "modality"        "offer_modality" NOT NULL,
    "offers_code"     VARCHAR(20) NOT NULL,
    "offer_id"        INTEGER NOT NULL,
    "level_price"     INTEGER NOT NULL,
    "points"          DECIMAL(3,1) NOT NULL,
    "offers_price"    INTEGER NOT NULL,
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_record_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_record_level_check" CHECK (level_price >= 1 AND level_price <= 9)
);

CREATE INDEX "idx_sale_record_fecha" ON "sales_record"("fecha" DESC);
CREATE INDEX "idx_sale_record_offer" ON "sales_record"("offer_id");

-- AddForeignKey
ALTER TABLE "sales_record" ADD CONSTRAINT "sales_record_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
