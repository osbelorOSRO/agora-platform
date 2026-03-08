import Vault from 'node-vault';
import { env } from '../../config/env.js';

export class VaultService {
  private endpoint: string;
  private vault: any;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.endpoint = env.vaultAddr;
  }

  private async authenticate(): Promise<string> {
    const roleId = env.vaultRoleId;
    const secretId = env.vaultSecretId;

    if (!roleId || !secretId) {
      throw new Error('VAULT_ROLE_ID o VAULT_SECRET_ID no definidos');
    }

    const tempVault = Vault({
      endpoint: this.endpoint,
      requestOptions: { timeout: env.vaultTimeoutMs },
    });

    const response = await tempVault.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

    if (!response.auth?.client_token) {
      throw new Error('No se pudo obtener token de Vault');
    }

    this.tokenExpiresAt =
      Date.now() + response.auth.lease_duration * 1000;

    return response.auth.client_token;
  }

  private async getValidToken(): Promise<string> {
    if (Date.now() >= this.tokenExpiresAt - 300000) {
      return await this.authenticate();
    }

    if (this.vault?.token) {
      return this.vault.token;
    }

    return await this.authenticate();
  }

  async getSecret(path: string, field: string): Promise<string> {
    const token = await this.getValidToken();

    this.vault = Vault({
      endpoint: this.endpoint,
      token,
      requestOptions: { timeout: env.vaultTimeoutMs },
    });

    const secret = await this.vault.read(`secret/data/${path}`);

    const value = secret?.data?.data?.[field];

    if (!value) {
      throw new Error(
        `Campo '${field}' no encontrado en Vault en path ${path}`
      );
    }

    return value;
  }
}

export const vaultService = new VaultService();
