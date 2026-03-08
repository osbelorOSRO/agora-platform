import { Injectable } from '@nestjs/common';
import Vault from 'node-vault';

@Injectable()
export class VaultService {
  private endpoint: string;
  private vault: any;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.endpoint = process.env.VAULT_ADDR || 'http://vault:8200';
  }

  private async authenticate(): Promise<string> {
    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;

    if (!roleId || !secretId) {
      throw new Error('VAULT_ROLE_ID o VAULT_SECRET_ID no están definidos');
    }

    const tempVault = Vault({
      endpoint: this.endpoint,
    });

    console.log('🔐 Autenticando api_backend_nest con AppRole...');
    const response = await tempVault.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

    if (!response.auth || !response.auth.client_token) {
      throw new Error('No se pudo obtener token de Vault');
    }

    this.tokenExpiresAt = Date.now() + (response.auth.lease_duration * 1000);
    console.log('✅ Autenticación exitosa con Vault');
    
    return response.auth.client_token;
  }

  private async getValidToken(): Promise<string> {
    if (Date.now() >= this.tokenExpiresAt - 300000) {
      return await this.authenticate();
    }

    if (this.vault && this.vault.token) {
      return this.vault.token;
    }

    return await this.authenticate();
  }

  async getSecretField(path: string, field: string): Promise<string> {
    try {
      const token = await this.getValidToken();

      this.vault = Vault({
        endpoint: this.endpoint,
        token: token,
      });

      console.log(`📦 Leyendo clave de Vault: secret/data/${path}`);
      const secret = await this.vault.read(`secret/data/${path}`);

      if (!secret || !secret.data || !secret.data.data || !secret.data.data[field]) {
        throw new Error(`Vault no contiene el campo ${field} en path ${path}`);
      }

      return secret.data.data[field];
    } catch (error) {
      console.error(`❌ Error obteniendo secreto de Vault en ${path}.${field}:`, error);
      throw error;
    }
  }

  async getSecretKey(path: string): Promise<string> {
    return this.getSecretField(path, 'key');
  }
}
