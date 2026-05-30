CREATE TABLE "meta_fanpage_ad_leads" (
    "id"                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    "session_id"         VARCHAR        UNIQUE,
    "actor_external_id"  VARCHAR,
    "ad_id"              VARCHAR,
    "ad_name"            VARCHAR,
    "adgroup_id"         VARCHAR,
    "ref"                VARCHAR,
    "source"             VARCHAR,
    "type"               VARCHAR,
    "first_message_text" TEXT,
    "metadata"           JSONB,
    "first_seen_at"      TIMESTAMPTZ(6),
    "last_seen_at"       TIMESTAMPTZ(6),
    "seen_count"         INTEGER        NOT NULL DEFAULT 0,
    "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"         TIMESTAMPTZ(6),

    CONSTRAINT "meta_fanpage_ad_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_meta_fanpage_ad_leads_session"
    ON "meta_fanpage_ad_leads"("session_id");

CREATE INDEX "idx_meta_fanpage_ad_leads_ad_seen"
    ON "meta_fanpage_ad_leads"("ad_id", "first_seen_at" DESC);
