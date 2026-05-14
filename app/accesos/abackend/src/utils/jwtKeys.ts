import { VaultService } from '../secrets/vault.service.js';

const vaultService = new VaultService();

export async function privateKey(): Promise<string> {
  return vaultService.getSecretKey(
    process.env.VAULT_JWT_PRIVATE_KEY_PATH || 'accesos/keys/private',
  );
}

export async function publicKey(): Promise<string> {
  return vaultService.getSecretKey(
    process.env.VAULT_JWT_PUBLIC_KEY_PATH || 'accesos/keys/public',
  );
}

export async function botPublicKey(): Promise<string> {
  return vaultService.getSecretKey(
    process.env.VAULT_JWT_BOT_PUBLIC_KEY_PATH || 'accesos/keys/public_bot',
  );
}
