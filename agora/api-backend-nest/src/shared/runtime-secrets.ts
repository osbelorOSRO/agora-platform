import { VaultService } from '../auth/vault.service';

const vault = new VaultService();
const cache = new Map<string, string>();

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
