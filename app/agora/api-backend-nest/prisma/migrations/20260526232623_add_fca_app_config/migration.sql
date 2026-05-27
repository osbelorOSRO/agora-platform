-- CreateTable
CREATE TABLE "fca_app_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" TEXT,
    "display_name" TEXT,
    "fb_backend_url" TEXT,
    "fb_user_id" TEXT,
    "fb_user_name" TEXT,
    "internal_token" TEXT,
    "app_state" TEXT,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "fca_app_config_pkey" PRIMARY KEY ("id")
);
