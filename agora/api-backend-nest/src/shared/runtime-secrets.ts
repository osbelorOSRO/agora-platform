import { VaultService } from '../auth/vault.service';

const vault = new VaultService();
const cache = new Map<string, string>();
const defaultPath = process.env.VAULT_APP_SECRETS_PATH || 'agora/api-backend-nest';

export async function getRuntimeSecret(
  envKey: string,
  opts?: { path?: string; field?: string },
): Promise<string> {
  if (cache.has(envKey)) {
    return cache.get(envKey)!;
  }

  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim()) {
    cache.set(envKey, fromEnv.trim());
    return fromEnv.trim();
  }

  const path = opts?.path || defaultPath;
  const field = opts?.field || envKey;

  const value = await vault.getSecretField(path, field);
  cache.set(envKey, value);
  return value;
}
