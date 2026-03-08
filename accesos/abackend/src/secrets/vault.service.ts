import Vault from 'node-vault';

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
      throw new Error('VAULT_ROLE_ID o VAULT_SECRET_ID no están definidos en las variables de entorno');
    }

    // Crear instancia temporal para autenticarse
    const tempVault = Vault({
      endpoint: this.endpoint,
    });

    console.log('🔐 Autenticando con AppRole en Vault...');
    const response = await tempVault.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

    if (!response.auth || !response.auth.client_token) {
      throw new Error('No se pudo obtener token de Vault');
    }

    // Guardar cuándo expira el token (en milisegundos)
    this.tokenExpiresAt = Date.now() + (response.auth.lease_duration * 1000);
    
    console.log('✅ Autenticación exitosa con Vault');
    return response.auth.client_token;
  }

  private async getValidToken(): Promise<string> {
    // Si el token expira en menos de 5 minutos, renovarlo
    if (Date.now() >= this.tokenExpiresAt - 300000) {
      return await this.authenticate();
    }

    // Si ya tenemos un vault con token válido, reusar el token
    if (this.vault && this.vault.token) {
      return this.vault.token;
    }

    return await this.authenticate();
  }

  async getSecretKey(path: string): Promise<string> {
    try {
      const token = await this.getValidToken();

      // Crear/actualizar instancia de Vault con token válido
      this.vault = Vault({
        endpoint: this.endpoint,
        token: token,
      });

      console.log(`📦 Leyendo clave de Vault en path: secret/data/${path}`);
      const secret = await this.vault.read(`secret/data/${path}`);

      if (!secret || !secret.data || !secret.data.data || !secret.data.data.key) {
        throw new Error(`La respuesta de Vault no contiene la clave esperada en path ${path}`);
      }

      return secret.data.data.key;
    } catch (error) {
      console.error(`❌ Error obteniendo clave en Vault en path ${path}:`, error);
      throw error;
    }
  }
}
