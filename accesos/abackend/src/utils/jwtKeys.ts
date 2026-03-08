import { VaultService } from '../secrets/vault.service.js';

const vaultService = new VaultService();

export async function privateKey(): Promise<string> {
  return vaultService.getSecretKey('accesos/keys/private');
}

export async function publicKey(): Promise<string> {
  return vaultService.getSecretKey('accesos/keys/public');
}

export async function botPublicKey(): Promise<string> {
  return vaultService.getSecretKey('accesos/keys/public_bot');
}
