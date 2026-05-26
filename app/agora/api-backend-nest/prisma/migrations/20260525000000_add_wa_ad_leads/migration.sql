-- CreateTable
CREATE TABLE "wa_ad_leads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_id" TEXT,
    "session_id" VARCHAR,
    "actor_external_id" VARCHAR,
    "pn_jid" VARCHAR,
    "lid_jid" VARCHAR,
    "source_url" TEXT,
    "title" TEXT,
    "thumbnail_url" TEXT,
    "original_image_url" TEXT,
    "first_message_text" TEXT,
    "metadata" JSONB,
    "first_seen_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "seen_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "wa_ad_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_wa_ad_leads_source_seen" ON "wa_ad_leads"("source_id", "first_seen_at" DESC);

-- CreateIndex
CREATE INDEX "idx_wa_ad_leads_session" ON "wa_ad_leads"("session_id");
