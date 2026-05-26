-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "actor_state" AS ENUM ('NEW', 'CHURNED', 'QUALIFIED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "score_operator" AS ENUM ('lt', 'lte', 'gt', 'gte', 'eq');

-- CreateEnum
CREATE TYPE "meta_object_type" AS ENUM ('PAGE', 'INSTAGRAM', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "pipeline_type" AS ENUM ('MESSAGES', 'CHANGES', 'TRANSITIONS');

-- CreateEnum
CREATE TYPE "provider_type" AS ENUM ('META', 'BAILEYS');

-- CreateTable
CREATE TABLE "configuracion_bot" (
    "id" SERIAL NOT NULL,
    "tipo_configuracion" TEXT NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_app_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "app_id" TEXT,
    "app_secret" TEXT,
    "display_name" TEXT,
    "namespace" TEXT,
    "app_domains" TEXT,
    "contact_email" TEXT,
    "privacy_policy_url" TEXT,
    "terms_of_service_url" TEXT,
    "meta_verify_token" TEXT,
    "meta_page_access_token" TEXT,
    "meta_ig_verify_token" TEXT,
    "meta_ig_access_token" TEXT,
    "admin_access_token" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_chat_histories" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "n8n_chat_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por_id" INTEGER,
    "actualizado_en" TIMESTAMP(6),
    "actualizado_por_id" INTEGER,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "horaLogin" TIMESTAMP(3) NOT NULL,
    "ultimaInteraccion" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "token_2fa" TEXT NOT NULL,
    "rol_id" INTEGER,
    "nombre" TEXT,
    "apellido" TEXT,
    "run" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "creado_en" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por_id" INTEGER,
    "actualizado_en" TIMESTAMP(6),
    "actualizado_por_id" INTEGER,
    "invitation_token" TEXT,
    "invitation_expires_at" TIMESTAMP(6),
    "invitation_attempts" INTEGER NOT NULL DEFAULT 0,
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMP(6),
    "mfa_bypass_token" TEXT,
    "mfa_new_secret" TEXT,
    "mfa_reset_expires" TIMESTAMP(6),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado_en" TIMESTAMP(6),
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "protegido" BOOLEAN NOT NULL DEFAULT false,
    "photo_url" VARCHAR(500),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_planes" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "precio_base" DECIMAL,
    "tipo" TEXT,
    "descripcion" TEXT,
    "lineas" INTEGER,
    "excluye_alta" BOOLEAN DEFAULT false,
    "excluye_portabilidad_postpago" BOOLEAN DEFAULT false,
    "url_archivo" VARCHAR(255),
    "precio_normal" INTEGER,

    CONSTRAINT "precios_planes_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "respuestas_rapidas" (
    "uuid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "atajo" VARCHAR(50) NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "respuestas_rapidas_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "annotation_tag_entity" (
    "id" VARCHAR(16) NOT NULL,
    "name" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_69dfa041592c30bbc0d4b84aa00" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identity" (
    "userId" UUID,
    "providerId" VARCHAR(64) NOT NULL,
    "providerType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "auth_identity_pkey" PRIMARY KEY ("providerId","providerType")
);

-- CreateTable
CREATE TABLE "auth_provider_sync_history" (
    "id" SERIAL NOT NULL,
    "providerType" VARCHAR(32) NOT NULL,
    "runMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanned" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "disabled" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "auth_provider_sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_hub_messages" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "previousMessageId" UUID,
    "revisionOfMessageId" UUID,
    "retryOfMessageId" UUID,
    "type" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "content" TEXT NOT NULL,
    "provider" VARCHAR(16),
    "model" VARCHAR(64),
    "workflowId" VARCHAR(36),
    "executionId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'success',

    CONSTRAINT "PK_7704a5add6baed43eef835f0bfb" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_hub_sessions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "ownerId" UUID NOT NULL,
    "lastMessageAt" TIMESTAMPTZ(3),
    "credentialId" VARCHAR(36),
    "provider" VARCHAR(16),
    "model" VARCHAR(64),
    "workflowId" VARCHAR(36),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_1eafef1273c70e4464fec703412" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials_entity" (
    "name" VARCHAR(128) NOT NULL,
    "data" TEXT NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "id" VARCHAR(36) NOT NULL,
    "isManaged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "credentials_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_table" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "projectId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_e226d0001b9e6097cbfe70617cb" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_table_column" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "index" INTEGER NOT NULL,
    "dataTableId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_673cb121ee4a8a5e27850c72c51" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_destinations" (
    "id" UUID NOT NULL,
    "destination" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "event_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_annotation_tags" (
    "annotationId" INTEGER NOT NULL,
    "tagId" VARCHAR(24) NOT NULL,

    CONSTRAINT "PK_979ec03d31294cca484be65d11f" PRIMARY KEY ("annotationId","tagId")
);

-- CreateTable
CREATE TABLE "execution_annotations" (
    "id" SERIAL NOT NULL,
    "executionId" INTEGER NOT NULL,
    "vote" VARCHAR(6),
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_7afcf93ffa20c4252869a7c6a23" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_data" (
    "executionId" INTEGER NOT NULL,
    "workflowData" JSON NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "execution_data_pkey" PRIMARY KEY ("executionId")
);

-- CreateTable
CREATE TABLE "execution_entity" (
    "id" SERIAL NOT NULL,
    "finished" BOOLEAN NOT NULL,
    "mode" VARCHAR NOT NULL,
    "retryOf" VARCHAR,
    "retrySuccessId" VARCHAR,
    "startedAt" TIMESTAMPTZ(3),
    "stoppedAt" TIMESTAMPTZ(3),
    "waitTill" TIMESTAMPTZ(3),
    "status" VARCHAR NOT NULL,
    "workflowId" VARCHAR(36) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "pk_e3e63bbf986767844bbe1166d4e" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_metadata" (
    "id" SERIAL NOT NULL,
    "executionId" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PK_17a0b6284f8d626aae88e1c16e4" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "parentFolderId" VARCHAR(36),
    "projectId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_6278a41a706740c94c02e288df8" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_tag" (
    "folderId" VARCHAR(36) NOT NULL,
    "tagId" VARCHAR(36) NOT NULL,

    CONSTRAINT "PK_27e4e00852f6b06a925a4d83a3e" PRIMARY KEY ("folderId","tagId")
);

-- CreateTable
CREATE TABLE "insights_by_period" (
    "id" SERIAL NOT NULL,
    "metaId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "value" BIGINT NOT NULL,
    "periodUnit" INTEGER NOT NULL,
    "periodStart" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_b606942249b90cc39b0265f0575" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights_metadata" (
    "metaId" SERIAL NOT NULL,
    "workflowId" VARCHAR(16),
    "projectId" VARCHAR(36),
    "workflowName" VARCHAR(128) NOT NULL,
    "projectName" VARCHAR(255) NOT NULL,

    CONSTRAINT "PK_f448a94c35218b6208ce20cf5a1" PRIMARY KEY ("metaId")
);

-- CreateTable
CREATE TABLE "insights_raw" (
    "id" SERIAL NOT NULL,
    "metaId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "value" BIGINT NOT NULL,
    "timestamp" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_ec15125755151e3a7e00e00014f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installed_nodes" (
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(200) NOT NULL,
    "latestVersion" INTEGER NOT NULL DEFAULT 1,
    "package" VARCHAR(241) NOT NULL,

    CONSTRAINT "PK_8ebd28194e4f792f96b5933423fc439df97d9689" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "installed_packages" (
    "packageName" VARCHAR(214) NOT NULL,
    "installedVersion" VARCHAR(50) NOT NULL,
    "authorName" VARCHAR(70),
    "authorEmail" VARCHAR(70),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_08cc9197c39b028c1e9beca225940576fd1a5804" PRIMARY KEY ("packageName")
);

-- CreateTable
CREATE TABLE "invalid_auth_token" (
    "token" VARCHAR(512) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PK_5779069b7235b256d91f7af1a15" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_data" (
    "workflowId" VARCHAR(36) NOT NULL,
    "context" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "value" TEXT NOT NULL,

    CONSTRAINT "PK_ca04b9d8dc72de268fe07a65773" PRIMARY KEY ("workflowId","context")
);

-- CreateTable
CREATE TABLE "project" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "icon" JSON,
    "description" VARCHAR(512),

    CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_relation" (
    "projectId" VARCHAR(36) NOT NULL,
    "userId" UUID NOT NULL,
    "role" VARCHAR NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_1caaa312a5d7184a003be0f0cb6" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "role" (
    "slug" VARCHAR(128) NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "roleType" TEXT,
    "systemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_35c9b140caaf6da09cfabb0d675" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "role_scope" (
    "roleSlug" VARCHAR(128) NOT NULL,
    "scopeSlug" VARCHAR(128) NOT NULL,

    CONSTRAINT "PK_role_scope" PRIMARY KEY ("roleSlug","scopeSlug")
);

-- CreateTable
CREATE TABLE "scope" (
    "slug" VARCHAR(128) NOT NULL,
    "displayName" TEXT,
    "description" TEXT,

    CONSTRAINT "PK_bfc45df0481abd7f355d6187da1" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "loadOnStartup" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PK_dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "shared_credentials" (
    "credentialsId" VARCHAR(36) NOT NULL,
    "projectId" VARCHAR(36) NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_8ef3a59796a228913f251779cff" PRIMARY KEY ("credentialsId","projectId")
);

-- CreateTable
CREATE TABLE "shared_workflow" (
    "workflowId" VARCHAR(36) NOT NULL,
    "projectId" VARCHAR(36) NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_5ba87620386b847201c9531c58f" PRIMARY KEY ("workflowId","projectId")
);

-- CreateTable
CREATE TABLE "tag_entity" (
    "name" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "id" VARCHAR(36) NOT NULL,

    CONSTRAINT "tag_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_case_execution" (
    "id" VARCHAR(36) NOT NULL,
    "testRunId" VARCHAR(36) NOT NULL,
    "executionId" INTEGER,
    "status" VARCHAR NOT NULL,
    "runAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "errorCode" VARCHAR,
    "errorDetails" JSON,
    "metrics" JSON,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "inputs" JSON,
    "outputs" JSON,

    CONSTRAINT "PK_90c121f77a78a6580e94b794bce" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run" (
    "id" VARCHAR(36) NOT NULL,
    "workflowId" VARCHAR(36) NOT NULL,
    "status" VARCHAR NOT NULL,
    "errorCode" VARCHAR,
    "errorDetails" JSON,
    "runAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "metrics" JSON,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transiciones_estados" (
    "id_estado" INTEGER NOT NULL,
    "descripcion_estado" TEXT NOT NULL,
    "texto_principal" TEXT,
    "item_1" TEXT,
    "item_2" TEXT,
    "item_3" TEXT,
    "item_4" TEXT,
    "item_5" TEXT,
    "item_6" TEXT,
    "new_id1" INTEGER,
    "new_id2" INTEGER,
    "new_id3" INTEGER,
    "new_id4" INTEGER,
    "new_id5" INTEGER,
    "new_id6" INTEGER,
    "estado_anterior" INTEGER,
    "delegar_humano" INTEGER,
    "modo_default" TEXT,
    "sub_estado" TEXT,
    "fallback_equipo" TEXT,
    "fallback1" TEXT,
    "fallback2" TEXT,
    "texto_rescate" TEXT,
    "silent" BOOLEAN,

    CONSTRAINT "transiciones_estados_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT uuid_in((OVERLAY(OVERLAY(md5((((random())::text || ':'::text) || (clock_timestamp())::text)) PLACING '4'::text FROM 13) PLACING to_hex((floor(((random() * (((11 - 8) + 1))::double precision) + (8)::double precision)))::integer) FROM 17))::cstring),
    "email" VARCHAR(255),
    "firstName" VARCHAR(32),
    "lastName" VARCHAR(32),
    "password" VARCHAR(255),
    "personalizationAnswers" JSON,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "settings" JSON,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaRecoveryCodes" TEXT,
    "lastActiveAt" DATE,
    "roleSlug" VARCHAR(128) NOT NULL DEFAULT 'global:member',

    CONSTRAINT "PK_ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_api_keys" (
    "id" VARCHAR(36) NOT NULL,
    "userId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "apiKey" VARCHAR NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "scopes" JSON,
    "audience" VARCHAR NOT NULL DEFAULT 'public-api',

    CONSTRAINT "PK_978fa5caa3468f463dac9d92e69" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variables" (
    "key" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'string',
    "value" VARCHAR(255),
    "id" VARCHAR(36) NOT NULL,
    "projectId" VARCHAR(36),

    CONSTRAINT "variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_entity" (
    "webhookPath" VARCHAR NOT NULL,
    "method" VARCHAR NOT NULL,
    "node" VARCHAR NOT NULL,
    "webhookId" VARCHAR,
    "pathLength" INTEGER,
    "workflowId" VARCHAR(36) NOT NULL,

    CONSTRAINT "PK_b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath","method")
);

-- CreateTable
CREATE TABLE "workflow_dependency" (
    "id" SERIAL NOT NULL,
    "workflowId" VARCHAR(36) NOT NULL,
    "workflowVersionId" INTEGER NOT NULL,
    "dependencyType" VARCHAR(32) NOT NULL,
    "dependencyKey" VARCHAR(255) NOT NULL,
    "dependencyInfo" VARCHAR(255),
    "indexVersionId" SMALLINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "PK_52325e34cd7a2f0f67b0f3cad65" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_entity" (
    "name" VARCHAR(128) NOT NULL,
    "active" BOOLEAN NOT NULL,
    "nodes" JSON NOT NULL,
    "connections" JSON NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "settings" JSON,
    "staticData" JSON,
    "pinData" JSON,
    "versionId" CHAR(36),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "id" VARCHAR(36) NOT NULL,
    "meta" JSON,
    "parentFolderId" VARCHAR(36),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "versionCounter" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workflow_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_history" (
    "versionId" VARCHAR(36) NOT NULL,
    "workflowId" VARCHAR(36) NOT NULL,
    "authors" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    "nodes" JSON NOT NULL,
    "connections" JSON NOT NULL,

    CONSTRAINT "PK_b6572dd6173e4cd06fe79937b58" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "workflow_statistics" (
    "count" INTEGER DEFAULT 0,
    "latestEvent" TIMESTAMPTZ(3),
    "name" VARCHAR(128) NOT NULL,
    "workflowId" VARCHAR(36) NOT NULL,
    "rootCount" INTEGER DEFAULT 0,

    CONSTRAINT "pk_workflow_statistics" PRIMARY KEY ("workflowId","name")
);

-- CreateTable
CREATE TABLE "workflows_tags" (
    "workflowId" VARCHAR(36) NOT NULL,
    "tagId" VARCHAR(36) NOT NULL,

    CONSTRAINT "pk_workflows_tags" PRIMARY KEY ("workflowId","tagId")
);

-- CreateTable
CREATE TABLE "actor_history_score" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_external_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "score_delta" DECIMAL(10,4) NOT NULL,
    "signal_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_history_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_lifecycle" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_external_id" TEXT NOT NULL,
    "state" "actor_state" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_lifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_score" (
    "actor_external_id" TEXT NOT NULL,
    "score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_score_pkey" PRIMARY KEY ("actor_external_id")
);

-- CreateTable
CREATE TABLE "event_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_event_id" TEXT NOT NULL,
    "actor_external_id" TEXT NOT NULL,
    "provider" "provider_type" NOT NULL,
    "object_type" "meta_object_type" NOT NULL,
    "pipeline" "pipeline_type" NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_chat_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_event_id" VARCHAR(255) NOT NULL,
    "message_external_id" VARCHAR(255),
    "actor_external_id" VARCHAR(255) NOT NULL,
    "thread_external_id" VARCHAR(255),
    "in_reply_to_external_event_id" VARCHAR(255),
    "correlation_id" VARCHAR(255),
    "causation_id" VARCHAR(255),
    "provider" VARCHAR(32) NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "pipeline" VARCHAR(32) NOT NULL DEFAULT 'MESSAGES',
    "event_type" VARCHAR(64) NOT NULL,
    "source_system" VARCHAR(32) NOT NULL,
    "source_channel" VARCHAR(32) NOT NULL,
    "source_event_id" VARCHAR(255),
    "direction" VARCHAR(16) NOT NULL,
    "content_type" VARCHAR(32) NOT NULL,
    "content_text" TEXT,
    "content_json" JSONB,
    "status" VARCHAR(32) NOT NULL DEFAULT 'received',
    "signal_type" VARCHAR(64),
    "error_code" VARCHAR(64),
    "error_message" TEXT,
    "workflow_id" VARCHAR(128),
    "workflow_execution_id" VARCHAR(128),
    "queue_name" VARCHAR(64),
    "job_name" VARCHAR(64),
    "job_id" VARCHAR(255),
    "attempt" INTEGER,
    "max_attempts" INTEGER,
    "job_status" VARCHAR(32),
    "queued_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "n8n_chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_message_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "message_external_id" VARCHAR(255),
    "actor_external_id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "source_channel" VARCHAR(32),
    "event_kind" VARCHAR(64) NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "content_text" TEXT,
    "content_json" JSONB NOT NULL DEFAULT '{}',
    "in_reply_to_external_event_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'received',
    "signal_type" VARCHAR(64),
    "workflow_execution_id" VARCHAR(128),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "n8n_message_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_transition_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_state" "actor_state" NOT NULL,
    "score_operator" "score_operator",
    "score_threshold" DECIMAL(10,2),
    "required_current_state" "actor_state",
    "priority" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lifecycle_transition_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_scoring_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "signal_type" VARCHAR(100) NOT NULL,
    "polarity" VARCHAR(10) NOT NULL,
    "delta" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_inbox_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_external_id" VARCHAR(255) NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL DEFAULT 'Nuevo',
    "phone" VARCHAR(50),
    "email" VARCHAR(200),
    "notes" TEXT,
    "city" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "rut" VARCHAR(20),
    "address" VARCHAR(250),
    "region" VARCHAR(120),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "meta_inbox_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_templates" (
    "id" BIGSERIAL NOT NULL,
    "stage_actual" VARCHAR(128) NOT NULL,
    "posicion" SMALLINT,
    "posibles_match" TEXT NOT NULL,
    "es_fallback" BOOLEAN NOT NULL DEFAULT false,
    "procesa_datos" BOOLEAN NOT NULL DEFAULT false,
    "dato_esperado" VARCHAR(128),
    "nuevo_stage" VARCHAR(128) NOT NULL,
    "tipo_respuesta" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage_route" VARCHAR(64),

    CONSTRAINT "stage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "thread_id" UUID,
    "actor_external_id" VARCHAR(255) NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "event_source" VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    "from_value" TEXT,
    "to_value" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "external_event_id" VARCHAR(255),
    "message_external_id" VARCHAR(255),
    "direction" VARCHAR(16),
    "provider" VARCHAR(32),
    "source_channel" VARCHAR(32),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupe_key" TEXT,

    CONSTRAINT "thread_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "message_external_id" VARCHAR(255),
    "actor_external_id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'META',
    "object_type" VARCHAR(32) NOT NULL,
    "source_channel" VARCHAR(32),
    "event_kind" VARCHAR(64) NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "content_text" TEXT,
    "content_json" JSONB,
    "in_reply_to_external_event_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL DEFAULT 'received',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_offer_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "stage_actual" VARCHAR(64) NOT NULL,
    "tipo" VARCHAR(32) NOT NULL,
    "codigo" VARCHAR(120) NOT NULL,
    "nombre_plan" VARCHAR(255) NOT NULL,
    "precio_base" DECIMAL(12,2) NOT NULL,
    "descripcion" TEXT,
    "precio_normal" DECIMAL(12,2),
    "url_archivo" TEXT,
    "decision" VARCHAR(32) NOT NULL DEFAULT 'indefinido',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "thread_offer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "actor_external_id" VARCHAR(255) NOT NULL,
    "object_type" VARCHAR(32) NOT NULL,
    "source_channel" VARCHAR(32),
    "thread_status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    "attention_mode" VARCHAR(32) NOT NULL DEFAULT 'N8N',
    "thread_stage" VARCHAR(64) NOT NULL DEFAULT 'inicio',
    "last_message_text" TEXT,
    "last_direction" VARCHAR(16),
    "last_message_at" TIMESTAMPTZ(6),
    "last_incoming_at" TIMESTAMPTZ(6),
    "last_outgoing_at" TIMESTAMPTZ(6),
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awaiting_first_incoming_delegate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_bot_tipo_configuracion_key" ON "configuracion_bot"("tipo_configuracion");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_rapidas_atajo_key" ON "respuestas_rapidas"("atajo");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_ae51b54c4bb430cf92f48b623f" ON "annotation_tag_entity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pk_credentials_entity_id" ON "credentials_entity"("id");

-- CreateIndex
CREATE INDEX "idx_07fde106c0b471d8cc80a64fc8" ON "credentials_entity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_b23096ef747281ac944d28e8b0d" ON "data_table"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_8082ec4890f892f0bc77473a123" ON "data_table_column"("dataTableId", "name");

-- CreateIndex
CREATE INDEX "IDX_a3697779b366e131b2bbdae297" ON "execution_annotation_tags"("tagId");

-- CreateIndex
CREATE INDEX "IDX_c1519757391996eb06064f0e7c" ON "execution_annotation_tags"("annotationId");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_97f863fa83c4786f1956508496" ON "execution_annotations"("executionId");

-- CreateIndex
CREATE INDEX "IDX_execution_entity_deletedAt" ON "execution_entity"("deletedAt");

-- CreateIndex
CREATE INDEX "idx_execution_entity_stopped_at_status_deleted_at" ON "execution_entity"("stoppedAt", "status", "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL));

-- CreateIndex
CREATE INDEX "idx_execution_entity_wait_till_status_deleted_at" ON "execution_entity"("waitTill", "status", "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL));

-- CreateIndex
CREATE INDEX "idx_execution_entity_workflow_id_started_at" ON "execution_entity"("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL));

-- CreateIndex
CREATE UNIQUE INDEX "IDX_cec8eea3bf49551482ccb4933e" ON "execution_metadata"("executionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_14f68deffaf858465715995508" ON "folder"("projectId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_60b6a84299eeb3f671dfec7693" ON "insights_by_period"("periodStart", "type", "periodUnit", "metaId");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_1d8ab99d5861c9388d2dc1cf73" ON "insights_metadata"("workflowId");

-- CreateIndex
CREATE INDEX "IDX_5f0643f6717905a05164090dde" ON "project_relation"("userId");

-- CreateIndex
CREATE INDEX "IDX_61448d56d61802b5dfde5cdb00" ON "project_relation"("projectId");

-- CreateIndex
CREATE INDEX "project_relation_role_idx" ON "project_relation"("role");

-- CreateIndex
CREATE INDEX "project_relation_role_project_idx" ON "project_relation"("projectId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_UniqueRoleDisplayName" ON "role"("displayName");

-- CreateIndex
CREATE INDEX "IDX_role_scope_scopeSlug" ON "role_scope"("scopeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "idx_812eb05f7451ca757fb98444ce" ON "tag_entity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pk_tag_entity_id" ON "tag_entity"("id");

-- CreateIndex
CREATE INDEX "IDX_8e4b4774db42f1e6dda3452b2a" ON "test_case_execution"("testRunId");

-- CreateIndex
CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON "test_run"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_e12875dfb3b1d92d7d7c5377e2" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("roleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_1ef35bac35d20bdae979d917a3" ON "user_api_keys"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "IDX_63d7bbae72c767cf162d459fcc" ON "user_api_keys"("userId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "variables_global_key_unique" ON "variables"("key") WHERE ("projectId" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "variables_project_key_unique" ON "variables"("projectId", "key") WHERE ("projectId" IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_16f4436789e804e3e1c9eeb240" ON "webhook_entity"("webhookId", "method", "pathLength");

-- CreateIndex
CREATE INDEX "IDX_a4ff2d9b9628ea988fa9e7d0bf" ON "workflow_dependency"("workflowId");

-- CreateIndex
CREATE INDEX "IDX_e48a201071ab85d9d09119d640" ON "workflow_dependency"("dependencyKey");

-- CreateIndex
CREATE INDEX "IDX_e7fe1cfda990c14a445937d0b9" ON "workflow_dependency"("dependencyType");

-- CreateIndex
CREATE UNIQUE INDEX "pk_workflow_entity_id" ON "workflow_entity"("id");

-- CreateIndex
CREATE INDEX "IDX_workflow_entity_name" ON "workflow_entity"("name");

-- CreateIndex
CREATE INDEX "IDX_1e31657f5fe46816c34be7c1b4" ON "workflow_history"("workflowId");

-- CreateIndex
CREATE INDEX "idx_workflows_tags_workflow_id" ON "workflows_tags"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "actor_history_score_external_event_id_key" ON "actor_history_score"("external_event_id");

-- CreateIndex
CREATE INDEX "idx_actor_history_score_actor_time" ON "actor_history_score"("actor_external_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_actor_history_score_created" ON "actor_history_score"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_actor_lifecycle_actor_time" ON "actor_lifecycle"("actor_external_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_actor_lifecycle_state" ON "actor_lifecycle"("state");

-- CreateIndex
CREATE INDEX "idx_actor_score_updated" ON "actor_score"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "event_history_external_event_id_key" ON "event_history"("external_event_id");

-- CreateIndex
CREATE INDEX "idx_event_history_actor_time" ON "event_history"("actor_external_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_event_history_received" ON "event_history"("received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "n8n_chat_history_external_event_id_key" ON "n8n_chat_history"("external_event_id");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_actor_time" ON "n8n_chat_history"("actor_external_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_n8n_chat_direction_time" ON "n8n_chat_history"("direction", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_n8n_chat_job" ON "n8n_chat_history"("queue_name", "job_name", "job_id");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_reply_to" ON "n8n_chat_history"("in_reply_to_external_event_id");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_status_time" ON "n8n_chat_history"("status", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_n8n_chat_thread_time" ON "n8n_chat_history"("thread_external_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "n8n_message_sessions_external_event_id_key" ON "n8n_message_sessions"("external_event_id");

-- CreateIndex
CREATE INDEX "idx_n8n_msg_sessions_actor_time" ON "n8n_message_sessions"("actor_external_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_n8n_msg_sessions_session_time" ON "n8n_message_sessions"("session_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_n8n_msg_sessions_signal" ON "n8n_message_sessions"("signal_type");

-- CreateIndex
CREATE INDEX "idx_n8n_msg_sessions_status_time" ON "n8n_message_sessions"("status", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lifecycle_transition_rules_active_priority" ON "lifecycle_transition_rules"("is_active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "signal_scoring_rules_signal_type_key" ON "signal_scoring_rules"("signal_type");

-- CreateIndex
CREATE INDEX "idx_signal_scoring_rules_active" ON "signal_scoring_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "meta_inbox_contacts_actor_external_id_object_type_key" ON "meta_inbox_contacts"("actor_external_id", "object_type");

-- CreateIndex
CREATE INDEX "idx_stage_templates_activo" ON "stage_templates"("activo");

-- CreateIndex
CREATE INDEX "idx_stage_templates_nuevo_stage" ON "stage_templates"("nuevo_stage");

-- CreateIndex
CREATE INDEX "idx_stage_templates_stage_actual" ON "stage_templates"("stage_actual");

-- CreateIndex
CREATE UNIQUE INDEX "thread_events_dedupe_key_key" ON "thread_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "idx_thread_events_actor_object_time" ON "thread_events"("actor_external_id", "object_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_events_session_time" ON "thread_events"("session_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_events_type_time" ON "thread_events"("event_type", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "thread_messages_external_event_id_key" ON "thread_messages"("external_event_id");

-- CreateIndex
CREATE INDEX "idx_thread_messages_actor_object_time" ON "thread_messages"("actor_external_id", "object_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_messages_direction" ON "thread_messages"("direction");

-- CreateIndex
CREATE INDEX "idx_thread_messages_session_time" ON "thread_messages"("session_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_offer_events_created_at" ON "thread_offer_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_offer_events_session_codigo" ON "thread_offer_events"("session_id", "codigo");

-- CreateIndex
CREATE INDEX "idx_thread_offer_events_session_decision" ON "thread_offer_events"("session_id", "decision");

-- CreateIndex
CREATE INDEX "idx_thread_offer_events_session_id" ON "thread_offer_events"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "threads_session_id_key" ON "threads"("session_id");

-- CreateIndex
CREATE INDEX "idx_threads_actor_object" ON "threads"("actor_external_id", "object_type");

-- CreateIndex
CREATE INDEX "idx_threads_status_last_message" ON "threads"("thread_status", "last_message_at" DESC);

-- AddForeignKey
ALTER TABLE "rol" ADD CONSTRAINT "fk_rol_actualizado_por" FOREIGN KEY ("actualizado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol" ADD CONSTRAINT "fk_rol_creado_por" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "fk_usuario_actualizado_por" FOREIGN KEY ("actualizado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "fk_usuario_creado_por" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_identity" ADD CONSTRAINT "auth_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_1f4998c8a7dec9e00a9ab15550e" FOREIGN KEY ("revisionOfMessageId") REFERENCES "chat_hub_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_25c9736e7f769f3a005eef4b372" FOREIGN KEY ("retryOfMessageId") REFERENCES "chat_hub_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_6afb260449dd7a9b85355d4e0c9" FOREIGN KEY ("executionId") REFERENCES "execution_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_acf8926098f063cdbbad8497fd1" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_e22538eb50a71a17954cd7e076c" FOREIGN KEY ("sessionId") REFERENCES "chat_hub_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_messages" ADD CONSTRAINT "FK_e5d1fa722c5a8d38ac204746662" FOREIGN KEY ("previousMessageId") REFERENCES "chat_hub_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_sessions" ADD CONSTRAINT "FK_7bc13b4c7e6afbfaf9be326c189" FOREIGN KEY ("credentialId") REFERENCES "credentials_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_sessions" ADD CONSTRAINT "FK_9f9293d9f552496c40e0d1a8f80" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_hub_sessions" ADD CONSTRAINT "FK_e9ecf8ede7d989fcd18790fe36a" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_table" ADD CONSTRAINT "FK_c2a794257dee48af7c9abf681de" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_table_column" ADD CONSTRAINT "FK_930b6e8faaf88294cef23484160" FOREIGN KEY ("dataTableId") REFERENCES "data_table"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_annotation_tags" ADD CONSTRAINT "FK_a3697779b366e131b2bbdae2976" FOREIGN KEY ("tagId") REFERENCES "annotation_tag_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_annotation_tags" ADD CONSTRAINT "FK_c1519757391996eb06064f0e7c8" FOREIGN KEY ("annotationId") REFERENCES "execution_annotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_annotations" ADD CONSTRAINT "FK_97f863fa83c4786f19565084960" FOREIGN KEY ("executionId") REFERENCES "execution_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_data" ADD CONSTRAINT "execution_data_fk" FOREIGN KEY ("executionId") REFERENCES "execution_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_entity" ADD CONSTRAINT "fk_execution_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "execution_metadata" ADD CONSTRAINT "FK_31d0b4c93fb85ced26f6005cda3" FOREIGN KEY ("executionId") REFERENCES "execution_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "FK_804ea52f6729e3940498bd54d78" FOREIGN KEY ("parentFolderId") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "FK_a8260b0b36939c6247f385b8221" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "folder_tag" ADD CONSTRAINT "FK_94a60854e06f2897b2e0d39edba" FOREIGN KEY ("folderId") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "folder_tag" ADD CONSTRAINT "FK_dc88164176283de80af47621746" FOREIGN KEY ("tagId") REFERENCES "tag_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insights_by_period" ADD CONSTRAINT "FK_6414cfed98daabbfdd61a1cfbc0" FOREIGN KEY ("metaId") REFERENCES "insights_metadata"("metaId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insights_metadata" ADD CONSTRAINT "FK_1d8ab99d5861c9388d2dc1cf733" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insights_metadata" ADD CONSTRAINT "FK_2375a1eda085adb16b24615b69c" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insights_raw" ADD CONSTRAINT "FK_6e2e33741adef2a7c5d66befa4e" FOREIGN KEY ("metaId") REFERENCES "insights_metadata"("metaId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "installed_nodes" ADD CONSTRAINT "FK_73f857fc5dce682cef8a99c11dbddbc969618951" FOREIGN KEY ("package") REFERENCES "installed_packages"("packageName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_data" ADD CONSTRAINT "FK_06a69a7032c97a763c2c7599464" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_relation" ADD CONSTRAINT "FK_5f0643f6717905a05164090dde7" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_relation" ADD CONSTRAINT "FK_61448d56d61802b5dfde5cdb002" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_relation" ADD CONSTRAINT "FK_c6b99592dc96b0d836d7a21db91" FOREIGN KEY ("role") REFERENCES "role"("slug") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_scope" ADD CONSTRAINT "FK_role" FOREIGN KEY ("roleSlug") REFERENCES "role"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_scope" ADD CONSTRAINT "FK_scope" FOREIGN KEY ("scopeSlug") REFERENCES "scope"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_credentials" ADD CONSTRAINT "FK_416f66fc846c7c442970c094ccf" FOREIGN KEY ("credentialsId") REFERENCES "credentials_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shared_credentials" ADD CONSTRAINT "FK_812c2852270da1247756e77f5a4" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shared_workflow" ADD CONSTRAINT "FK_a45ea5f27bcfdc21af9b4188560" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shared_workflow" ADD CONSTRAINT "FK_daa206a04983d47d0a9c34649ce" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test_case_execution" ADD CONSTRAINT "FK_8e4b4774db42f1e6dda3452b2af" FOREIGN KEY ("testRunId") REFERENCES "test_run"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test_case_execution" ADD CONSTRAINT "FK_e48965fac35d0f5b9e7f51d8c44" FOREIGN KEY ("executionId") REFERENCES "execution_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test_run" ADD CONSTRAINT "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES "role"("slug") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_api_keys" ADD CONSTRAINT "FK_e131705cbbc8fb589889b02d457" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "variables" ADD CONSTRAINT "FK_42f6c766f9f9d2edcc15bdd6e9b" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_entity" ADD CONSTRAINT "fk_webhook_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_dependency" ADD CONSTRAINT "FK_a4ff2d9b9628ea988fa9e7d0bf8" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_entity" ADD CONSTRAINT "fk_workflow_parent_folder" FOREIGN KEY ("parentFolderId") REFERENCES "folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "FK_1e31657f5fe46816c34be7c1b4b" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_statistics" ADD CONSTRAINT "fk_workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows_tags" ADD CONSTRAINT "fk_workflows_tags_tag_id" FOREIGN KEY ("tagId") REFERENCES "tag_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows_tags" ADD CONSTRAINT "fk_workflows_tags_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "n8n_chat_history" ADD CONSTRAINT "fk_n8n_chat_in_reply" FOREIGN KEY ("in_reply_to_external_event_id") REFERENCES "n8n_chat_history"("external_event_id") ON DELETE SET NULL ON UPDATE CASCADE;
