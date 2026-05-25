import { VaultService } from '../auth/vault.service';
import { MetaConfigService } from '../meta-config/meta-config.service';

const vault = new VaultService();
const cache = new Map<string, string>();

// Campos Meta que se resuelven desde DB/Redis, nunca desde Vault
const META_DB_FIELDS = new Set([
  'META_APP_SECRET',
  'META_PAGE_ACCESS_TOKEN',
  'META_INSTAGRAM_ACCESS_TOKEN',
  'META_VERIFY_TOKEN',
  'META_IG_VERIFY_TOKEN',
]);

const META_DB_KEY_MAP: Record<string, string> = {
  META_APP_SECRET: 'app_secret',
  META_PAGE_ACCESS_TOKEN: 'meta_page_access_token',
  META_INSTAGRAM_ACCESS_TOKEN: 'meta_ig_access_token',
  META_VERIFY_TOKEN: 'meta_verify_token',
  META_IG_VERIFY_TOKEN: 'meta_ig_verify_token',
};

let metaConfigService: MetaConfigService | null = null;

export function setMetaConfigService(service: MetaConfigService) {
  metaConfigService = service;
}

function resolveVaultPath(path?: string): string {
  const resolved = path || process.env.VAULT_APP_SECRETS_PATH;

  if (!resolved?.trim()) {
    throw new Error('VAULT_APP_SECRETS_PATH no esta definido');
  }

  return resolved.trim();
}

export async function getRuntimeSecret(
  envKey: string,
  opts?: { path?: string; field?: string },
): Promise<string> {
  if (META_DB_FIELDS.has(envKey)) {
    if (!metaConfigService)
      throw new Error(
        `MetaConfigService no inicializado — no se puede resolver ${envKey}`,
      );
    const dbField = META_DB_KEY_MAP[envKey];
    const value = await metaConfigService.getSecret(dbField);
    if (!value) throw new Error(`missing_meta_config:${dbField}`);
    return value;
  }

  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }

  const path = resolveVaultPath(opts?.path);
  const field = opts?.field || envKey;
  const cacheKey = `${path}:${field}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const value = await vault.getSecretField(path, field);
  cache.set(cacheKey, value);
  return value;
}
