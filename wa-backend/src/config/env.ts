import 'dotenv/config';

type NodeEnv = 'development' | 'production' | 'test';

function required(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`❌ Missing required env: ${name}`);
  return v.trim();
}

function optional(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (!v || !String(v).trim()) return fallback;
  return v.trim();
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`❌ Invalid number env: ${name}`);
  return n;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return fallback;
  const v = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  throw new Error(`❌ Invalid boolean env: ${name}`);
}

export const env = {
  nodeEnv: (optional('NODE_ENV', 'development') as NodeEnv),

  // HTTP
  port: optionalNumber('API_PORT', 3000),
  trustProxy: optionalBool('TRUST_PROXY', true),

  // Internal services by docker name
  apiBackendUrl: required('API_BACKEND_URL'),
  wsPanelUrl: required('WS_URL'),
  mediaBaseUrl: required('MEDIA_BASE_URL'),
  n8nWebhookUrl: required('N8N_WEBHOOK_URL'),

  // Vault
  vaultAddr: required('VAULT_ADDR'), // http://vault:8200
  vaultRoleId: required('VAULT_ROLE_ID'),
  vaultSecretId: required('VAULT_SECRET_ID'),
  vaultTimeoutMs: optionalNumber('VAULT_TIMEOUT', 5000),
  vaultTokenRenewIntervalMs: optionalNumber('VAULT_TOKEN_RENEW_INTERVAL', 30) * 60_000,

  // Paths y campos en Vault (con defaults compatibles con el entorno actual)
  vaultPathBotPrivateKey: optional(
    'VAULT_PATH_BOT_PRIVATE_KEY',
    optional('VAULT_PATH_BOT_KEYS', 'accesos/keys/bot-private')
  ) as string,
  vaultPathBackendPublicKey: optional(
    'VAULT_PATH_BACKEND_PUBLIC_KEY',
    'accesos/keys/public'
  ) as string,
  vaultPathSocketSecret: optional(
    'VAULT_PATH_SOCKET_SECRET',
    'accesos/bot'
  ) as string,
  vaultFieldRsaKey: optional('VAULT_FIELD_RSA_KEY', 'key') as string,
  vaultFieldSocketSecret: optional('VAULT_FIELD_SOCKET_SECRET', 'secret_key_wa') as string,

  // Auth token secret para endpoints internos si lo usas (opcional)
  tokenEndpointSecret: optional('TOKEN_ENDPOINT_SECRET'),

  // Misc
  logLevel: optional('LOG_LEVEL', 'info'),
  proxyTimeoutMs: optionalNumber('PROXY_TIMEOUT', 120000),
  authFolder: optional('AUTH_FOLDER', 'auth') as string,
} as const;

export type Env = typeof env;
