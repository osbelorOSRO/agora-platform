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
  mediaBaseUrl: required('MEDIA_BASE_URL'),
  baileysInternalToken: required('BAILEYS_INTERNAL_TOKEN'),

  // Misc
  logLevel: optional('LOG_LEVEL', 'info'),
  proxyTimeoutMs: optionalNumber('PROXY_TIMEOUT', 120000),
  authFolder: optional('AUTH_FOLDER', 'auth') as string,
} as const;

export type Env = typeof env;
