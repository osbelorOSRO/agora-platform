CREATE TABLE "fca_marketplace_leads" (
    "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    "source_id"          VARCHAR,
    "session_id"         VARCHAR,
    "actor_external_id"  VARCHAR,
    "source_url"         TEXT,
    "title"              TEXT,
    "description"        TEXT,
    "image_url"          TEXT,
    "first_message_text" TEXT,
    "metadata"           JSONB,
    "first_seen_at"      TIMESTAMPTZ(6),
    "last_seen_at"       TIMESTAMPTZ(6),
    "seen_count"         INTEGER DEFAULT 0,
    "created_at"         TIMESTAMPTZ(6) DEFAULT now(),
    "updated_at"         TIMESTAMPTZ(6),

    CONSTRAINT "fca_marketplace_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_fca_marketplace_leads_source_session"
    ON "fca_marketplace_leads"("source_id", "session_id");

CREATE INDEX "idx_fca_marketplace_leads_source_seen"
    ON "fca_marketplace_leads"("source_id", "first_seen_at" DESC);

CREATE INDEX "idx_fca_marketplace_leads_session"
    ON "fca_marketplace_leads"("session_id");
