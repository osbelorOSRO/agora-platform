import { Injectable, UnauthorizedException } from '@nestjs/common';
import { VaultService } from './vault.service';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private publicKey: string | undefined;
  private publicKeyBot: string | undefined;

  constructor(private readonly vaultService: VaultService) {}

  private async getPublicKey(): Promise<string> {
    if (!this.publicKey) {
      const path = process.env.VAULT_JWT_PUBLIC_KEY_PATH || 'accesos/keys/public';
      this.publicKey = await this.vaultService.getSecretKey(path);
    }
    return this.publicKey;
  }

  private async getPublicKeyBot(): Promise<string> {
    if (!this.publicKeyBot) {
      const path = process.env.VAULT_JWT_BOT_PUBLIC_KEY_PATH || 'accesos/keys/public_bot';
      this.publicKeyBot = await this.vaultService.getSecretKey(path);
    }
    return this.publicKeyBot;
  }

  async verificarToken(token: string, origen: 'panel' | 'bot' = 'panel'): Promise<any> {
    try {
      const key = origen === 'bot' ? await this.getPublicKeyBot() : await this.getPublicKey();
      return jwt.verify(token, key, { algorithms: ['RS256'] });
    } catch (err: any) {
      console.error('❌ Error al verificar token:', err.message);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
